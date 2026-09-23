"""Produce context-aware, maritime-grounded recommendations from normalized assessments."""

from typing import Any


def build_recommendations(
    assessment: dict[str, Any],
    results: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Return tailored operational recommendations reflecting true marine risk and domain evidence."""
    level = assessment.get("level", "unknown")
    results = results or {}

    # Extract domain specifics if available
    ocean_res = results.get("ocean") if isinstance(results.get("ocean"), dict) else {}
    weather_res = results.get("weather") if isinstance(results.get("weather"), dict) else {}
    gis_res = results.get("gis") if isinstance(results.get("gis"), dict) else {}

    ocean_obs = ocean_res.get("observation") if isinstance(ocean_res.get("observation"), dict) else {}
    weather_obs = weather_res.get("observation") if isinstance(weather_res.get("observation"), dict) else {}

    wave = ocean_obs.get("wave_height_m")
    period = ocean_obs.get("wave_period_s")
    wind = weather_obs.get("wind_speed_mps")
    condition = str(weather_obs.get("condition") or "").lower()
    concerns = [
        *(ocean_res.get("concerns") or []),
        *(weather_res.get("concerns") or []),
        *(gis_res.get("concerns") or []),
    ]

    recs: list[dict[str, Any]] = []

    if level == "unknown":
        incomplete = assessment.get("incomplete_domains", [])
        domains_str = f" ({', '.join(incomplete)})" if incomplete else ""
        recs.append({
            "action": f"Acquire live telemetry for missing data domains{domains_str} before making navigation decisions.",
            "rationale": assessment.get("summary", "Awaiting complete data stream."),
            "priority": "advisory",
            "confidence": 0.3,
            "next_steps": ["Refresh provider connection", "Verify GPS / geographic coordinates"],
        })
        return recs

    if level == "critical":
        recs.append({
            "action": "Immediate Halt: Suspend all maritime operations, cancel departures, and seek sheltered harbor.",
            "rationale": "Severe conditions detected posing critical threat to vessel safety and crew.",
            "priority": "critical",
            "confidence": 0.95,
            "next_steps": ["Secure harbor moorings", "Maintain 24h VHF Channel 16 radio guard", "Notify local coast guard / port authority"],
        })
        if "thunderstorm" in condition or (isinstance(wind, (int, float)) and wind >= 17):
            recs.append({
                "action": "Implement storm-force mooring protocols and stay clear of open deck areas.",
                "rationale": "Extreme convective winds or gale force gusts reported.",
                "priority": "critical",
                "confidence": 0.9,
                "next_steps": ["Double stern and bow lines", "Disengage electrical masts during lightning"],
            })
        return recs

    if level == "high":
        primary_action = "Delay departure or revise voyage plan until sea and atmospheric conditions improve."
        if "thunderstorm" in condition:
            primary_action = "Postpone departure immediately — convective thunderstorm with severe gust and lightning hazard."
        elif isinstance(wave, (int, float)) and wave >= 2.5:
            primary_action = "Restrict navigation to sheltered waters — high wave swell exceeds safe threshold for small craft."
        elif isinstance(wind, (int, float)) and wind >= 13.9:
            primary_action = "Small Craft Warning: Near-gale force winds active; avoid offshore transit."

        recs.append({
            "action": primary_action,
            "rationale": assessment.get("summary", "High risk conditions observed across environmental sensors."),
            "priority": "high",
            "confidence": 0.85,
            "next_steps": ["Monitor local weather radar", "Check hourly INCOIS / IMD marine bulletins", "Keep distress EPIRB on standby"],
        })
        recs.append({
            "action": "Ensure all crew wear SOLAS-approved lifejackets and secure all loose cargo and fishing gear.",
            "rationale": "Rough sea action and wind surges can cause sudden vessel rolling and wash-over.",
            "priority": "high",
            "confidence": 0.8,
            "next_steps": ["Inspect bilge pumps", "Verify VHF Channel 16 reception"],
        })
        return recs

    if level == "moderate":
        primary_action = "Proceed with caution — advisory in effect for small fishing craft and recreational boats."
        if isinstance(period, (int, float)) and period >= 12:
            primary_action = "Exercise caution in coastal shallows — long-period swell creates heavy surf and breaker hazards."
        elif isinstance(wave, (int, float)) and wave >= 1.25:
            primary_action = "Moderate sea chop: Maintain reduced cruising speed and avoid overloaded decks."

        recs.append({
            "action": primary_action,
            "rationale": assessment.get("summary", "Elevated wind or wave parameters require heightened watchkeeping."),
            "priority": "moderate",
            "confidence": 0.75,
            "next_steps": ["Maintain continuous visual lookout", "Keep within coastal VHF coverage range", "Monitor barometric pressure trends"],
        })
        recs.append({
            "action": "Review return route options in case conditions deteriorate further offshore.",
            "rationale": "Moderate conditions can transition quickly if wind shifts or tides turn.",
            "priority": "moderate",
            "confidence": 0.7,
            "next_steps": ["Identify alternate sheltered inlets", "Check latest hourly forecast updates"],
        })
        return recs

    # level == "low"
    recs.append({
        "action": "Favorable conditions: Safe for routine maritime transit, coastal fishing, and port maneuvers.",
        "rationale": assessment.get("summary", "Environmental parameters are well within standard operational thresholds."),
        "priority": "low",
        "confidence": 0.85,
        "next_steps": ["Maintain standard navigational watch", "Log voyage plan with port operations", "Enjoy optimal sea conditions"],
    })
    recs.append({
        "action": "Conduct pre-departure safety checklist (VHF radio, life jackets, navigational lights).",
        "rationale": "Standard maritime best practice to ensure safety readiness during favorable weather.",
        "priority": "low",
        "confidence": 0.8,
        "next_steps": ["Inspect fuel and battery reserves", "Check bilge water levels"],
    })

    return recs
