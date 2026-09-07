import unittest

from app.agents.ocean_agent import OceanAgent
from app.agents.weather_agent import WeatherAgent
from app.providers.open_meteo import OpenMeteoProvider, ProviderError, normalize_marine, normalize_weather
from app.services.data_coordinator import DataCoordinator
from app.workflows.orca_graph import OrcaWorkflow
from app.core.context import QueryContext
from app.core.query_parser import QueryParser


WEATHER_PAYLOAD = {"latitude": 17.7, "longitude": 83.3, "current": {"time": "2026-09-07T12:00", "temperature_2m": 29, "relative_humidity_2m": 70, "precipitation": 0, "pressure_msl": 1008, "wind_speed_10m": 15, "wind_direction_10m": 160, "weather_code": 95}}
MARINE_PAYLOAD = {"latitude": 17.7, "longitude": 83.3, "current": {"time": "2026-09-07T12:00", "sea_surface_temperature": 28, "wave_height": 2.7, "wave_direction": 130, "wave_period": 9}}


class OceanWeatherTests(unittest.IsolatedAsyncioTestCase):
    def test_normalizers_keep_missing_fields_unavailable(self):
        weather = normalize_weather(WEATHER_PAYLOAD, 17.7, 83.3)
        marine = normalize_marine(MARINE_PAYLOAD, 17.7, 83.3)
        self.assertEqual(weather["observation"]["wind_speed_mps"], 15.0)
        self.assertIsNone(marine["observation"]["current"])
        self.assertTrue(weather["observation"]["timestamp"].endswith("+00:00"))

    def test_malformed_payload_is_rejected(self):
        with self.assertRaises(ProviderError):
            normalize_weather({"current": {"time": "not-a-time"}}, 17.7, 83.3)

    async def test_provider_uses_recent_cache_after_failure(self):
        provider = OpenMeteoProvider("https://example.invalid", "x", normalize_weather)

        async def success(latitude, longitude):
            return WEATHER_PAYLOAD

        provider._request = success
        first = await provider.fetch({"location": {"latitude": 17.7, "longitude": 83.3}})

        async def failure(latitude, longitude):
            raise ProviderError("timeout")

        provider._request = failure
        cached = await provider.fetch({"location": {"latitude": 17.7, "longitude": 83.3}})
        self.assertEqual(first["source_status"], "live")
        self.assertEqual(cached["source_status"], "cached")

    def test_agents_surface_supported_concerns(self):
        weather = WeatherAgent().interpret(normalize_weather(WEATHER_PAYLOAD, 17.7, 83.3))
        ocean = OceanAgent().interpret(normalize_marine(MARINE_PAYLOAD, 17.7, 83.3))
        self.assertGreaterEqual(weather["risk_score"], 0.8)
        self.assertGreaterEqual(ocean["risk_score"], 0.7)

    async def test_workflow_runs_selected_agents_and_tolerates_missing_location(self):
        context = QueryContext(QueryParser().parse("marine weather conditions"))
        result = await OrcaWorkflow().run(context)
        self.assertEqual(result["agents_used"], ["ocean", "weather"])
        self.assertEqual(set(result["analysis_results"]), {"ocean", "weather"})
        self.assertIn("Unavailable", result["answer"])

    async def test_workflow_preserves_unimplemented_requested_domains(self):
        context = QueryContext(QueryParser().parse("safe route"))
        result = await OrcaWorkflow().run(context)
        self.assertEqual(result["agents_used"], [])
        self.assertEqual(result["pending_domains"], ["gis", "safety"])
        self.assertEqual(context.metadata["pending_domains"], ["gis", "safety"])

    def test_workflow_does_not_replace_injected_tools(self):
        coordinator = DataCoordinator()
        custom_weather = object()
        custom_ocean = object()
        coordinator.register("weather", custom_weather)
        coordinator.register("ocean", custom_ocean)
        OrcaWorkflow(coordinator)
        self.assertIs(coordinator._sources["weather"], custom_weather)
        self.assertIs(coordinator._sources["ocean"], custom_ocean)
