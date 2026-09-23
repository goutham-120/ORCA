"""Unit tests for the Maritime Safe Route Optimization Engine."""

import tempfile
import unittest
from pathlib import Path

from app.database.database import Database
from app.models.spatial_feature import SpatialFeatureRepository
from app.schemas.spatial import SpatialFeatureCreate
from app.services.route_analysis_service import RouteAnalysisService


class RouteOptimizationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        database = Database(None)
        database.sqlite_path = Path(self.tempdir.name) / "test-route.db"
        self.repository = SpatialFeatureRepository(database)

    def tearDown(self):
        self.tempdir.cleanup()

    async def test_clear_route_produces_direct_safe_passage(self):
        router = RouteAnalysisService(repository=self.repository)

        # Vizag Port to Offshore Point (No obstacles)
        result = await router.analyze_route(
            origin_lat=17.6868,
            origin_lon=83.2185,
            dest_lat=17.8000,
            dest_lon=83.4500,
            vessel_speed_knots=12.0,
        )

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["alternative_used"], False)
        self.assertIn(result["overall_status"], ["SAFE", "CAUTION"])
        self.assertGreater(result["route_distance_km"], 0.0)
        self.assertGreater(result["route_distance_nm"], 0.0)
        self.assertGreaterEqual(len(result["waypoints"]), 2)  # Multi-checkpoint passage navigation
        self.assertIn("marine_safety_index", result)

    async def test_obstacle_intersection_triggers_optimal_waypoint_detour(self):
        # Seed a hazard polygon right in the middle between (13.0, 80.2) and (13.2, 80.6)
        self.repository.create(
            SpatialFeatureCreate(
                id="hazard-coral-reef-1",
                dataset="hazards",
                layer="hazards",
                geometry={
                    "type": "Polygon",
                    "coordinates": [[
                        [80.35, 13.05],
                        [80.45, 13.05],
                        [80.45, 13.15],
                        [80.35, 13.15],
                        [80.35, 13.05],
                    ]],
                },
                properties={"name": "Submerged Coral Shoal Danger Area"},
                source="HYDROGRAPHIC_OFFICE",
                source_identifier="HAZ-001",
                freshness_status="live",
            )
        )

        router = RouteAnalysisService(repository=self.repository)
        result = await router.analyze_route(
            origin_lat=13.0000,
            origin_lon=80.2000,
            dest_lat=13.2000,
            dest_lon=80.6000,
        )

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["alternative_used"], True)
        self.assertGreater(len(result["waypoints"]), 2)  # Departure + Detour Waypoint(s) + Destination
        self.assertGreater(result["route_distance_km"], result["direct_distance_km"])
        self.assertIn("Detour", result["gis_analysis"]["label"])
        self.assertGreaterEqual(result["fuel_delta_liters"], 0.0)


if __name__ == "__main__":
    unittest.main()
