"""Interpret normalized weather observations; no provider access occurs here."""

from typing import Any


class WeatherAgent:
    name = "weather"

    def interpret(self, data: dict[str, Any]) -> dict[str, Any]:
        if not data.get("available") or not isinstance(data.get("observation"), dict):
            return {"summary": "Weather data is unavailable.", "risk_score": None, "concerns": [], "data_status": data.get("source_status", "unavailable"), "error": data.get("error")}
        observation = data["observation"]
        concerns: list[str] = []
        risk = 0.0
        wind = observation.get("wind_speed_mps")
        precipitation = observation.get("precipitation_mm")
        condition = observation.get("condition")
        if isinstance(wind, (int, float)) and wind >= 13.9:
            concerns.append("Strong winds are reported.")
            risk = max(risk, 0.65)
        if isinstance(precipitation, (int, float)) and precipitation >= 5:
            concerns.append("Significant precipitation is reported.")
            risk = max(risk, 0.45)
        if condition and "thunderstorm" in condition:
            concerns.append("Thunderstorm conditions are reported.")
            risk = max(risk, 0.8)
        summary = f"Weather observation: {condition or 'condition unavailable'}" + (f", wind {wind:g} m/s." if isinstance(wind, (int, float)) else ".")
        return {"summary": summary, "risk_score": risk, "concerns": concerns, "data_status": data["source_status"], "observation": observation}
