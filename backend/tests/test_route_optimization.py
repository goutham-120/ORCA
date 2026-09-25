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

    async def test_safe_original_route_returns_original_route(self):
        """1. Safe original route -> original route returned."""
        router = RouteAnalysisService(repository=self.repository)
        result = await router.analyze_route(
            origin_lat=17.6868,
            origin_lon=83.2185,
            dest_lat=17.8000,
            dest_lon=83.4500,
            vessel_speed_knots=12.0,
        )

        self.assertEqual(result["status"], "completed")
        self.assertFalse(result["alternative_used"])
        self.assertEqual(result["gis_analysis"]["status"], "suitable")
        self.assertGreater(result["route_distance_km"], 0.0)
        # Coordinates must start at origin and end at destination
        coords = result["route_geometry"]["coordinates"]
        self.assertAlmostEqual(coords[0][0], 83.2185, places=3)
        self.assertAlmostEqual(coords[0][1], 17.6868, places=3)
        self.assertAlmostEqual(coords[-1][0], 83.4500, places=3)
        self.assertAlmostEqual(coords[-1][1], 17.8000, places=3)

    async def test_obstacle_intersects_original_route_returns_alternate_route(self):
        """2. Obstacle intersects original route -> alternate route returned."""
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
        self.assertTrue(result["alternative_used"])
        self.assertGreater(len(result["waypoints"]), 2)
        self.assertGreater(result["route_distance_km"], result["direct_distance_km"])
        self.assertIn("Detour", result["gis_analysis"]["label"])

    async def test_alternate_route_reaches_same_pfz_destination(self):
        """3. Alternate route still reaches the SAME PFZ destination."""
        dest_lat = 13.2000
        dest_lon = 80.6000
        pfz_id = "test-target-pfz-99"

        # Seed an obstacle on direct line
        self.repository.create(
            SpatialFeatureCreate(
                id="hazard-military-zone",
                dataset="restricted_zones",
                layer="restricted_zones",
                geometry={
                    "type": "Polygon",
                    "coordinates": [[
                        [80.38, 13.08],
                        [80.42, 13.08],
                        [80.42, 13.12],
                        [80.38, 13.12],
                        [80.38, 13.08],
                    ]],
                },
                properties={"name": "Naval Firing Range Exclusion Zone"},
                source="NAVAL_HYDRO",
                freshness_status="live",
            )
        )

        router = RouteAnalysisService(repository=self.repository)
        result = await router.analyze_route(
            origin_lat=13.0000,
            origin_lon=80.2000,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            pfz_id=pfz_id,
        )

        self.assertTrue(result["alternative_used"])
        coords = result["route_geometry"]["coordinates"]
        # Final destination point must match the exact destination PFZ coordinate
        self.assertAlmostEqual(coords[-1][0], dest_lon, places=4)
        self.assertAlmostEqual(coords[-1][1], dest_lat, places=4)

    async def test_no_safe_alternate_route_returns_controlled_failure_response(self):
        """4. No safe alternate route -> controlled failure response."""
        dest_lat = 13.2000
        dest_lon = 80.6000

        # Seed a massive ring of hazards completely surrounding destination
        self.repository.create(
            SpatialFeatureCreate(
                id="hazard-barrier-large",
                dataset="hazards",
                layer="hazards",
                geometry={
                    "type": "Polygon",
                    "coordinates": [[
                        [79.0, 12.0],
                        [82.0, 12.0],
                        [82.0, 14.0],
                        [79.0, 14.0],
                        [79.0, 12.0],
                    ]],
                },
                properties={"name": "Impenetrable Marine Exclusion Barrier"},
                source="SAFETY_AUTH",
                freshness_status="live",
            )
        )

        router = RouteAnalysisService(repository=self.repository)
        result = await router.analyze_route(
            origin_lat=13.0000,
            origin_lon=80.2000,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
        )

        self.assertFalse(result["alternative_used"])
        self.assertEqual(result["gis_analysis"]["status"], "unsuitable")
        self.assertEqual(result["gis_analysis"]["label"], "Hazard Zone Blocked")
        self.assertEqual(result["overall_status"], "UNSAFE")
        self.assertIn("No safe alternate route could be found", result["gis_analysis"]["summary"])

    async def test_no_obstacle_data_available_preserves_existing_behavior(self):
        """5. No obstacle data available -> existing routing behavior remains unchanged."""
        # Ensure repository has no hazard or restricted features
        router = RouteAnalysisService(repository=self.repository)
        result = await router.analyze_route(
            origin_lat=13.0000,
            origin_lon=80.2000,
            dest_lat=13.2000,
            dest_lon=80.6000,
        )

        self.assertEqual(result["status"], "completed")
        self.assertFalse(result["alternative_used"])
        self.assertEqual(result["gis_analysis"]["status"], "suitable")
        self.assertEqual(len(result["detected_obstacles"]), 0)


if __name__ == "__main__":
    unittest.main()
