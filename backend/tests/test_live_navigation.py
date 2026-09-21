"""
Tests for Live PFZ Navigation API (/map/navigate-nearest-pfz)
"""

import unittest
from unittest.mock import AsyncMock, patch
from app.api.map import navigate_nearest_pfz
from app.schemas.map import NavigateNearestPFZRequest


class TestLivePFZNavigation(unittest.IsolatedAsyncioTestCase):
    async def test_successful_pfz_navigation_route_generation(self):
        req = NavigateNearestPFZRequest(
            latitude=13.0827,
            longitude=80.2707,
            radius_km=150.0,
            vessel_speed_knots=12.0,
        )
        res = await navigate_nearest_pfz(req)
        self.assertTrue(res.has_pfz)
        self.assertEqual(res.status, "ready_to_navigate")
        self.assertIsNotNone(res.selected_pfz)
        self.assertIsNotNone(res.distance_nm)
        self.assertIsNotNone(res.bearing_deg)
        self.assertIsNotNone(res.compass_heading)
        self.assertIsNotNone(res.route)
        self.assertIn("waypoints", res.route.model_dump())
        self.assertIn("navigation_summary", res.model_dump())
        self.assertEqual(res.navigation_summary["origin"]["latitude"], 13.0827)

    async def test_no_pfz_in_tiny_radius_returns_graceful_status(self):
        req = NavigateNearestPFZRequest(
            latitude=13.0827,
            longitude=80.2707,
            radius_km=0.5,  # Tiny radius (500m) - no PFZ in harbor basin
            vessel_speed_knots=10.0,
        )
        res = await navigate_nearest_pfz(req)
        self.assertFalse(res.has_pfz)
        self.assertEqual(res.status, "no_pfz_found")
        self.assertIsNone(res.route)
        self.assertIn("No", res.message)


if __name__ == "__main__":
    unittest.main()
