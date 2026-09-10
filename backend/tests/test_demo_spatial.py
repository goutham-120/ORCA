import asyncio
import tempfile
import unittest
from pathlib import Path

from app.database.database import Database
from app.models.spatial_feature import SpatialFeatureRepository
from app.providers.demo_spatial import DEMO_SOURCE, PFZ_DEMO_SOURCE, ensure_demo_gis
from app.providers.incois_pfz import IncoisPFZProvider
from app.services.spatial_query_service import SpatialQueryService


class FailedINCOIS(IncoisPFZProvider):
    async def fetch(self):
        return {"status": "error", "source": "INCOIS", "features": [], "error": "offline"}


class DemoSpatialTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        database = Database(None)
        database.sqlite_path = Path(self.tempdir.name) / "demo-spatial.db"
        self.repository = SpatialFeatureRepository(database)

    def tearDown(self):
        self.tempdir.cleanup()

    def test_demo_gis_is_persisted_and_spatially_queryable(self):
        self.assertEqual(ensure_demo_gis(self.repository), 3)
        self.assertEqual(ensure_demo_gis(self.repository), 0)
        records = self.repository.list(source=DEMO_SOURCE)
        self.assertEqual(len(records), 3)
        self.assertTrue(all(record.freshness_status == "demo" for record in records))
        nearby = SpatialQueryService(self.repository).nearby(17.6868, 83.2185, 20)
        self.assertGreaterEqual(len(nearby), 3)

    def test_incois_failure_persists_explicit_demo_pfz(self):
        result = asyncio.run(FailedINCOIS().sync(self.repository))
        self.assertEqual(result["status"], "demo")
        self.assertEqual(result["source_type"], "demo")
        records = self.repository.list(source=PFZ_DEMO_SOURCE)
        self.assertEqual(len(records), 2)
        nearby = SpatialQueryService(self.repository).nearby(17.6868, 83.2185, 20, dataset="PFZ")
        self.assertEqual(len(nearby), 2)


if __name__ == "__main__":
    unittest.main()
