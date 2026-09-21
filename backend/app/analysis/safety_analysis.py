"""
Interpret GIS safety signals and compute Marine Safety Index (MSI).
"""

from typing import Any, Mapping
from app.analysis.safety_index import compute_marine_safety_index


def assess_spatial_safety(gis_result: Mapping[str, Any]) -> dict[str, Any]:
    """Convert supplied GIS zone hits into a conservative safety signal."""
    if gis_result.get("data_status") == "unavailable":
        return {"summary": "Spatial safety data is unavailable.", "risk_score": None, "concerns": []}
    concerns = list(gis_result.get("concerns", []))
    return {
        "summary": "Spatial safety review completed." if not concerns else "Spatial safety concerns were found.",
        "risk_score": gis_result.get("risk_score", 0.0),
        "concerns": concerns,
    }


def assess_marine_safety_index(
    wave_height_m: float | None = None,
    wave_period_s: float | None = None,
    wind_speed_mps: float | None = None,
    precipitation_mm: float | None = None,
    weather_condition: str | None = None,
    visibility_km: float | None = None,
) -> dict[str, Any]:
    """Compute comprehensive continuous 0-100 Marine Safety Index (MSI)."""
    return compute_marine_safety_index(
        wave_height_m=wave_height_m,
        wave_period_s=wave_period_s,
        wind_speed_mps=wind_speed_mps,
        precipitation_mm=precipitation_mm,
        weather_condition=weather_condition,
        visibility_km=visibility_km,
    )
