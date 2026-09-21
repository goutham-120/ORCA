"""
Unified Marine Safety Index (MSI) Calculation Engine.

Computes an explainable 0–100 continuous safety index combining multi-parameter
meteorological and oceanographic factors:
- Significant Wave Height & Wave Period (shoaling / breaker risk) [35%]
- Wind Speed & Gusts (aerodynamic drag / capsizing risk) [30%]
- Convective Hazards, Thunderstorms, Lightning & Heavy Rain [20%]
- Navigational Visibility / Fog [15%]

Safety Tiers:
- 85 - 100: Safe / Optimal (Green)
- 65 - 84:  Moderate / Caution (Yellow)
- 40 - 64:  Rough / High Risk (Orange)
- 0  - 39:  Critical / Storm Force Warning (Red)
"""

from __future__ import annotations

import math
from typing import Any, Mapping


def compute_marine_safety_index(
    wave_height_m: float | None = None,
    wave_period_s: float | None = None,
    wind_speed_mps: float | None = None,
    precipitation_mm: float | None = None,
    weather_condition: str | None = None,
    visibility_km: float | None = None,
) -> dict[str, Any]:
    """
    Calculate the unified Marine Safety Index (MSI) from available ocean/weather inputs.
    Returns score (0-100), tier ('safe', 'caution', 'high_risk', 'critical'),
    sub-scores, and factor penalties.
    """
    penalties: list[dict[str, Any]] = []
    available_factors = 0
    total_factors = 4

    # 1. Wave Safety Factor (0 - 35 points)
    wave_score = 35.0
    if wave_height_m is not None and isinstance(wave_height_m, (int, float)):
        available_factors += 1
        h = max(0.0, float(wave_height_m))
        if h < 0.8:
            wave_score = 35.0
        elif h < 1.5:
            # 0.8m to 1.5m -> 35 to 28
            wave_score = 35.0 - ((h - 0.8) / 0.7) * 7.0
        elif h < 2.5:
            # 1.5m to 2.5m -> 28 to 15
            wave_score = 28.0 - ((h - 1.5) / 1.0) * 13.0
            penalties.append({
                "factor": "wave_height",
                "severity": "moderate",
                "message": f"Moderate wave swell ({h:.1f} m) creates choppy sea conditions.",
            })
        elif h < 4.0:
            # 2.5m to 4.0m -> 15 to 4
            wave_score = 15.0 - ((h - 2.5) / 1.5) * 11.0
            penalties.append({
                "factor": "wave_height",
                "severity": "high",
                "message": f"High wave height ({h:.1f} m) exceeds safe thresholds for small craft.",
            })
        else:
            wave_score = max(0.0, 4.0 - (h - 4.0) * 2.0)
            penalties.append({
                "factor": "wave_height",
                "severity": "critical",
                "message": f"Very rough / hazardous sea state ({h:.1f} m) with extreme capsizing risk.",
            })

        # Period penalty: Long period swells (>= 12s) increase coastal breaker shoaling
        if wave_period_s is not None and isinstance(wave_period_s, (int, float)) and wave_period_s >= 12.0:
            period_penalty = min(6.0, (float(wave_period_s) - 10.0) * 1.5)
            wave_score = max(0.0, wave_score - period_penalty)
            penalties.append({
                "factor": "swell_period",
                "severity": "moderate",
                "message": f"Long-period swell ({wave_period_s:.1f} s) poses heavy surf & breaker hazard in shallows.",
            })
    else:
        wave_score = 25.0  # neutral assumption when missing

    # 2. Wind Safety Factor (0 - 30 points)
    wind_score = 30.0
    if wind_speed_mps is not None and isinstance(wind_speed_mps, (int, float)):
        available_factors += 1
        w = max(0.0, float(wind_speed_mps))
        if w < 5.5:  # < ~10 knots
            wind_score = 30.0
        elif w < 8.0:  # ~10 - 15 knots
            wind_score = 30.0 - ((w - 5.5) / 2.5) * 5.0
        elif w < 13.9:  # ~15 - 27 knots (Fresh to Strong Breeze)
            wind_score = 25.0 - ((w - 8.0) / 5.9) * 13.0
            penalties.append({
                "factor": "wind_speed",
                "severity": "moderate",
                "message": f"Elevated wind speed ({w:.1f} m/s / {w*3.6:.0f} km/h) generates wind chop.",
            })
        elif w < 20.8:  # ~27 - 40 knots (Near Gale to Gale)
            wind_score = 12.0 - ((w - 13.9) / 6.9) * 9.0
            penalties.append({
                "factor": "wind_speed",
                "severity": "high",
                "message": f"Near-gale force winds ({w:.1f} m/s / {w*3.6:.0f} km/h); small craft advisory.",
            })
        else:
            wind_score = 0.0
            penalties.append({
                "factor": "wind_speed",
                "severity": "critical",
                "message": f"Storm/Gale force wind speed ({w:.1f} m/s / {w*3.6:.0f} km/h); extreme navigational danger.",
            })
    else:
        wind_score = 22.0

    # 3. Convective & Precipitation Safety Factor (0 - 20 points)
    weather_score = 20.0
    cond_str = (weather_condition or "").lower()
    is_convective = any(term in cond_str for term in ("thunderstorm", "squall", "lightning", "cyclone", "hail"))

    if precipitation_mm is not None and isinstance(precipitation_mm, (int, float)):
        available_factors += 1
        p = max(0.0, float(precipitation_mm))
        if is_convective:
            weather_score = 2.0
            penalties.append({
                "factor": "convective_hazard",
                "severity": "critical",
                "message": f"Severe convective storm / thunderstorm ({cond_str}) with lightning risk.",
            })
        elif p >= 20.0:
            weather_score = 5.0
            penalties.append({
                "factor": "precipitation",
                "severity": "high",
                "message": f"Heavy rain ({p:.1f} mm) causing severe deck flooding and visibility loss.",
            })
        elif p >= 5.0:
            weather_score = 12.0
            penalties.append({
                "factor": "precipitation",
                "severity": "moderate",
                "message": f"Moderate precipitation ({p:.1f} mm) reducing operational visibility.",
            })
        else:
            weather_score = 20.0
    elif is_convective:
        available_factors += 1
        weather_score = 2.0
        penalties.append({
            "factor": "convective_hazard",
            "severity": "critical",
            "message": f"Severe convective condition detected ({cond_str}).",
        })
    else:
        weather_score = 16.0

    # 4. Visibility & Atmospheric Safety Factor (0 - 15 points)
    vis_score = 15.0
    if "fog" in cond_str or "rime" in cond_str:
        available_factors += 1
        vis_score = 6.0
        penalties.append({
            "factor": "visibility",
            "severity": "moderate",
            "message": "Dense fog / reduced maritime visibility.",
        })
    elif visibility_km is not None and isinstance(visibility_km, (int, float)):
        available_factors += 1
        v = float(visibility_km)
        if v < 1.0:
            vis_score = 3.0
            penalties.append({
                "factor": "visibility",
                "severity": "high",
                "message": f"Critical low visibility ({v:.1f} km).",
            })
        elif v < 5.0:
            vis_score = 9.0
            penalties.append({
                "factor": "visibility",
                "severity": "moderate",
                "message": f"Moderate visibility ({v:.1f} km).",
            })
        else:
            vis_score = 15.0
    else:
        vis_score = 12.0

    # Aggregate Total Score
    total_raw_score = wave_score + wind_score + weather_score + vis_score
    final_score = round(max(0.0, min(100.0, total_raw_score)), 1)

    # Determine Safety Tier
    if final_score >= 85.0:
        tier = "safe"
        tier_label = "Optimal / Safe"
        color = "#10B981"  # Emerald green
        suitability = "favorable"
    elif final_score >= 65.0:
        tier = "caution"
        tier_label = "Caution / Moderate"
        color = "#F59E0B"  # Amber
        suitability = "moderate"
    elif final_score >= 40.0:
        tier = "high_risk"
        tier_label = "High Risk / Rough"
        color = "#F97316"  # Orange
        suitability = "unfavorable"
    else:
        tier = "critical"
        tier_label = "Critical Danger / Storm"
        color = "#EF4444"  # Red
        suitability = "unfavorable"

    confidence = round(min(1.0, available_factors / total_factors), 2)

    return {
        "score": final_score,
        "tier": tier,
        "tier_label": tier_label,
        "suitability": suitability,
        "color": color,
        "confidence": confidence,
        "factors_breakdown": {
            "wave_score": round(wave_score, 1),
            "wave_max": 35.0,
            "wind_score": round(wind_score, 1),
            "wind_max": 30.0,
            "weather_score": round(weather_score, 1),
            "weather_max": 20.0,
            "visibility_score": round(vis_score, 1),
            "visibility_max": 15.0,
        },
        "penalties": penalties,
    }
