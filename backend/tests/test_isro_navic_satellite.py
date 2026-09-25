"""Unit tests for ISRO Satellite Overpass & NavIC Messaging Engine."""

import unittest
from datetime import datetime, timezone
from app.services.satellite_overpass_service import SatelliteOverpassService, satellite_overpass_service
from app.services.navic_service import NavICService, navic_service


class ISROAndNavICTests(unittest.TestCase):
    def test_satellite_overpass_schedule_generation(self):
        result = satellite_overpass_service.get_satellite_overpass_schedule(
            latitude=17.6868,
            longitude=83.2185,
            now=datetime(2026, 9, 24, 12, 0, 0, tzinfo=timezone.utc),
        )

        self.assertIn("active_missions", result)
        missions = {m["mission_id"]: m for m in result["active_missions"]}
        self.assertIn("EOS-06", missions)
        self.assertIn("INSAT-3DS", missions)
        self.assertIn("EOS-04", missions)

        # Check EOS-06 payloads and swath
        eos06 = missions["EOS-06"]
        self.assertEqual(eos06["agency"], "ISRO / NRSC")
        self.assertEqual(eos06["swath_width_km"], 1420)
        self.assertTrue(len(result["swaths"]) > 0)
        self.assertEqual(result["swaths"][0]["geometry"]["type"], "Polygon")

    def test_navic_receiver_status_and_satellite_lock(self):
        status = navic_service.get_receiver_status(latitude=13.0827, longitude=80.2707)

        self.assertTrue(status["receiver_connected"])
        self.assertEqual(status["signal_status"], "STRONG_LOCK")
        self.assertGreaterEqual(status["tracked_satellites"], 7)
        self.assertIn("position_fix", status)
        self.assertLessEqual(status["position_fix"]["accuracy_m"], 3.0)

    def test_navic_compressed_packet_encoding(self):
        packet = navic_service.generate_compressed_navic_packet(
            alert_type="CYCLONE_ALERT",
            message="Deep depression 220km SE of Visakhapatnam. Gusts up to 65km/h. Avoid high seas.",
            lat=17.6868,
            lon=83.2185,
        )

        self.assertTrue(packet["packet_id"].startswith("NAVIC-"))
        self.assertLessEqual(packet["length_bytes"], 250)
        self.assertIn("ISRO/INCOIS-NAVIC", packet["raw_packet"])

    def test_navic_sos_distress_beacon_dispatch(self):
        sos = navic_service.dispatch_navic_distress_sos(
            vessel_name="MATSYA-VAHINI-09",
            registration_id="IND-TN-02-MM-9921",
            lat=11.934,
            lon=79.835,
            nature_of_distress="Engine failure in heavy swell",
        )

        self.assertTrue(sos["sos_transmitted"])
        self.assertEqual(sos["status"], "TRANSMITTED_AND_ACKNOWLEDGED")
        self.assertIn("MRCC Chennai / Mumbai (Indian Coast Guard)", sos["receiving_coordination_centres"])
