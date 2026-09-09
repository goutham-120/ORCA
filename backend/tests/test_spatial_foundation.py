import importlib.util
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.database.database import Database
from app.models.spatial_feature import SpatialFeatureRepository
from app.schemas.spatial import SpatialFeatureCreate


class SpatialFoundationTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.database = Database(None)
        self.database.sqlite_path = Path(self.tempdir.name) / "spatial-test.db"
        self.repository = SpatialFeatureRepository(self.database)

    def tearDown(self):
        self.tempdir.cleanup()

    def feature(self, **overrides):
        values = {
            "dataset": "test-layer",
            "layer": "test",
            "geometry": {"type": "Point", "coordinates": [83.3, 17.7]},
            "source": "test fixture",
            "source_identifier": "fixture-1",
            "freshness_status": "cached",
            "confidence": 0.8,
            "quality": {"method": "test"},
        }
        values.update(overrides)
        return SpatialFeatureCreate(**values)

    def test_schema_and_provenance_persist_without_domain_records(self):
        created = self.repository.create(self.feature())
        self.assertEqual(created.dataset, "test-layer")
        self.assertEqual(created.geometry_type, "Point")
        self.assertEqual(created.freshness_status, "cached")
        self.assertEqual(created.quality["method"], "test")
        self.assertEqual(len(self.repository.list(source="test fixture", status="cached")), 1)

    def test_temporal_filter_and_empty_dataset_behavior(self):
        now = datetime.now(timezone.utc)
        self.repository.create(self.feature(valid_from=now - timedelta(hours=1), valid_to=now + timedelta(hours=1)))
        self.assertEqual(len(self.repository.list(valid_at=now)), 1)
        self.assertEqual(self.repository.list(dataset="missing"), [])

    def test_postgis_test_is_explicitly_skipped_without_configured_server(self):
        url = os.getenv("ORCA_TEST_POSTGIS_URL")
        if not url:
            self.skipTest("Set ORCA_TEST_POSTGIS_URL to run PostGIS integration tests.")
        database = Database(url)
        database.initialize()
        version = database.fetchone("SELECT PostGIS_Version()", ())
        indexes = database.fetchall("SELECT indexname FROM pg_indexes WHERE tablename = ?", ("spatial_features",))
        self.assertTrue(version)
        self.assertIn("ix_spatial_features_geometry", {row[0] for row in indexes})

    @unittest.skipUnless(importlib.util.find_spec("shapely"), "Shapely is not installed")
    def test_shapely_conversion_and_spatial_queries(self):
        from app.gis.geometry import geojson_to_shapely, shapely_to_geojson
        from app.services.spatial_query_service import SpatialQueryService

        polygon = {"type": "Polygon", "coordinates": [[[83.0, 17.0], [84.0, 17.0], [84.0, 18.0], [83.0, 18.0], [83.0, 17.0]]]}
        self.repository.create(self.feature(geometry=polygon))
        self.assertEqual(shapely_to_geojson(geojson_to_shapely(polygon))["type"], "Polygon")
        service = SpatialQueryService(self.repository)
        self.assertEqual(len(service.contains_point(17.7, 83.3)), 1)
        self.assertEqual(len(service.bounding_box(83.1, 17.1, 83.4, 17.8)), 1)
        self.assertEqual(len(service.nearby(17.7, 83.3, 5)), 1)

    @unittest.skipUnless(importlib.util.find_spec("geopandas") and importlib.util.find_spec("shapely"), "GeoPandas/Shapely are not installed")
    def test_geopandas_round_trip_preserves_epsg_4326(self):
        from app.gis.geometry import geodataframe_to_geojson_features, geojson_features_to_geodataframe

        frame = geojson_features_to_geodataframe([{"type": "Feature", "properties": {"name": "test"}, "geometry": {"type": "Point", "coordinates": [83.3, 17.7]}}])
        self.assertEqual(frame.crs.to_string(), "EPSG:4326")
        self.assertEqual(geodataframe_to_geojson_features(frame)[0]["geometry"]["type"], "Point")
