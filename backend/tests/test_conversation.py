import unittest

from app.core.orchestrator import OrcaOrchestrator
from app.core.query_parser import QueryParser
from app.schemas.orca import OrcaQueryRequest
from app.services.data_coordinator import DataCoordinator
from app.workflows.orca_graph import OrcaWorkflow


class Source:
    def __init__(self, result): self.result = result; self.last_request = None
    async def fetch(self, request): self.last_request = request; return self.result


class NoNetworkLLM:
    api_key = None
    async def plan(self, query, fallback, persona): return None
    async def chat(self, query, language): return None


WEATHER = {"available": True, "source_status": "live", "provider": "Weather fixture", "source_url": "https://weather.example", "observation": {"timestamp": "2026-09-08T00:00:00+00:00", "condition": "clear sky", "wind_speed_mps": 2.1, "precipitation_mm": 0.0}}
OCEAN = {"available": True, "source_status": "live", "provider": "Marine fixture", "source_url": "https://marine.example", "observation": {"timestamp": "2026-09-08T00:00:00+00:00", "wave_height_m": 1.1, "wave_period_s": 6.0}}


def orchestrator(weather=WEATHER, ocean=OCEAN):
    coordinator = DataCoordinator()
    coordinator.register("weather", Source(weather))
    coordinator.register("ocean", Source(ocean))
    return OrcaOrchestrator(workflow=OrcaWorkflow(coordinator, NoNetworkLLM()), location_resolver=None)


class ConversationTests(unittest.IsolatedAsyncioTestCase):
    async def test_simple_weather_and_evidence_are_grounded(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="weather", location={"latitude": 17.7, "longitude": 83.3}))
        self.assertEqual(response.agents_used, ["weather"])
        self.assertIn("2.1", response.answer)
        self.assertEqual(response.evidence[0].metadata["measurements"]["wind_speed_mps"], 2.1)

    async def test_ocean_weather_and_gis_plan_runs_all_available_agents(self):
        layers = {"hazards": {"features": [], "source_status": "static", "source": "fixture"}}
        response = await orchestrator().handle(OrcaQueryRequest(query="Is it safe for fishing near Visakhapatnam tomorrow morning?", location={"latitude": 17.7, "longitude": 83.3, "label": "Visakhapatnam"}, context={"gis_layers": layers}))
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})
        self.assertEqual(response.response_kind, "specialized")
        self.assertIn("tomorrow morning", response.answer)

    async def test_missing_source_is_never_presented_as_safe(self):
        unavailable = {"available": False, "source_status": "unavailable", "provider": "Weather fixture", "error": "timeout", "observation": None}
        response = await orchestrator(weather=unavailable).handle(OrcaQueryRequest(query="weather safety", location={"latitude": 17.7, "longitude": 83.3}))
        self.assertIn("unavailable", response.answer.lower())
        self.assertNotIn("low risk", response.answer)
        self.assertTrue(any(item.metadata["data_status"] == "unavailable" for item in response.evidence))

    async def test_fishing_safety_is_limited_when_weather_is_unavailable(self):
        from unittest.mock import patch
        from app.models.spatial_feature import spatial_features
        unavailable = {"available": False, "source_status": "unavailable", "provider": "Weather fixture", "error": "timeout", "observation": None}
        layers = {"hazards": {"features": [], "source_status": "static", "source": "fixture"}}
        with patch.object(spatial_features, "list", return_value=[]):
            response = await orchestrator(weather=unavailable).handle(OrcaQueryRequest(query="Is it safe for fishing?", location={"latitude": 17.7, "longitude": 83.3}, context={"gis_layers": layers}))
            self.assertEqual(response.assessment.level, "unknown")
            self.assertIsNone(response.assessment.score)
            self.assertIn("weather", response.assessment.summary)
            self.assertIn("weather", response.unavailable_domains)
            self.assertIn("authorized PFZ source", response.decision["unavailable_data"])
            self.assertNotIn("proceed with caution", response.recommendations[0].action.lower())


    async def test_fishing_safety_with_multiple_missing_domains_is_limited(self):
        unavailable = {"available": False, "source_status": "unavailable", "provider": "fixture", "error": "timeout", "observation": None}
        response = await orchestrator(weather=unavailable, ocean=unavailable).handle(OrcaQueryRequest(query="Is it safe for fishing?", location={"latitude": 17.7, "longitude": 83.3}))
        self.assertEqual(response.assessment.level, "unknown")
        self.assertEqual(set(response.unavailable_domains), {"ocean", "weather"})

    async def test_malformed_follow_up_context_is_discarded_before_collection(self):
        coordinator = DataCoordinator()
        weather_source, ocean_source = Source(WEATHER), Source(OCEAN)
        coordinator.register("weather", weather_source)
        coordinator.register("ocean", ocean_source)
        response = await OrcaOrchestrator(workflow=OrcaWorkflow(coordinator, NoNetworkLLM()), location_resolver=None).handle(OrcaQueryRequest(query="waves", context={"conversation_context": {"location": "not-a-location", "time_range": "not-a-range"}}))
        self.assertIsNone(response.context["location"])
        self.assertIsNone(ocean_source.last_request["location"])

    async def test_fishing_without_safety_uses_available_domains_and_preserves_pfz_pending(self):
        layers = {"hazards": {"features": [], "source_status": "static", "source": "fixture"}}
        response = await orchestrator().handle(OrcaQueryRequest(query="Find fishing conditions", location={"latitude": 17.7, "longitude": 83.3}, context={"gis_layers": layers}))
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})

    async def test_follow_up_reuses_supplied_location_and_time_context(self):
        first = await orchestrator().handle(OrcaQueryRequest(query="Is it safe to fish near Visakhapatnam tomorrow?", location={"latitude": 17.7, "longitude": 83.3, "label": "Visakhapatnam"}, conversation_id="session"))
        follow_up = await orchestrator().handle(OrcaQueryRequest(query="What about the waves?", context={"conversation_context": first.context}, conversation_id="session"))
        self.assertEqual(follow_up.agents_used, ["ocean"])
        self.assertEqual(follow_up.context["location"]["label"], "Visakhapatnam")
        self.assertIn("1.1 m", follow_up.answer)

    async def test_place_name_without_coordinates_is_not_geocoded(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="What are the marine conditions near Visakhapatnam today?"))
        self.assertIn("coordinates were not supplied", response.answer)

    async def test_hindi_mvp_uses_same_domain_pipeline(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="समुद्री मौसम कैसा है?", location={"latitude": 17.7, "longitude": 83.3}, language="hi"))
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})
        self.assertTrue(response.answer)

    async def test_telugu_support_uses_same_domain_pipeline(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="ఈ రోజు సముద్ర వాతావరణం ఎలా ఉంది?", location={"latitude": 17.7, "longitude": 83.3}, language="te"))
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})
        self.assertEqual(response.language, "te")
        self.assertIn("వాతావరణ", response.answer)
        self.assertIn("ORCA", response.answer)

    async def test_tamil_support_uses_same_domain_pipeline(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="இன்று கடல் வானிலை எப்படி உள்ளது?", location={"latitude": 17.7, "longitude": 83.3}, language="ta"))
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})
        self.assertEqual(response.language, "ta")
        self.assertIn("வானிலை", response.answer)
        self.assertIn("ORCA", response.answer)

    async def test_odia_support_uses_same_domain_pipeline(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="ଆଜି ସମୁଦ୍ର ପାଣିପାଗ କିପରି ଅଛି?", location={"latitude": 17.7, "longitude": 83.3}, language="or"))
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})
        self.assertEqual(response.language, "or")
        self.assertIn("ପାଣିପାଗ", response.answer)
        self.assertIn("ORCA", response.answer)

    async def test_bengali_support_uses_same_domain_pipeline(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="আজ সমুদ্রের আবহাওয়া কেমন?", location={"latitude": 17.7, "longitude": 83.3}, language="bn"))
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})
        self.assertEqual(response.language, "bn")
        self.assertIn("আবহাওয়া", response.answer)
        self.assertIn("ORCA", response.answer)

    async def test_konkani_support_uses_same_domain_pipeline(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="आयज दर्या हवामान कशे आसा?", location={"latitude": 17.7, "longitude": 83.3}, language="kok"))
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})
        self.assertEqual(response.language, "kok")
        self.assertIn("हवामान", response.answer)
        self.assertIn("ORCA", response.answer)

    async def test_tulu_support_uses_same_domain_pipeline(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="ಇನಿ ಕಡಲ ವಾತಾವರಣ ಎಂಚ ಉಂಡು?", location={"latitude": 17.7, "longitude": 83.3}, language="tcy"))
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})
        self.assertEqual(response.language, "tcy")
        self.assertIn("ವಾತಾವರಣ", response.answer)
        self.assertIn("ORCA", response.answer)

    async def test_gujarati_support_uses_same_domain_pipeline(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="આજે દરિયાનું હવામાન કેવું છે?", location={"latitude": 17.7, "longitude": 83.3}, language="gu"))
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})
        self.assertEqual(response.language, "gu")
        self.assertIn("હવામાન", response.answer)
        self.assertIn("ORCA", response.answer)

    async def test_authoritative_selected_language_gujarati_with_english_query(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="How is the sea weather today?", location={"latitude": 17.7, "longitude": 83.3}, language="gu"))
        self.assertEqual(response.language, "gu")
        self.assertIn("ORCA", response.answer)

    async def test_gujarati_script_auto_detection(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="આજે દરિયાનું હવામાન કેવું છે?", location={"latitude": 17.7, "longitude": 83.3}))
        self.assertEqual(response.language, "gu")
        self.assertIn("હવામાન", response.answer)

    async def test_authoritative_selected_language_tulu_with_english_query(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="How is the sea weather today?", location={"latitude": 17.7, "longitude": 83.3}, language="tcy"))
        self.assertEqual(response.language, "tcy")
        self.assertIn("ORCA", response.answer)

    async def test_authoritative_selected_language_konkani_with_english_query(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="How is the sea weather today?", location={"latitude": 17.7, "longitude": 83.3}, language="kok"))
        self.assertEqual(response.language, "kok")
        self.assertIn("ORCA", response.answer)

    async def test_authoritative_selected_language_bengali_with_english_query(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="How is the sea weather today?", location={"latitude": 17.7, "longitude": 83.3}, language="bn"))
        self.assertEqual(response.language, "bn")
        self.assertIn("ORCA", response.answer)

    async def test_authoritative_selected_language_odia_with_english_query(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="How is the sea weather today?", location={"latitude": 17.7, "longitude": 83.3}, language="or"))
        self.assertEqual(response.language, "or")
        self.assertIn("ORCA", response.answer)

    async def test_authoritative_selected_language_telugu_with_english_query(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="How is the sea weather today?", location={"latitude": 17.7, "longitude": 83.3}, language="te"))
        self.assertEqual(response.language, "te")
        self.assertIn("ORCA", response.answer)

    async def test_authoritative_selected_language_tamil_with_english_query(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="How is the sea weather today?", location={"latitude": 17.7, "longitude": 83.3}, language="ta"))
        self.assertEqual(response.language, "ta")
        self.assertIn("ORCA", response.answer)

    async def test_authoritative_selected_language_hindi_with_english_query(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="How is the sea weather today?", location={"latitude": 17.7, "longitude": 83.3}, language="hi"))
        self.assertEqual(response.language, "hi")
        self.assertIn("ORCA का", response.answer)

    async def test_marathi_support_uses_same_domain_pipeline(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="समुद्राची हवामान स्थिती कशी आहे?", location={"latitude": 17.7, "longitude": 83.3}, language="mr"))
        self.assertEqual(response.language, "mr")
        self.assertEqual(set(response.agents_used), {"ocean", "weather"})
        self.assertIn("ORCA", response.answer)

    async def test_authoritative_selected_language_marathi_with_english_query(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="How is the sea weather today?", location={"latitude": 17.7, "longitude": 83.3}, language="mr"))
        self.assertEqual(response.language, "mr")
        self.assertIn("ORCA", response.answer)

    async def test_authoritative_selected_language_english_with_indic_query(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="weather", location={"latitude": 17.7, "longitude": 83.3}, language="en"))
        self.assertEqual(response.language, "en")
        self.assertIn("ORCA's combined assessment", response.answer)

    async def test_english_input_returns_english(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="How is the sea weather today?", location={"latitude": 17.7, "longitude": 83.3}))
        self.assertEqual(response.language, "en")
        self.assertIn("ORCA's combined assessment", response.answer)

    async def test_unsupported_language_falls_back_to_english(self):
        response = await orchestrator().handle(OrcaQueryRequest(query="weather", location={"latitude": 17.7, "longitude": 83.3}, language="history"))
        self.assertEqual(response.language, "en")
        self.assertTrue(response.answer)

    def test_time_and_multi_domain_parsing(self):
        parsed = QueryParser().parse("Is it safe for fishing near Visakhapatnam tomorrow morning?")
        self.assertEqual(parsed.time_expression, "tomorrow morning")
        self.assertIn("ocean", parsed.requested_domains)
        self.assertIn("weather", parsed.requested_domains)
        self.assertNotIn("gis", parsed.requested_domains)
