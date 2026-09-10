import unittest

from app.core.orchestrator import OrcaOrchestrator
from app.schemas.orca import OrcaQueryRequest
from app.services.data_coordinator import DataCoordinator
from app.workflows.orca_graph import OrcaWorkflow


class Source:
    def __init__(self, result):
        self.result = result
        self.last_request = None

    async def fetch(self, request):
        self.last_request = request
        return self.result


class NoNetworkLLM:
    api_key = None

    async def plan(self, query, fallback, persona):
        return None

    async def chat(self, query, language):
        return None


class DecisionSpy:
    def __init__(self):
        self.calls = []

    async def fishing(self, location, at=None):
        self.calls.append(("fishing", location, at))
        return {"status": "partial", "risk_level": "moderate", "assessment": "partial", "unavailable_data": ["authorized PFZ source"], "evidence": []}


class Resolver:
    def __init__(self):
        self.places = []

    async def resolve(self, place):
        self.places.append(place)
        return {"latitude": 17.7, "longitude": 83.3, "label": place}


WEATHER = {"available": True, "source_status": "live", "provider": "weather", "observation": {"condition": "clear sky", "wind_speed_mps": 4, "precipitation_mm": 0}}
OCEAN = {"available": True, "source_status": "live", "provider": "ocean", "observation": {"wave_height_m": 1, "wave_period_s": 6}}


def make_orchestrator(decision=None):
    coordinator = DataCoordinator()
    weather = Source(WEATHER)
    ocean = Source(OCEAN)
    coordinator.register("weather", weather)
    coordinator.register("ocean", ocean)
    workflow = OrcaWorkflow(coordinator, NoNetworkLLM(), decision or DecisionSpy())
    return OrcaOrchestrator(workflow=workflow, location_resolver=None), weather, ocean


class AgentSelectionTests(unittest.IsolatedAsyncioTestCase):
    async def test_weather_only_and_future_context(self):
        orchestrator, weather, _ = make_orchestrator()
        response = await orchestrator.handle(OrcaQueryRequest(query="What will the weather be like in Hyderabad tomorrow?", location={"latitude": 17.4, "longitude": 78.5}))
        self.assertEqual(response.selected_agents, ["weather"])
        self.assertEqual(weather.last_request["metadata"]["time_expression"], "tomorrow")

    async def test_ocean_only(self):
        orchestrator, _, _ = make_orchestrator()
        response = await orchestrator.handle(OrcaQueryRequest(query="What are the wave conditions near Visakhapatnam?", location={"latitude": 17.7, "longitude": 83.3}))
        self.assertEqual(response.selected_agents, ["ocean"])

    async def test_weather_and_ocean_only(self):
        orchestrator, _, _ = make_orchestrator()
        response = await orchestrator.handle(OrcaQueryRequest(query="What will the weather and wave conditions be near Visakhapatnam tomorrow?", location={"latitude": 17.7, "longitude": 83.3}))
        self.assertEqual(set(response.selected_agents), {"weather", "ocean"})


    async def test_fishing_safety_invokes_decision_without_gis(self):
        decision = DecisionSpy()
        orchestrator, _, _ = make_orchestrator(decision)
        response = await orchestrator.handle(OrcaQueryRequest(query="Is it safe to fish near Visakhapatnam tomorrow?", location={"latitude": 17.7, "longitude": 83.3}))
        self.assertEqual(set(response.selected_agents), {"weather", "ocean"})
        self.assertEqual(len(decision.calls), 1)
        self.assertEqual(response.decision["risk_level"], "moderate")

    async def test_gis_only(self):
        orchestrator, _, _ = make_orchestrator()
        response = await orchestrator.handle(OrcaQueryRequest(query="Show me areas within 20 km of this location.", location={"latitude": 17.7, "longitude": 83.3}, context={"gis_layers": {"hazards": {"features": [], "source_status": "static", "source": "fixture"}}}))
        self.assertEqual(response.selected_agents, ["gis"])

    async def test_general_question_uses_no_marine_agents(self):
        orchestrator, _, _ = make_orchestrator()
        response = await orchestrator.handle(OrcaQueryRequest(query="What is the capital of India?"))
        self.assertEqual(response.response_kind, "general")
        self.assertEqual(response.selected_agents, [])

    async def test_place_name_resolution_and_explicit_coordinate_priority(self):
        resolver = Resolver()
        coordinator = DataCoordinator()
        coordinator.register("weather", Source(WEATHER))
        coordinator.register("ocean", Source(OCEAN))
        workflow = OrcaWorkflow(coordinator, NoNetworkLLM(), DecisionSpy())
        orchestrator = OrcaOrchestrator(workflow=workflow, location_resolver=resolver)
        resolved = await orchestrator.handle(OrcaQueryRequest(query="What are the wave conditions near Vishakhapatnam?"))
        self.assertEqual(resolver.places, ["Vishakhapatnam"])
        self.assertEqual(resolved.context["location"]["label"], "Vishakhapatnam")
        explicit = await orchestrator.handle(OrcaQueryRequest(query="What are the wave conditions near Hyderabad?", location={"latitude": 17.4, "longitude": 78.5, "label": "Map location"}))
        self.assertEqual(explicit.context["location"]["label"], "Map location")
        self.assertEqual(resolver.places, ["Vishakhapatnam"])
