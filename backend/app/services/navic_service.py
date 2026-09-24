"""
ISRO NavIC (Navigation with Indian Constellation / IRNSS) Messaging & Offline Field Service.

Simulates the ISRO-developed NavIC Bluetooth messaging receiver deployed on Indian
fishing vessels for offshore communications (>12-15 nautical miles beyond 4G coverage).

Features:
- NavIC Satellite Constellation Lock Status (IRNSS-1B, 1C, 1D, 1E, 1F, 1I, NVS-01)
- L5 (1176.45 MHz) and S-Band (2492.028 MHz) RF link telemetry
- Short Message Service (SMS / 250-char compressed binary packets) for:
  * Emergency Cyclone Alerts
  * IMBL International Maritime Boundary Proximity Alerts
  * Potential Fishing Zone (PFZ) Compressed Waypoints
  * Two-way Distress SOS Beacon Broadcast
"""

from __future__ import annotations
from datetime import datetime, timezone
import math
from typing import Any


class NavICService:
    """Simulates ISRO NavIC satellite receiver dongle communications and broadcast packets."""

    NAVIC_CONSTELLATION = [
        {"prn": "IRNSS-1B", "orbit": "GEO (55°E)", "band": "L5 / S", "status": "LOCKED", "cno_dbhz": 44.2},
        {"prn": "IRNSS-1C", "orbit": "GEO (83°E)", "band": "L5 / S", "status": "LOCKED", "cno_dbhz": 46.8},
        {"prn": "IRNSS-1D", "orbit": "GSO (111.75°E)", "band": "L5 / S", "status": "LOCKED", "cno_dbhz": 42.5},
        {"prn": "IRNSS-1E", "orbit": "GSO (29°E)", "band": "L5 / S", "status": "LOCKED", "cno_dbhz": 41.0},
        {"prn": "IRNSS-1F", "orbit": "GEO (32.5°E)", "band": "L5 / S", "status": "LOCKED", "cno_dbhz": 43.7},
        {"prn": "IRNSS-1I", "orbit": "GSO (55°E)", "band": "L5 / S", "status": "LOCKED", "cno_dbhz": 45.1},
        {"prn": "NVS-01", "orbit": "GSO (L1/L5/S)", "band": "L1 / L5 / S", "status": "LOCKED", "cno_dbhz": 47.9},
    ]

    def get_receiver_status(self, latitude: float, longitude: float) -> dict[str, Any]:
        """
        Returns real-time NavIC receiver dongle connectivity and satellite tracking metrics.
        """
        now = datetime.now(timezone.utc)
        locked_sats = len(self.NAVIC_CONSTELLATION)
        avg_snr = round(sum(s["cno_dbhz"] for s in self.NAVIC_CONSTELLATION) / locked_sats, 1)

        # Distance from nearest coast (estimation) to decide offshore communication mode
        # > 15 km is outside terrestrial 4G/5G coverage where NavIC is vital
        return {
            "receiver_connected": True,
            "device_model": "ISRO NavIC-Bluetooth Marine Transceiver Box (SAC/INCOIS Spec)",
            "connection_type": "Bluetooth BLE Low-Energy / RS-422 Serial",
            "gnss_mode": "NavIC Standalone (L5 + S-Band Dual Frequency)",
            "signal_status": "STRONG_LOCK",
            "tracked_satellites": locked_sats,
            "satellites": self.NAVIC_CONSTELLATION,
            "carrier_to_noise_ratio_dbhz": avg_snr,
            "hdop": 0.85,
            "vdop": 1.12,
            "position_fix": {
                "latitude": latitude,
                "longitude": longitude,
                "altitude_m": 0.0,
                "accuracy_m": 2.4,  # Sub-3m NavIC accuracy over Indian landmass/EEZ
                "timestamp": now.isoformat(),
            },
            "satellite_messaging_active": True,
            "offshore_mode": "ACTIVE (Direct Satellite Ingestion)",
            "battery_level_pct": 94,
        }

    def generate_compressed_navic_packet(
        self,
        alert_type: str,
        message: str,
        lat: float,
        lon: float,
    ) -> dict[str, Any]:
        """
        Encodes an emergency advisory or PFZ waypoint into the ISRO NavIC 250-character
        binary broadcast format for satellite uplink/downlink.
        """
        now = datetime.now(timezone.utc)
        # ISRO standard 250-char message format
        header = f"ISRO/INCOIS-NAVIC|TYPE:{alert_type.upper()}|LOC:{lat:.3f}N,{lon:.3f}E|TIME:{now.strftime('%H%M%SZ')}"
        body = message[: 250 - len(header) - 2]
        packet_string = f"{header}|{body}"

        return {
            "packet_id": f"NAVIC-{now.strftime('%Y%m%d%H%M%S')}",
            "broadcast_frequency": "S-Band (2492.028 MHz)",
            "uplink_hub": "ISRO Master Control Facility (MCF) Hassan",
            "downlink_beam": "NavIC Regional Indian Ocean Coverage Beam",
            "length_bytes": len(packet_string.encode("utf-8")),
            "raw_packet": packet_string,
            "decoded_content": {
                "alert_type": alert_type,
                "latitude": lat,
                "longitude": lon,
                "timestamp": now.isoformat(),
                "text": message,
            },
        }

    def dispatch_navic_distress_sos(
        self,
        vessel_name: str,
        registration_id: str,
        lat: float,
        lon: float,
        nature_of_distress: str = "Vessel in Distress / High Seas Emergency",
    ) -> dict[str, Any]:
        """
        Simulates an ISRO Distress Alert Transmitter (DAT) / NavIC SOS Beacon trigger
        directly to MRCC (Maritime Rescue Coordination Centre) and Indian Coast Guard.
        """
        now = datetime.now(timezone.utc)
        sos_packet = (
            f"MAYDAY-NAVIC|REG:{registration_id}|VESSEL:{vessel_name}|"
            f"LOC:{lat:.4f}N,{lon:.4f}E|NATURE:{nature_of_distress}|"
            f"TIME:{now.isoformat()}"
        )

        return {
            "sos_transmitted": True,
            "satellite_channel": "NavIC Emergency Broadcast Channel (L5/S)",
            "receiving_coordination_centres": [
                "MRCC Chennai / Mumbai (Indian Coast Guard)",
                "INCOIS Marine Emergency Centre (Hyderabad)",
                "ISRO ISTRAC Satellite Operations",
            ],
            "packet_id": f"SOS-NAVIC-{now.strftime('%Y%m%d-%H%M%S')}",
            "vessel_details": {
                "name": vessel_name,
                "registration": registration_id,
                "coordinates": [lon, lat],
            },
            "timestamp": now.isoformat(),
            "status": "TRANSMITTED_AND_ACKNOWLEDGED",
            "raw_telemetry": sos_packet,
        }


navic_service = NavICService()
