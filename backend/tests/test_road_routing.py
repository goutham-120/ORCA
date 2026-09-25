"""Unit tests for the Land-to-Shore Road Routing Engine and Harbor Discovery."""

import unittest
from app.services.road_routing_service import RoadRoutingService, INDIAN_COASTAL_HARBORS


class RoadRoutingTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.service = RoadRoutingService()

    def test_nearest_harbor_discovery_for_chennai_inland(self):
        # Coordinates in central Chennai city (inland)
        harbor, dist_km = self.service.find_nearest_harbor(13.0827, 80.2000)
        self.assertIn("Kasimedu", harbor["name"])
        self.assertGreater(dist_km, 5.0)

    def test_nearest_harbor_discovery_for_vizag_inland(self):
        # Coordinates in Visakhapatnam city
        harbor, dist_km = self.service.find_nearest_harbor(17.7200, 83.2500)
        self.assertIn("Visakhapatnam", harbor["name"])
        self.assertGreater(dist_km, 1.0)

    async def test_coastal_origin_detects_already_at_harbor(self):
        # Kasimedu harbor exact coords
        res = await self.service.get_land_to_harbor_route(
            origin_lat=13.1264,
            origin_lon=80.2978,
        )
        self.assertFalse(res["land_transit_needed"])
        self.assertTrue(res["is_at_sea_or_harbor"])
        self.assertEqual(res["distance_km"], 0.0)

    async def test_inland_origin_generates_land_transit_with_steps(self):
        # Inland spot near Chennai (~4 km from coast)
        res = await self.service.get_land_to_harbor_route(
            origin_lat=13.0600,
            origin_lon=80.2400,
        )
        self.assertTrue(res["land_transit_needed"])
        self.assertFalse(res["is_at_sea_or_harbor"])
        self.assertGreater(res["distance_km"], 0.0)
        self.assertGreater(res["duration_mins"], 0.0)
        self.assertIn("Kasimedu", res["harbor"]["name"])
        self.assertIsNotNone(res["road_geometry"])
        self.assertEqual(res["road_geometry"]["type"], "LineString")
        self.assertGreaterEqual(len(res["road_geometry"]["coordinates"]), 2)
        self.assertGreaterEqual(len(res["road_steps"]), 1)

    async def test_offshore_water_origin_disables_land_transit(self):
        # Offshore point 15 km east into Bay of Bengal from Chennai coast
        res = await self.service.get_land_to_harbor_route(
            origin_lat=13.0800,
            origin_lon=80.4500,
        )
        self.assertFalse(res["land_transit_needed"])
        self.assertTrue(res["is_at_sea_or_harbor"])
        self.assertEqual(res["distance_km"], 0.0)
        self.assertIsNone(res["road_geometry"])
        self.assertEqual(len(res["road_steps"]), 0)

    async def test_offshore_vizag_water_origin_disables_land_transit(self):
        # Offshore point 15 km in Bay of Bengal from Visakhapatnam
        res = await self.service.get_land_to_harbor_route(
            origin_lat=17.6500,
            origin_lon=83.4500,
        )
        self.assertFalse(res["land_transit_needed"])
        self.assertTrue(res["is_at_sea_or_harbor"])
        self.assertEqual(res["distance_km"], 0.0)
        self.assertIsNone(res["road_geometry"])
        self.assertEqual(len(res["road_steps"]), 0)
