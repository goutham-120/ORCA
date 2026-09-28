import asyncio
import unittest
from app.services.road_routing_service import is_coordinate_in_water, RoadRoutingService
from app.services.route_analysis_service import RouteAnalysisService
from app.providers.demo_spatial import ensure_demo_gis, replace_demo_pfz, DEMO_SOURCE
from app.models.spatial_feature import spatial_features
from app.api.map import navigate_nearest_pfz
from app.schemas.map import NavigateNearestPFZRequest


class HazardDetourRoutingTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        spatial_features.delete_source_dataset("ORCA_DEMO_GIS", DEMO_SOURCE)
        ensure_demo_gis()
        replace_demo_pfz()

    async def test_land_vs_water_detection(self):
        # Inland coordinates (must be False)
        self.assertFalse(is_coordinate_in_water(12.9716, 77.5946))  # Bangalore
        self.assertFalse(is_coordinate_in_water(17.3850, 78.4867))  # Hyderabad
        self.assertFalse(is_coordinate_in_water(13.0827, 80.1500))  # Inland Chennai
        self.assertFalse(is_coordinate_in_water(17.7200, 83.1500))  # Inland Vizag

        # Offshore / sea coordinates (must be True)
        self.assertTrue(is_coordinate_in_water(13.1250, 80.3200))   # Chennai offshore
        self.assertTrue(is_coordinate_in_water(17.6900, 83.3200))   # Vizag offshore
        self.assertTrue(is_coordinate_in_water(18.9100, 72.8200))   # Mumbai offshore
        self.assertTrue(is_coordinate_in_water(9.9300, 76.2000))    # Kochi offshore

    async def test_water_location_direct_navigation(self):
        # When location is in water (e.g. offshore Chennai 13.125, 80.31)
        req = NavigateNearestPFZRequest(latitude=13.1250, longitude=80.3100, radius_km=60.0)
        res = await navigate_nearest_pfz(req)
        self.assertTrue(res.has_pfz)
        # No land transit road leg should be attached
        self.assertIsNone(res.land_transit)
        self.assertIsNotNone(res.route)
        # Sea departure should originate directly from user's water position
        self.assertAlmostEqual(res.navigation_summary["sea_departure"]["latitude"], 13.1250, places=2)
        self.assertAlmostEqual(res.navigation_summary["sea_departure"]["longitude"], 80.3100, places=2)

    async def test_land_location_multimodal_navigation(self):
        # When location is inland near Visakhapatnam (17.72, 83.25)
        req = NavigateNearestPFZRequest(latitude=17.7200, longitude=83.2500, radius_km=60.0)
        res = await navigate_nearest_pfz(req)
        self.assertTrue(res.has_pfz)
        # Land transit road leg should be present
        self.assertIsNotNone(res.land_transit)
        self.assertTrue(res.land_transit.get("land_transit_needed"))
        self.assertIsNotNone(res.land_transit.get("road_geometry"))
        self.assertIsNotNone(res.route)

    async def test_hazard_detour_generates_alternate_and_blocked_direct(self):
        svc = RouteAnalysisService()
        # Kasimedu harbor (80.2978, 13.1264) to offshore PFZ (80.55, 13.12)
        # Passes directly through the Chennai TSS shipping hazard
        res = await svc.analyze_route(13.1264, 80.2978, 13.12, 80.55)
        self.assertTrue(res["alternative_used"])
        self.assertEqual(res["gis_analysis"]["status"], "caution")
        self.assertIsNotNone(res.get("blocked_direct_geometry"))
        self.assertEqual(res["blocked_direct_geometry"]["type"], "LineString")
        # Route geometry should have detour waypoints
        coords = res["route_geometry"]["coordinates"]
        self.assertGreater(len(coords), 2)
        # Obstacle should be detected in risk list
        self.assertTrue(any("Chennai" in obs for obs in res["detected_obstacles"]))


if __name__ == "__main__":
    unittest.main()
