"""Unit tests for the Marine Safety Index (MSI) calculation engine."""

import unittest
from app.analysis.safety_index import compute_marine_safety_index


class MarineSafetyIndexTests(unittest.TestCase):
    def test_calm_optimal_conditions_yield_safe_tier(self):
        result = compute_marine_safety_index(
            wave_height_m=0.6,
            wave_period_s=7.0,
            wind_speed_mps=3.5,
            precipitation_mm=0.0,
            weather_condition="Clear sky",
            visibility_km=15.0,
        )
        self.assertEqual(result["tier"], "safe")
        self.assertGreaterEqual(result["score"], 85.0)
        self.assertEqual(result["suitability"], "favorable")
        self.assertEqual(len(result["penalties"]), 0)

    def test_moderate_conditions_yield_caution_tier(self):
        result = compute_marine_safety_index(
            wave_height_m=1.4,
            wave_period_s=12.0,  # Elevated period
            wind_speed_mps=7.5,
            precipitation_mm=1.0,
            weather_condition="Partly cloudy",
        )
        self.assertEqual(result["tier"], "caution")
        self.assertTrue(65.0 <= result["score"] < 85.0)
        self.assertEqual(result["suitability"], "moderate")
        self.assertTrue(any(p["factor"] == "swell_period" for p in result["penalties"]))

    def test_storm_conditions_yield_critical_tier(self):
        result = compute_marine_safety_index(
            wave_height_m=4.5,
            wind_speed_mps=22.0,
            precipitation_mm=35.0,
            weather_condition="Severe thunderstorm with squall",
        )
        self.assertEqual(result["tier"], "critical")
        self.assertLess(result["score"], 40.0)
        self.assertEqual(result["suitability"], "unfavorable")
        self.assertTrue(any(p["factor"] == "convective_hazard" for p in result["penalties"]))

    def test_missing_data_tolerated_with_confidence_metric(self):
        result = compute_marine_safety_index(
            wave_height_m=1.2,
            wind_speed_mps=None,
            precipitation_mm=None,
        )
        self.assertIsInstance(result["score"], float)
        self.assertLess(result["confidence"], 1.0)


if __name__ == "__main__":
    unittest.main()
