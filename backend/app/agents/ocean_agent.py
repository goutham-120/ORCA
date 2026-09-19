"""Interpret normalized marine observations with maritime sea-state intelligence; no provider access occurs here."""

from typing import Any


def _sea_state_description(wave_height: float) -> tuple[str, str, float]:
    """Return (sea_state_label, operational_impact, baseline_risk) according to Douglas/WMO sea state scale."""
    if wave_height < 0.5:
        return "Calm/Smooth (Sea State 1-2)", "Safe and ideal for all marine craft", 0.05 + (wave_height / 0.5) * 0.10
    elif wave_height < 1.25:
        return "Slight Sea (Sea State 3)", "Minor wave action, safe for standard craft", 0.15 + ((wave_height - 0.5) / 0.75) * 0.20
    elif wave_height < 2.5:
        return "Moderate Sea (Sea State 4)", "Choppy waters; caution advised for small fishing boats", 0.35 + ((wave_height - 1.25) / 1.25) * 0.30
    elif wave_height < 4.0:
        return "Rough Sea (Sea State 5)", "High waves; hazardous for small and medium craft", 0.70 + ((wave_height - 2.5) / 1.5) * 0.15
    else:
        return "Very Rough to High (Sea State 6+)", "Severe maritime hazard; stay in harbor", min(1.0, 0.85 + ((wave_height - 4.0) / 2.0) * 0.15)


class OceanAgent:
    name = "ocean"

    def interpret(self, data: dict[str, Any]) -> dict[str, Any]:
        if not data.get("available") or not isinstance(data.get("observation"), dict):
            return {
                "summary": "Ocean data is unavailable.",
                "risk_score": None,
                "concerns": [],
                "data_status": data.get("source_status", "unavailable"),
                "error": data.get("error"),
            }

        observation = data["observation"]
        concerns: list[str] = []
        risk = 0.0

        wave_height = observation.get("wave_height_m")
        wave_period = observation.get("wave_period_s")
        sst = observation.get("sea_surface_temperature_c")

        sea_state_label = ""
        operational_impact = ""

        if isinstance(wave_height, (int, float)):
            sea_state_label, operational_impact, wave_risk = _sea_state_description(float(wave_height))
            risk = max(risk, wave_risk)

            if wave_height >= 3.5:
                concerns.append(f"Dangerous high sea state ({wave_height:g} m waves) — critical navigation hazard.")
            elif wave_height >= 2.2:
                concerns.append(f"Rough sea state ({wave_height:g} m waves) — hazardous for small and medium vessels.")
            elif wave_height >= 1.25:
                concerns.append(f"Moderate chop ({wave_height:g} m waves) — advisory for small fishing boats.")

        if isinstance(wave_period, (int, float)):
            if wave_period >= 12:
                concerns.append(f"Long-period swell ({wave_period:g} s) — elevated surf and breaker risk near shallows.")
                risk = max(risk, 0.50)
            elif wave_period >= 10:
                concerns.append(f"Moderate ocean swell ({wave_period:g} s) reported.")
                risk = max(risk, 0.35)

        # Build professional, attractive summary
        if isinstance(wave_height, (int, float)):
            summary = f"Marine observation: wave height {wave_height:g} m ({sea_state_label} — {operational_impact})."
        else:
            summary = "Marine observation: wave height unavailable."

        return {
            "summary": summary,
            "risk_score": round(min(1.0, risk), 2),
            "concerns": concerns,
            "data_status": data["source_status"],
            "observation": observation,
            "sea_state": sea_state_label,
            "sea_impact": operational_impact,
        }
