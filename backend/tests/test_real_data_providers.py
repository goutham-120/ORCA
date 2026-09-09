import os
import unittest
from datetime import timedelta

from app.database.database import Database
from app.models.spatial_feature import SpatialFeatureRepository
from app.providers.open_meteo import ProviderError, normalize_marine_forecast, normalize_weather_forecast
from app.providers.real_data import (CachedHttpProvider, PFZProvider, normalize_chlorophyll_geojson,
                                     normalize_ibtracs_csv, normalize_pfz_geojson)
from app.services.data_service import PFZDataService


PFZ_GEOJSON = {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[[83.0, 17.0], [84.0, 17.0], [84.0, 18.0], [83.0, 17.0], [83.0, 17.0]]]}, "properties": {"zone_id": "incois-example-id", "observed_at": "2026-09-08T00:00:00Z", "valid_to": "2026-09-09T00:00:00Z", "quality": {"provider_flag": "verified"}}}]}
CHLOROPHYLL_GEOJSON = {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [83.3, 17.7]}, "properties": {"chlorophyll_mg_m3": 1.2, "time": "2026-09-08T00:00:00Z"}}]}
WEATHER_HOURLY = {"latitude": 17.7, "longitude": 83.3, "hourly": {"time": ["2026-09-08T00:00"], "temperature_2m": [29], "precipitation": [0], "wind_speed_10m": [4], "wind_direction_10m": [160]}}
MARINE_HOURLY = {"latitude": 17.7, "longitude": 83.3, "hourly": {"time": ["2026-09-08T00:00"], "sea_surface_temperature": [28], "wave_height": [1.2], "wave_direction": [120], "wave_period": [7], "ocean_current_velocity": [0.8], "ocean_current_direction": [90]}}
IBTRACS_CSV = 'SID,SEASON,NUMBER,BASIN,SUBBASIN,NAME,ISO_TIME,NATURE,LAT,LON,WMO_WIND,WMO_PRES,USA_AGENCY,USA_WIND,USA_PRES,STORM_SPEED,STORM_DIR,TRACK_TYPE\ntext,year,text,text,text,text,iso_time,text,degree_north,degree_east,kts,mb,text,kts,mb,kts,degree,text\n2026240N10080,2026,1,NI,BB,REALSTORM,2026-09-01 00:00:00,TS,17.7,83.3,40,990,NEWDELHI,42,988,12,90,main\n'


class RealDataProviderTests(unittest.IsolatedAsyncioTestCase):
    def test_pfz_normalizes_geojson_and_preserves_provenance_fields(self):
        result = normalize_pfz_geojson(PFZ_GEOJSON, source_url="https://official.example/pfz")
        self.assertTrue(result["available"])
        self.assertEqual(result["data"][0]["geometry"]["type"], "Polygon")
        self.assertEqual(result["data"][0]["zone_identifier"], "incois-example-id")
        self.assertIn("fetched_at", result)

    def test_pfz_rejects_malformed_response(self):
        with self.assertRaises(ProviderError):
            normalize_pfz_geojson({"type": "FeatureCollection", "features": [{"properties": {}}]}, source_url="https://official.example/pfz")

    async def test_pfz_is_explicitly_unavailable_without_authorised_endpoint(self):
        previous = os.environ.pop("ORCA_PFZ_GEOJSON_URL", None)
        try:
            result = await PFZProvider().fetch({})
        finally:
            if previous is not None:
                os.environ["ORCA_PFZ_GEOJSON_URL"] = previous
        self.assertFalse(result["available"])
        self.assertEqual(result["source_status"], "unavailable")
        self.assertIn("INCOIS", result["provider"])

    def test_chlorophyll_and_cyclone_normalization(self):
        chlorophyll = normalize_chlorophyll_geojson(CHLOROPHYLL_GEOJSON, source_url="https://official.example/chl")
        cyclone = normalize_ibtracs_csv(IBTRACS_CSV, source_url="https://ncei.noaa.gov/ibtracs.csv")
        self.assertEqual(chlorophyll["data"][0]["chlorophyll_mg_m3"], 1.2)
        self.assertEqual(cyclone["data"][0]["name"], "REALSTORM")
        self.assertEqual(cyclone["data"][0]["agency"], "NEWDELHI")

    def test_forecast_and_current_normalization(self):
        weather = normalize_weather_forecast(WEATHER_HOURLY, 17.7, 83.3)
        marine = normalize_marine_forecast(MARINE_HOURLY, 17.7, 83.3)
        self.assertEqual(weather["forecast"][0]["wind_speed_mps"], 4.0)
        self.assertEqual(marine["forecast"][0]["current_speed_kmh"], 0.8)
        self.assertEqual(marine["forecast"][0]["current_direction_degrees"], 90.0)

    def test_pfz_persists_as_spatial_feature(self):
        import tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as directory:
            database = Database(None)
            database.sqlite_path = Path(directory) / "pfz.db"
            result = normalize_pfz_geojson(PFZ_GEOJSON, source_url="https://official.example/pfz")
            stored = PFZDataService(SpatialFeatureRepository(database)).persist(result)
        self.assertEqual(stored[0].dataset, "pfz")
        self.assertEqual(stored[0].geometry_type, "Polygon")
        self.assertEqual(stored[0].source_identifier, "incois-example-id")

    def test_cached_and_stale_cache_statuses(self):
        provider = CachedHttpProvider()
        provider.provider, provider.source_url = "Test", "https://example.test/data"
        provider._cache["key"] = {"available": True, "source_status": "live", "fetched_at": "2026-09-09T00:00:00+00:00", "data": []}
        # Move cache time relative to the provider clock without mocking production data.
        import app.providers.real_data as module
        original = module._now
        try:
            module._now = lambda: original().replace(year=2026, month=9, day=9)
            provider._cache["key"]["fetched_at"] = module._now().isoformat()
            self.assertEqual(provider._cached_or_unavailable("key", ProviderError("timeout"))["source_status"], "cached")
            provider._cache["key"]["fetched_at"] = (module._now() - timedelta(days=1)).isoformat()
            self.assertEqual(provider._cached_or_unavailable("key", ProviderError("timeout"))["source_status"], "stale")
        finally:
            module._now = original

    async def test_http_provider_retries_before_unavailable(self):
        provider = CachedHttpProvider()
        provider.provider, provider.source_url = "Test", "https://example.test/data"
        calls = 0

        def fail(request):
            nonlocal calls
            calls += 1
            raise TimeoutError("timeout")

        provider._read_sync = fail
        with self.assertRaises(ProviderError):
            await provider._read(provider.source_url)
        self.assertEqual(calls, 2)
