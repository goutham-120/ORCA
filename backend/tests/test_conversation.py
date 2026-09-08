import unittest

from app.core.orchestrator import OrcaOrchestrator
from app.core.query_parser import QueryParser
from app.schemas.orca import OrcaQueryRequest
from app.services.data_coordinator import DataCoordinator
from app.workflows.orca_graph import OrcaWorkflow


class Source:
    def __init__(self, result): self.result = result; self.last_request = None
    async def fetch(self, request): self.last_request = request; return self.result


WEATHER = {"available": True, "source_status": "live", "provider": "Weather fixture", "source_url": "https://weather.example", "observation": {"timestamp": "2026-09-08T00:00:00+00:00", "condition": "clear sky", "wind_speed_mps": 2.1, "precipitation_mm": 0.0}}
OCEAN = {"available": True, "source_status": "live", "provider": "Marine fixture", "source_url": "https://marine.example", "observation": {"timestamp": "2026-09-08T00:00:00+00:00", "wave_height_m": 1.1, "wave_period_s": 6.0}}


def orchestrator(weather=WEATHER, ocean=OCEAN):
    coordinator = DataCoordinator()
    coordinator.register("weather", Source(weather))
    coordinator.register("ocean", Source(ocean))
    return OrcaOrchestrator(workflow=OrcaWorkflow(coordinator))


class ConversationTests(unittest.IsolatedAsyncioTestCase):
    async def test_simple_weather_and_evidence_are_grounded(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="weather", location={"latitude": 17.7, "longitude": 83.3}))
        self.assertEqual(response.agents_used, ["weather"])
        self.assertIn("wind 2.1 m/s", response.answer)
        self.assertEqual(response.evidence[0].metadata["measurements"]["wind_speed_mps"], 2.1)

    async def test_ocean_weather_and_gis_plan_runs_all_available_agents(self):
        layers = {"hazards": {"features": [], "source_status": "static", "source": "fixture"}}
        response = await orchestrator().handle(OrcaQueryRequest(query="Is it safe for fishing near Visakhapatnam tomorrow morning?", location={"latitude": 17.7, "longitude": 83.3, "label": "Visakhapatnam"}, context={"gis_layers": layers}))
        self.assertEqual(set(response.agents_used), {"ocean", "weather", "gis"})
        self.assertIn("PFZ information is unavailable", response.answer)
        self.assertIn("tomorrow morning", response.answer)

    async def test_missing_source_is_never_presented_as_safe(self):
        unavailable = {"available": False, "source_status": "unavailable", "provider": "Weather fixture", "error": "timeout", "observation": None}
        response = await orchestrator(weather=unavailable).handle(OrcaQueryRequest(query="weather safety", location={"latitude": 17.7, "longitude": 83.3}))
        self.assertIn("Weather data is unavailable", response.answer)
        self.assertNotIn("low risk", response.answer)
        self.assertEqual(response.evidence[0].metadata["data_status"], "unavailable")

    async def test_fishing_safety_is_limited_when_weather_is_unavailable(self):
        unavailable = {"available": False, "source_status": "unavailable", "provider": "Weather fixture", "error": "timeout", "observation": None}
        layers = {"hazards": {"features": [], "source_status": "static", "source": "fixture"}}
        response = await orchestrator(weather=unavailable).handle(OrcaQueryRequest(query="Is it safe for fishing?", location={"latitude": 17.7, "longitude": 83.3}, context={"gis_layers": layers}))
        self.assertEqual(response.assessment.level, "unknown")
        self.assertIsNone(response.assessment.score)
        self.assertIn("weather", response.assessment.summary)
        self.assertIn("weather", response.unavailable_domains)
        self.assertIn("pfz", response.pending_domains)
        self.assertNotIn("proceed with caution", response.recommendations[0].action.lower())

    async def test_fishing_safety_with_multiple_missing_domains_is_limited(self):
        unavailable = {"available": False, "source_status": "unavailable", "provider": "fixture", "error": "timeout", "observation": None}
        response = await orchestrator(weather=unavailable, ocean=unavailable).handle(OrcaQueryRequest(query="Is it safe for fishing?", location={"latitude": 17.7, "longitude": 83.3}))
        self.assertEqual(response.assessment.level, "unknown")
        self.assertEqual(set(response.unavailable_domains), {"ocean", "weather", "gis"})
        self.assertIn("pfz", response.pending_domains)

    async def test_malformed_follow_up_context_is_discarded_before_collection(self):
        coordinator = DataCoordinator()
        weather_source, ocean_source = Source(WEATHER), Source(OCEAN)
        coordinator.register("weather", weather_source)
        coordinator.register("ocean", ocean_source)
        response = await OrcaOrchestrator(workflow=OrcaWorkflow(coordinator)).handle(OrcaQueryRequest(query="waves", context={"conversation_context": {"location": "not-a-location", "time_range": "not-a-range"}}))
        self.assertIsNone(response.context["location"])
        self.assertIsNone(ocean_source.last_request["location"])

    async def test_fishing_without_safety_uses_available_domains_and_preserves_pfz_pending(self):
        layers = {"hazards": {"features": [], "source_status": "static", "source": "fixture"}}
        response = await orchestrator().handle(OrcaQueryRequest(query="Find fishing conditions", location={"latitude": 17.7, "longitude": 83.3}, context={"gis_layers": layers}))
        self.assertEqual(set(response.agents_used), {"ocean", "weather", "gis"})
        self.assertIn("pfz", response.pending_domains)

    async def test_follow_up_reuses_supplied_location_and_time_context(self):
        first = await orchestrator().handle(OrcaQueryRequest(query="Is it safe to fish near Visakhapatnam tomorrow?", location={"latitude": 17.7, "longitude": 83.3, "label": "Visakhapatnam"}, conversation_id="session"))
        follow_up = await orchestrator().handle(OrcaQueryRequest(query="What about the waves?", context={"conversation_context": first.context}, conversation_id="session"))
        self.assertEqual(follow_up.agents_used, ["ocean"])
        self.assertEqual(follow_up.context["location"]["label"], "Visakhapatnam")
        self.assertIn("wave height 1.1 m", follow_up.answer)

    async def test_place_name_without_coordinates_is_not_geocoded(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="What are the marine conditions near Visakhapatnam today?"))
        self.assertIn("coordinates were not supplied", response.answer)
        self.assertIn("Ocean data is unavailable", response.answer)

    async def test_hindi_mvp_uses_same_domain_pipeline(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="समुद्री मौसम कैसा है?", location={"latitude": 17.7, "longitude": 83.3}, language="hi"))
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})
        self.assertIn("जोखिम", response.answer)

    async def test_unsupported_language_falls_back_to_english(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="weather", location={"latitude": 17.7, "longitude": 83.3}, language="history"))
        self.assertEqual(response.language, "en")
        self.assertIn("not supported", response.answer)

    def test_time_and_multi_domain_parsing(self):
        parsed = QueryParser().parse("Is it safe for fishing near Visakhapatnam tomorrow morning?")
        self.assertEqual(parsed.time_expression, "tomorrow morning")
        self.assertIn("ocean", parsed.requested_domains)
        self.assertIn("weather", parsed.requested_domains)
        self.assertIn("gis", parsed.requested_domains)
