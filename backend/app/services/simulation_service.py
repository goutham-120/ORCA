"""Physics-grounded What-If Marine Scenario Simulation Engine.

Simulates environmental perturbations (SST delta, wind surge, wave surge, storm convection)
and models continuous Marine Safety Index (MSI) shifts, pelagic fish dispersal,
vessel operational restrictions, and port harbor berthing impacts.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Mapping
from app.analysis.safety_index import compute_marine_safety_index
from app.tools.ocean_tools import OceanTool
from app.tools.weather_tools import WeatherTool

class ScenarioSimulationService:
    def __init__(self, weather: Any | None = None, ocean: Any | None = None) -> None:
        self.weather = weather or WeatherTool()
        self.ocean = ocean or OceanTool()

    async def simulate(
        self,
        location: dict[str, Any],
        perturbations: dict[str, Any],
        at: datetime | None = None,
    ) -> dict[str, Any]:
        """Runs a what-if perturbation simulation against baseline observations."""
        req = {"location": location}
        if at is not None:
            req["time_expression"] = at.isoformat()

        # 1. Fetch baseline real-time/cached observations
        try:
            weather_res = await self.weather.fetch(req)
        except Exception:
            weather_res = {}
        try:
            ocean_res = await self.ocean.fetch(req)
        except Exception:
            ocean_res = {}

        w_obs = weather_res.get("observation") if isinstance(weather_res.get("observation"), Mapping) else {}
        o_obs = ocean_res.get("observation") if isinstance(ocean_res.get("observation"), Mapping) else {}

        # Default fallbacks if providers return None/empty
        base_sst = float(o_obs.get("sea_surface_temperature_c") if o_obs.get("sea_surface_temperature_c") is not None else 28.5)
        base_wave = float(o_obs.get("wave_height_m") if o_obs.get("wave_height_m") is not None else 1.2)
        base_period = float(o_obs.get("wave_period_s") if o_obs.get("wave_period_s") is not None else 8.5)
        base_wind = float(w_obs.get("wind_speed_mps") if w_obs.get("wind_speed_mps") is not None else 6.5)
        base_rain = float(w_obs.get("precipitation_mm") if w_obs.get("precipitation_mm") is not None else 0.0)
        base_cond = str(w_obs.get("condition") or "partly cloudy")

        # 2. Extract and apply perturbations
        delta_sst = float(perturbations.get("delta_sst_c") or 0.0)
        delta_wave = float(perturbations.get("delta_wave_m") or 0.0)
        delta_wind = float(perturbations.get("delta_wind_mps") or 0.0)
        wind_mult = float(perturbations.get("wind_multiplier") or 1.0)
        target_wind = perturbations.get("target_wind_mps")
        target_wave = perturbations.get("target_wave_m")
        sim_cond = perturbations.get("storm_condition") or base_cond

        # Simulated values
        sim_sst = round(base_sst + delta_sst, 2)

        if target_wind is not None:
            sim_wind = round(float(target_wind), 2)
        else:
            sim_wind = round((base_wind * wind_mult) + delta_wind, 2)

        if target_wave is not None:
            sim_wave = round(float(target_wave), 2)
        else:
            sim_wave = round(base_wave + delta_wave, 2)

        sim_period = round(base_period * (1.15 if sim_wave > base_wave + 1.0 else 1.0), 1)
        sim_rain = base_rain + (25.0 if "cyclone" in str(sim_cond).lower() or "squall" in str(sim_cond).lower() else 0.0)

        # 3. Compute Continuous Marine Safety Index (MSI)
        baseline_msi = compute_marine_safety_index(
            wave_height_m=base_wave,
            wave_period_s=base_period,
            wind_speed_mps=base_wind,
            precipitation_mm=base_rain,
            weather_condition=base_cond,
        )

        simulated_msi = compute_marine_safety_index(
            wave_height_m=sim_wave,
            wave_period_s=sim_period,
            wind_speed_mps=sim_wind,
            precipitation_mm=sim_rain,
            weather_condition=sim_cond,
        )

        msi_delta = round(float(simulated_msi["score"] - baseline_msi["score"]), 1)
        msi_delta_int = int(round(msi_delta))

        # 4. Pelagic Fisheries & Commercial Biomass Dispersal Simulation
        species_impacts = self._simulate_fisheries(base_sst, sim_sst)

        # 5. Vessel Category Operational Restrictions
        vessel_advisories = self._simulate_vessels(sim_wave, sim_wind, sim_cond)

        # 6. Harbor & Port Infrastructure Impact
        port_impact = self._simulate_port(sim_wave, sim_wind, sim_cond)

        # 7. Comparison Matrix Table
        comparison_matrix = [
            {
                "parameter": "Sea Surface Temp (SST)",
                "unit": "°C",
                "baseline": base_sst,
                "simulated": sim_sst,
                "delta": round(sim_sst - base_sst, 2),
                "severity": "high" if abs(sim_sst - base_sst) >= 2.0 else "moderate" if abs(sim_sst - base_sst) >= 1.0 else "nominal",
            },
            {
                "parameter": "Significant Wave Height",
                "unit": "m",
                "baseline": base_wave,
                "simulated": sim_wave,
                "delta": round(sim_wave - base_wave, 2),
                "severity": "critical" if sim_wave >= 3.5 else "high" if sim_wave >= 2.5 else "moderate" if sim_wave >= 1.5 else "nominal",
            },
            {
                "parameter": "Wind Speed",
                "unit": "m/s (kts)",
                "baseline": f"{base_wind:g} ({round(base_wind * 1.94384, 1)} kts)",
                "simulated": f"{sim_wind:g} ({round(sim_wind * 1.94384, 1)} kts)",
                "delta": f"{round(sim_wind - base_wind, 2):g} m/s",
                "severity": "critical" if sim_wind >= 20.8 else "high" if sim_wind >= 13.9 else "moderate" if sim_wind >= 8.0 else "nominal",
            },
            {
                "parameter": "Marine Safety Index (MSI)",
                "unit": "/100",
                "baseline": f"{baseline_msi['score']} ({baseline_msi['tier_label']})",
                "simulated": f"{simulated_msi['score']} ({simulated_msi['tier_label']})",
                "delta": f"{msi_delta_int:+d} pts",
                "severity": "critical" if simulated_msi["tier"] == "critical" else "high" if simulated_msi["tier"] == "high_risk" else "moderate" if simulated_msi["tier"] == "caution" else "nominal",
            },
        ]

        # 8. Actionable recommendations based on simulated state
        recs = self._generate_recommendations(simulated_msi, vessel_advisories, species_impacts)

        summary = (
            f"Scenario Simulation indicates an MSI shift of {msi_delta_int:+d} points "
            f"({baseline_msi['tier_label']} -> {simulated_msi['tier_label']}). "
            f"SST at {sim_sst:g}°C, waves at {sim_wave:g}m, wind at {round(sim_wind * 1.94384, 1)} kts."
        )

        return {
            "status": "simulated",
            "scenario_summary": summary,
            "perturbations_applied": {
                "delta_sst_c": delta_sst,
                "delta_wave_m": delta_wave,
                "delta_wind_mps": delta_wind,
                "wind_multiplier": wind_mult,
                "target_wind_mps": target_wind,
                "target_wave_m": target_wave,
                "storm_condition": sim_cond,
            },
            "baseline": {
                "sst_c": base_sst,
                "wave_height_m": base_wave,
                "wave_period_s": base_period,
                "wind_speed_mps": base_wind,
                "condition": base_cond,
                "msi": baseline_msi,
            },
            "simulated": {
                "sst_c": sim_sst,
                "wave_height_m": sim_wave,
                "wave_period_s": sim_period,
                "wind_speed_mps": sim_wind,
                "condition": sim_cond,
                "msi": simulated_msi,
            },
            "msi_delta": msi_delta_int,
            "comparison_matrix": comparison_matrix,
            "species_impacts": species_impacts,
            "vessel_advisories": vessel_advisories,
            "port_impact": port_impact,
            "recommendations": recs,
            "location": location,
            "location_name": location.get("label") or location.get("name") or "Coastal Waters",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def _simulate_fisheries(base_sst: float, sim_sst: float) -> list[dict[str, Any]]:
        results = []
        # Indian Oil Sardine (Sardinella longiceps)
        if sim_sst > 29.5:
            results.append({
                "species": "Indian Oil Sardine (Sardinella longiceps)",
                "thermal_status": "Threshold Exceeded (Upper Limit 29.5°C)",
                "impact": "Dispersal downwards (>40m) & southward migration into deeper thermocline strata.",
                "catch_projection": "Surface purse-seine & ring-seine catch projected to decline by 50% to 70%.",
                "severity": "critical" if sim_sst >= 30.5 else "high",
            })
        elif sim_sst < 26.0:
            results.append({
                "species": "Indian Oil Sardine (Sardinella longiceps)",
                "thermal_status": "Cold Water Intrusion",
                "impact": "Shallow schooling concentrated near upwelling margins.",
                "catch_projection": "Moderate coastal aggregation.",
                "severity": "moderate",
            })
        else:
            results.append({
                "species": "Indian Oil Sardine (Sardinella longiceps)",
                "thermal_status": "Within Optimal Range (27.0 - 29.2°C)",
                "impact": "Normal epipelagic shoaling behavior intact.",
                "catch_projection": "Catchability stable under standard operations.",
                "severity": "nominal",
            })

        # Indian Mackerel (Rastrelliger kanagurta)
        if sim_sst > 30.0:
            results.append({
                "species": "Indian Mackerel (Rastrelliger kanagurta)",
                "thermal_status": "Thermal Stress (Threshold 29.8°C)",
                "impact": "Sub-surface descent away from heated surface layer; dispersal into offshore deeper waters.",
                "catch_projection": "Drift gillnet efficiency expected to decline by 35% to 50%.",
                "severity": "high",
            })
        else:
            results.append({
                "species": "Indian Mackerel (Rastrelliger kanagurta)",
                "thermal_status": "Within Thermal Envelope",
                "impact": "Normal feeding along plankton abundance fronts.",
                "catch_projection": "Standard commercial catchability.",
                "severity": "nominal",
            })

        # Skipjack / Yellowfin Tuna (Thunnus albacares)
        if sim_sst > 30.2:
            results.append({
                "species": "Yellowfin & Skipjack Tuna (Thunnus albacares)",
                "thermal_status": "Pelagic Boundary Shift",
                "impact": "Tuna schools migrate offshore toward shelf break (200m contour) and dynamic thermal fronts.",
                "catch_projection": "Nearshore longline catch declines; offshore oceanic fishing recommended.",
                "severity": "moderate",
            })
        else:
            results.append({
                "species": "Yellowfin & Skipjack Tuna (Thunnus albacares)",
                "thermal_status": "Favorable Oceanographic Conditions",
                "impact": "Active schooling along shelf fronts.",
                "catch_projection": "Normal oceanic yield expected.",
                "severity": "nominal",
            })

        return results

    @staticmethod
    def _simulate_vessels(wave: float, wind: float, condition: str) -> list[dict[str, Any]]:
        c = condition.lower()
        is_squall = "thunderstorm" in c or "squall" in c or "cyclone" in c

        # Category 1: Traditional Non-motorized / Catamaran
        if wave >= 1.5 or wind >= 10.0 or is_squall:
            cat1_status = "PROHIBITED"
            cat1_reason = "Extreme capsizing risk in choppy/rough seas or squally wind."
            cat1_badge = "prohibited"
        elif wave >= 1.0 or wind >= 7.0:
            cat1_status = "CAUTION"
            cat1_reason = "Marginal operations; stay within 3 nautical miles of shore."
            cat1_badge = "caution"
        else:
            cat1_status = "SAFE"
            cat1_reason = "Calm sea and gentle breeze; suitable for coastal operations."
            cat1_badge = "safe"

        # Category 2: Motorized Craft (< 12m)
        if wave >= 2.2 or wind >= 13.9 or is_squall:
            cat2_status = "PROHIBITED"
            cat2_reason = "High wave swamping risk; small craft warning issued."
            cat2_badge = "prohibited"
        elif wave >= 1.5 or wind >= 9.5:
            cat2_status = "CAUTION"
            cat2_reason = "Moderate chop; life jackets mandatory; stay within VHF range."
            cat2_badge = "caution"
        else:
            cat2_status = "SAFE"
            cat2_reason = "Sea state within standard operating limits."
            cat2_badge = "safe"

        # Category 3: Mechanized Trawlers & Deep-Sea (> 12m)
        if wave >= 4.0 or wind >= 20.8 or "cyclone" in c:
            cat3_status = "PROHIBITED"
            cat3_reason = "Severe sea state 6+; all maritime traffic must seek sheltered anchorage."
            cat3_badge = "prohibited"
        elif wave >= 2.5 or wind >= 14.0 or is_squall:
            cat3_status = "CAUTION"
            cat3_reason = "Heavy rolling; deck operations hazardous; proceed with caution."
            cat3_badge = "caution"
        else:
            cat3_status = "SAFE"
            cat3_reason = "Standard open-sea transit safe."
            cat3_badge = "safe"

        return [
            {
                "category": "Traditional / Non-Motorized Craft",
                "status": cat1_status,
                "badge": cat1_badge,
                "advisory": cat1_reason,
            },
            {
                "category": "Motorized Fishing Boats (<12m)",
                "status": cat2_status,
                "badge": cat2_badge,
                "advisory": cat2_reason,
            },
            {
                "category": "Mechanized Trawlers (>12m)",
                "status": cat3_status,
                "badge": cat3_badge,
                "advisory": cat3_reason,
            },
        ]

    @staticmethod
    def _simulate_port(wave: float, wind: float, condition: str) -> dict[str, Any]:
        c = condition.lower()
        if wave >= 3.0 or wind >= 18.0 or "cyclone" in c:
            status = "RESTRICTED / SUSPENDED"
            level = "critical"
            advisory = "Pilot boarding suspended; harbor navigation channel closed due to severe swell & cross-wind."
        elif wave >= 2.0 or wind >= 12.0 or "squall" in c:
            status = "CAUTIONARY OPERATIONS"
            level = "moderate"
            advisory = "Tug assistance mandatory for berthing; surging risk at open quays."
        else:
            status = "NORMAL OPERATIONS"
            level = "low"
            advisory = "Harbor approaches clear; standard navigational transit and berthing active."

        return {
            "status": status,
            "risk_level": level,
            "advisory": advisory,
            "surge_hazard": "High" if wave >= 2.2 else "Low",
        }

    @staticmethod
    def _generate_recommendations(sim_msi: dict, vessels: list[dict], species: list[dict]) -> list[dict[str, Any]]:
        recs = []
        if sim_msi["tier"] in {"critical", "hazardous"}:
            recs.append({
                "action": "Issue Immediate Marine Weather Advisory & Suspend Small Craft Operations",
                "rationale": f"Simulated MSI dropped into Hazardous/Critical tier ({sim_msi['score']}/100).",
                "priority": "critical",
                "confidence": 0.95,
                "next_steps": [
                    "Broadcast VHF Channel 16 alert to local fishing fleets.",
                    "Halt departure clearances for non-mechanized and motorized craft < 12m.",
                    "Recall inshore craft to designated safe harbors.",
                ],
            })
        elif sim_msi["tier"] in {"high_risk", "caution", "marginal"}:
            recs.append({
                "action": "Enforce Precautionary Sea Protocol",
                "rationale": f"Simulated conditions produce Marginal/Caution safety score ({sim_msi['score']}/100).",
                "priority": "moderate",
                "confidence": 0.88,
                "next_steps": [
                    "Require mandatory life jacket wear for all active crews.",
                    "Instruct motorized craft to remain within 5 nautical miles of coastline.",
                ],
            })

        # Species recommendations
        degraded = [s for s in species if s["severity"] in {"high", "critical"}]
        if degraded:
            s_names = ", ".join(s["species"].split(" (")[0] for s in degraded)
            recs.append({
                "action": f"Adjust Pelagic Harvest Depth & Zones for {s_names}",
                "rationale": "SST exceedance induces vertical migration to cooler sub-surface strata (>40m).",
                "priority": "medium",
                "confidence": 0.90,
                "next_steps": [
                    "Switch from surface ring-nets to mid-water trawls or deeper bottom set-nets.",
                    "Target outer shelf upwelling boundaries where water temperature is 1.5 - 2.5°C cooler.",
                ],
            })

        if not recs:
            recs.append({
                "action": "Maintain Routine Marine Operations",
                "rationale": "Simulated conditions remain within optimal/safe operational parameters.",
                "priority": "low",
                "confidence": 0.92,
                "next_steps": ["Continue standard navigational monitoring."],
            })

        return recs

scenario_simulator = ScenarioSimulationService()
