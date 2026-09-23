"""Interpret normalized weather observations with Beaufort wind scale and maritime weather intelligence; no provider access occurs here."""

from typing import Any


def _wind_description(mps: float) -> tuple[str, str, float]:
    """Return (beaufort_label, nautical_impact, baseline_risk) according to Beaufort wind scale."""
    kts = mps * 1.94384
    if mps < 1.5:
        return "Calm/Light Air (Beaufort 0-1)", "Smooth sailing, optimal visibility", 0.05
    elif mps < 5.5:
        return "Light to Gentle Breeze (Beaufort 2-3)", "Ideal marine navigation & fishing conditions", 0.10 + (mps / 5.5) * 0.15
    elif mps < 8.0:
        return "Moderate Breeze (Beaufort 4)", "Fair conditions; small wavelets forming", 0.25 + ((mps - 5.5) / 2.5) * 0.15
    elif mps < 10.8:
        return "Fresh Breeze (Beaufort 5)", "Choppy waters; caution for small skiffs & open boats", 0.40 + ((mps - 8.0) / 2.8) * 0.20
    elif mps < 13.9:
        return "Strong Breeze (Beaufort 6)", "Small craft advisory in effect; wave crests breaking", 0.60 + ((mps - 10.8) / 3.1) * 0.15
    elif mps < 17.2:
        return "Near Gale (Beaufort 7)", "High wind hazard; sea heaps up, hazardous navigation", 0.75 + ((mps - 13.9) / 3.3) * 0.15
    else:
        return "Gale to Storm Force (Beaufort 8+)", "Critical danger; severe gale conditions, halt operations", min(1.0, 0.90 + ((mps - 17.2) / 5.0) * 0.10)


class WeatherAgent:
    name = "weather"

    def interpret(self, data: dict[str, Any]) -> dict[str, Any]:
        if not data.get("available") or not isinstance(data.get("observation"), dict):
            return {
                "summary": "Weather data is unavailable.",
                "risk_score": None,
                "concerns": [],
                "data_status": data.get("source_status", "unavailable"),
                "error": data.get("error"),
            }

        observation = data["observation"]
        concerns: list[str] = []
        risk = 0.0

        wind = observation.get("wind_speed_mps")
        precipitation = observation.get("precipitation_mm")
        condition = str(observation.get("condition") or "").lower()

        wind_label = ""
        wind_impact = ""
        wind_kts_str = ""

        if isinstance(wind, (int, float)):
            wind_label, wind_impact, wind_risk = _wind_description(float(wind))
            risk = max(risk, wind_risk)
            kts = round(float(wind) * 1.94384, 1)
            wind_kts_str = f"{wind:g} m/s ({kts:g} kts)"

            if wind >= 17.2:
                concerns.append(f"Gale-force winds ({wind:g} m/s / {kts:g} kts) — critical marine hazard.")
            elif wind >= 10.8:
                concerns.append(f"Strong winds ({wind:g} m/s / {kts:g} kts) — small craft caution recommended.")
            elif wind >= 8.0:
                concerns.append(f"Fresh breeze ({wind:g} m/s / {kts:g} kts) — choppy surface conditions.")

        if isinstance(precipitation, (int, float)):
            if precipitation >= 20:
                concerns.append(f"Heavy rainfall ({precipitation:g} mm) — severe visibility reduction.")
                risk = max(risk, 0.70)
            elif precipitation >= 5:
                concerns.append(f"Moderate precipitation ({precipitation:g} mm) reported.")
                risk = max(risk, 0.45)

        if "thunderstorm" in condition:
            concerns.append("Thunderstorm conditions reported — lightning, sudden squalls, and erratic wind gusts.")
            risk = max(risk, 0.80)
        elif "squall" in condition:
            concerns.append("Squall activity detected — sudden high wind surges.")
            risk = max(risk, 0.75)
        elif "fog" in condition:
            concerns.append("Foggy conditions — reduced navigational visibility.")
            risk = max(risk, 0.55)
        elif "heavy rain" in condition or "violent rain" in condition:
            concerns.append("Heavy rain showers — poor visibility and sea spray.")
            risk = max(risk, 0.65)

        # Build professional, attractive summary
        condition_title = observation.get("condition") or "Conditions stable"
        if isinstance(wind, (int, float)):
            summary = f"Weather observation: {condition_title}, wind {wind_kts_str} ({wind_label} — {wind_impact})."
        else:
            summary = f"Weather observation: {condition_title}."

        return {
            "summary": summary,
            "risk_score": round(min(1.0, risk), 2),
            "concerns": concerns,
            "data_status": data["source_status"],
            "observation": observation,
            "wind_label": wind_label,
            "wind_impact": wind_impact,
        }
