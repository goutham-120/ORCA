"""Interpret normalized marine observations; no provider access occurs here."""

from typing import Any


class OceanAgent:
    name = "ocean"

    def interpret(self, data: dict[str, Any]) -> dict[str, Any]:
        if not data.get("available") or not isinstance(data.get("observation"), dict):
            return {"summary": "Ocean data is unavailable.", "risk_score": None, "concerns": [], "data_status": data.get("source_status", "unavailable"), "error": data.get("error")}
        observation = data["observation"]
        concerns: list[str] = []
        risk = 0.0
        wave_height = observation.get("wave_height_m")
        wave_period = observation.get("wave_period_s")
        if isinstance(wave_height, (int, float)) and wave_height >= 2.5:
            concerns.append("High waves are reported.")
            risk = max(risk, 0.7)
        elif isinstance(wave_height, (int, float)) and wave_height >= 1.5:
            concerns.append("Elevated waves are reported.")
            risk = max(risk, 0.4)
        if isinstance(wave_period, (int, float)) and wave_period >= 12:
            concerns.append("Long-period swell is reported.")
            risk = max(risk, 0.5)
        summary = "Marine observation: " + (f"wave height {wave_height:g} m." if isinstance(wave_height, (int, float)) else "wave height unavailable.")
        return {"summary": summary, "risk_score": risk, "concerns": concerns, "data_status": data["source_status"], "observation": observation}
