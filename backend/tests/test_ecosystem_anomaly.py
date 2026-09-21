"""Unit tests for the Marine Ecosystem Anomaly & Fish Productivity Diagnostics Agent."""

import unittest
from app.services.ecosystem_service import ecosystem_anomaly_service


class EcosystemAnomalyTests(unittest.TestCase):
    def test_normal_baseline_conditions(self):
        # Normal SST (28.4°C) and normal chlorophyll (1.35 mg/m3) in North Bay of Bengal
        diag = ecosystem_anomaly_service.diagnose_productivity_decline(
            latitude=17.6868,
            longitude=83.2185,
            current_sst=28.4,
            current_chlorophyll=1.35,
            wind_speed_mps=6.5,
        )
        self.assertEqual(diag["status"], "completed")
        self.assertEqual(diag["overall_severity"], "low")
        self.assertIn("Bay of Bengal", diag["sector_name"])
        self.assertIn("standard seasonal ranges", diag["diagnosis_summary"])
        self.assertGreater(len(diag["target_species_impacted"]), 0)

    def test_marine_heatwave_and_chlorophyll_depletion_diagnosed(self):
        # Elevated SST (30.8°C -> +2.4°C anomaly) and depleted chlorophyll (0.2 mg/m3 -> -85% drop)
        diag = ecosystem_anomaly_service.diagnose_productivity_decline(
            latitude=17.6868,
            longitude=83.2185,
            current_sst=30.8,
            current_chlorophyll=0.2,
            wind_speed_mps=2.1,  # Weak wind / sluggish upwelling
        )
        self.assertEqual(diag["status"], "completed")
        self.assertIn(diag["overall_severity"], ["high", "critical"])
        self.assertIn("Stressed", diag["ecosystem_health"])
        self.assertTrue(len(diag["stress_factors"]) >= 2)
        self.assertTrue(any("Marine Heatwave" in f["factor"] for f in diag["stress_factors"]))
        self.assertTrue(any("Phytoplankton Biomass Depletion" in f["factor"] for f in diag["stress_factors"]))
        self.assertGreater(len(diag["recommendations"]), 0)
        self.assertIn("ISRO", diag["provenance"]["sst_source"])


if __name__ == "__main__":
    unittest.main()
