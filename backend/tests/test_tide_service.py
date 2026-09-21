"""Unit tests for the Harmonic Tide & Hydrodynamic Current Prediction Service."""

import unittest
from datetime import datetime, timezone
from app.services.tide_service import tide_service, find_nearest_station


class TideServiceTests(unittest.TestCase):
    def test_nearest_station_lookup_for_vizag(self):
        station = find_nearest_station(17.6868, 83.2185)
        self.assertIn("Visakhapatnam", station["name"])
        self.assertLess(station["distance_to_station_km"], 5.0)

    def test_nearest_station_lookup_for_chennai(self):
        station = find_nearest_station(13.0827, 80.2707)
        self.assertIn("Kasimedu Chennai", station["name"])
        self.assertLess(station["distance_to_station_km"], 15.0)

    def test_tide_prediction_returns_high_low_and_current_velocity(self):
        now = datetime(2026, 3, 15, 10, 30, tzinfo=timezone.utc)
        result = tide_service.predict_tide(17.6868, 83.2185, at=now)

        self.assertEqual(result["status"], "available")
        self.assertIn("Visakhapatnam", result["station_name"])
        self.assertIsInstance(result["current_height_m"], float)
        self.assertIn(result["tide_state"], ["Flood (Rising Tide)", "Ebb (Falling Tide)", "Slack Water"])
        self.assertIn("Tide", result["spring_neap_phase"])
        self.assertGreater(result["next_high_tide"]["height_m"], 0.0)
        self.assertGreater(result["next_low_tide"]["height_m"], 0.0)
        self.assertIsInstance(result["current_velocity_knots"], float)
        self.assertIn(result["current_direction_cardinal"], ["N", "NNE", "S", "SSW"])


if __name__ == "__main__":
    unittest.main()
