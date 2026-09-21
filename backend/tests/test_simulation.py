import unittest
from datetime import datetime, timezone
from app.core.context import QueryContext
from app.core.query_parser import QueryParser
from app.services.decision_service import DecisionService
from app.services.simulation_service import ScenarioSimulationService
from app.core.conversation import synthesize_answer


class ScenarioSimulationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.simulator = ScenarioSimulationService()
        self.decision_svc = DecisionService()
        self.parser = QueryParser()
        self.test_loc = {"latitude": 17.6868, "longitude": 83.2185, "label": "Visakhapatnam Harbor"}

    async def test_baseline_simulation_without_perturbations(self):
        """Zero perturbation maintains baseline MSI and operational parameters."""
        res = await self.simulator.simulate(self.test_loc, {})
        self.assertEqual(res["status"], "simulated")
        self.assertEqual(res["msi_delta"], 0)
        self.assertIn("comparison_matrix", res)
        self.assertIn("species_impacts", res)
        self.assertIn("vessel_advisories", res)

    async def test_marine_heatwave_perturbation_triggers_fishery_alert(self):
        """+2.5°C SST increase triggers Indian Oil Sardine dispersal alert."""
        res = await self.simulator.simulate(self.test_loc, {"delta_sst_c": 2.5})
        sardine = next(s for s in res["species_impacts"] if "Sardine" in s["species"])
        self.assertIn("Threshold Exceeded", sardine["thermal_status"])
        self.assertIn("Dispersal", sardine["impact"])

    async def test_monsoon_gale_perturbation_triggers_vessel_restrictions(self):
        """Severe wind (22 m/s) and wave surge (+2.5m) triggers prohibitions and hazardous MSI."""
        res = await self.simulator.simulate(
            self.test_loc,
            {"delta_wave_m": 2.5, "target_wind_mps": 22.0, "storm_condition": "squall"},
        )
        self.assertLess(res["simulated"]["msi"]["score"], 45)
        self.assertIn(res["simulated"]["msi"]["tier"], {"critical", "hazardous"})
        vessels = res["vessel_advisories"]
        craft1 = next(v for v in vessels if "Traditional" in v["category"])
        self.assertEqual(craft1["status"], "PROHIBITED")
        self.assertEqual(res["port_impact"]["risk_level"], "critical")

    async def test_query_parser_identifies_simulation_intent(self):
        """Query parser extracts simulation intent and parameters."""
        # English
        p_en = self.parser.parse("What if SST rises by 2°C in Visakhapatnam?")
        self.assertEqual(p_en.decision_type, "simulation")
        self.assertIsNotNone(p_en.perturbations)
        self.assertEqual(p_en.perturbations.get("delta_sst_c"), 2.0)

        # Wind in knots
        p_wind = self.parser.parse("Simulate scenario if wind speed reaches 30 knots in Chennai")
        self.assertEqual(p_wind.decision_type, "simulation")
        self.assertIsNotNone(p_wind.perturbations)
        self.assertAlmostEqual(p_wind.perturbations.get("target_wind_mps"), 15.43, places=1)

        # Hindi
        p_hi = self.parser.parse("क्या होगा अगर विशाखापत्तनम में तापमान 1.5°C बढ़ जाए?")
        self.assertEqual(p_hi.decision_type, "simulation")

        # Telugu
        p_te = self.parser.parse("ఒకవేళ విశాఖపట్నం దగ్గర ఉష్ణోగ్రత 2°C పెరిగితే ఏమి జరుగుతుంది?")
        self.assertEqual(p_te.decision_type, "simulation")

        # Tamil
        p_ta = self.parser.parse("ஒருவேளை சென்னையில் வெப்பநிலை 1.5°C உயர்ந்தால் என்ன நடக்கும்?")
        self.assertEqual(p_ta.decision_type, "simulation")

    async def test_decision_service_simulation_returns_structured_payload(self):
        """DecisionService.simulation integrates ScenarioSimulationService cleanly."""
        dec = await self.decision_svc.simulation(
            self.test_loc,
            {"delta_sst_c": 1.5, "delta_wave_m": 1.0},
        )
        self.assertEqual(dec["status"], "available")
        self.assertIn("scenario_simulation", dec)
        self.assertIn("marine_safety_index", dec)
        self.assertIn("comparison_matrix", dec["scenario_simulation"])

    async def test_multilingual_conversational_synthesis_for_simulation(self):
        """Synthesize answer outputs specialized simulation reports in EN, HI, TE, TA."""
        dec = await self.decision_svc.simulation(
            self.test_loc,
            {"delta_sst_c": 2.0, "delta_wave_m": 1.5},
        )
        ctx = {"location": self.test_loc, "decision_type": "simulation"}

        ans_en = synthesize_answer("What if SST rises 2°C?", {"level": "high"}, {}, [], ctx, language="en", decision=dec)
        self.assertIn("Marine Scenario Simulation Report", ans_en)
        self.assertIn("Projected Marine Safety Index", ans_en)

        ans_hi = synthesize_answer("क्या होगा अगर तापमान 2°C बढ़े?", {"level": "high"}, {}, [], ctx, language="hi", decision=dec)
        self.assertIn("समुद्री परिदृश्य सिमुलेशन", ans_hi)

        ans_te = synthesize_answer("ఒకవేళ ఉష్ణోగ్రత 2°C పెరిగితే?", {"level": "high"}, {}, [], ctx, language="te", decision=dec)
        self.assertIn("సముద్ర దృశ్య సిమ్యులేషన్", ans_te)

        ans_ta = synthesize_answer("ஒருவேளை வெப்பநிலை 2°C உயர்ந்தால்?", {"level": "high"}, {}, [], ctx, language="ta", decision=dec)
        self.assertIn("மாதிரி உருவகப்படுத்தல்", ans_ta)


if __name__ == "__main__":
    unittest.main()
