"""Synthetic fixtures only: unit tests never contact live providers."""
from datetime import datetime, timezone
import unittest
from app.services.decision_service import DecisionService

LOC = {"latitude": 13.08, "longitude": 80.27}
NOW = "2026-01-01T00:00:00+00:00"

class Tool:
    def __init__(self, result): self.result = result
    async def fetch(self, request): return self.result

def provider(obs, name="Test provider"):
    return {"available": True, "source_status":"live", "provider":name, "source_url":"https://fixture.invalid", "observation":obs}

class Feature:
    def __init__(self, ident=1, dataset="pfz", layer="pfz", geometry=None, valid_from=None, valid_to=None):
        self.id, self.dataset, self.layer = ident, dataset, layer
        self.geometry = geometry or {"type":"Point","coordinates":[80.28,13.09]}
        self.source, self.source_url, self.observed_at, self.freshness_status = "Synthetic test fixture", None, datetime(2026,1,1,tzinfo=timezone.utc), "live"
        self.valid_from, self.valid_to = valid_from, valid_to
        self.properties, self.source_identifier = {"name":"fixture"}, "fixture"

class Spatial:
    def __init__(self, records=()): self.records=list(records)
    def filter(self): return self.records
    def nearby(self, lat, lon, radius): return [{"feature":r,"distance_km":2.0} for r in self.records if r.dataset == "pfz"]

class DecisionServiceTests(unittest.IsolatedAsyncioTestCase):
    def service(self, weather, ocean, records=()): return DecisionService(Tool(weather), Tool(ocean), Spatial(records))
    async def test_low_risk_available(self):
        service=self.service(provider({"wind_speed_mps":4,"precipitation_mm":0,"timestamp":NOW}),provider({"wave_height_m":.5,"timestamp":NOW}))
        result=await service.safety(LOC)
        self.assertEqual((result["status"],result["risk_level"]),("available","low"))
    async def test_high_risk_multiple_factors(self):
        service=self.service(provider({"wind_speed_mps":15,"precipitation_mm":21,"timestamp":NOW}),provider({"wave_height_m":3,"timestamp":NOW}))
        self.assertEqual((await service.safety(LOC))["risk_level"],"high")
    async def test_missing_wave_is_partial_not_safe(self):
        service=self.service(provider({"wind_speed_mps":4,"precipitation_mm":0,"timestamp":NOW}),provider({"timestamp":NOW}))
        result=await service.safety(LOC); self.assertEqual(result["status"],"partial"); self.assertIn("wave height",result["unavailable_data"])
    async def test_missing_weather_is_partial(self):
        service=self.service({"available":False,"observation":None},provider({"wave_height_m":1,"timestamp":NOW}))
        self.assertEqual((await service.safety(LOC))["status"],"partial")
    async def test_pfz_unavailable_never_creates_features(self):
        result=await self.service(provider({}),provider({})).nearby_pfz(LOC,50)
        self.assertEqual((result["status"],result["features"]),("unavailable",[]))
    async def test_nearby_pfz_uses_spatial_results(self):
        result=await self.service(provider({}),provider({}),[Feature()]).nearby_pfz(LOC,50)
        self.assertEqual(result["features"][0]["distance_km"],2.0)
    async def test_expired_pfz_is_not_returned(self):
        expired = Feature(valid_to=datetime(2025, 12, 31, tzinfo=timezone.utc))
        result=await self.service(provider({}),provider({}),[expired]).nearby_pfz(LOC,50,datetime(2026,1,1,tzinfo=timezone.utc))
        self.assertEqual((result["status"], result["features"]), ("unavailable", []))
    async def test_valid_pfz_combines_with_safe_conditions(self):
        weather = provider({"wind_speed_mps":4,"precipitation_mm":0,"timestamp":NOW})
        ocean = provider({"wave_height_m":.5,"timestamp":NOW})
        result=await self.service(weather,ocean,[Feature()]).fishing(LOC)
        self.assertEqual((result["status"], result["suitability"]), ("available", "favorable"))
    async def test_fishing_partial_without_pfz(self):
        service=self.service(provider({"wind_speed_mps":4,"precipitation_mm":0,"timestamp":NOW}),provider({"wave_height_m":.5,"timestamp":NOW}))
        self.assertEqual((await service.fishing(LOC))["status"],"partial")
    async def test_cyclone_source_unavailable(self):
        result=await self.service(provider({}),provider({})).hazard(LOC)
        self.assertEqual(result["hazard_status"],"source_unavailable")
    async def test_cyclone_proximity(self):
        result=await self.service(provider({}),provider({}),[Feature(2,"ibtracs","cyclone")]).hazard(LOC)
        self.assertEqual(result["hazard_status"],"relevant_hazard_found"); self.assertLess(result["cyclones"][0]["distance_km"],10)
    async def test_no_relevant_cyclone_when_loaded_far_away(self):
        feature=Feature(2,"ibtracs","cyclone",{"type":"Point","coordinates":[10,0]})
        self.assertEqual((await self.service(provider({}),provider({}),[feature]).hazard(LOC))["hazard_status"],"no_relevant_hazard_found")
    async def test_high_wave_condition(self):
        result=await self.service(provider({}),provider({"wave_height_m":3,"timestamp":NOW})).anomaly(LOC)
        self.assertEqual(result["anomaly_status"],"notable_condition")
    async def test_reference_missing_is_explicit(self):
        result=await self.service(provider({}),provider({"wave_height_m":1,"timestamp":NOW})).anomaly(LOC)
        self.assertEqual(result["anomaly_status"],"insufficient_reference_data")
    async def test_route_reports_capability_limit(self):
        result=await self.service(provider({}),provider({})).route(LOC,{"latitude":13.5,"longitude":80.5})
        self.assertFalse(result["safer_alternatives_supported"]); self.assertEqual(result["status"],"partial")
    async def test_route_hazard_intersection(self):
        feature=Feature(3,"hazards","hazard",{"type":"Point","coordinates":[80.39,13.2991304348]})
        result=await self.service(provider({}),provider({}),[feature]).route(LOC,{"latitude":13.5,"longitude":80.5})
        self.assertEqual(result["risk_level"],"high")
