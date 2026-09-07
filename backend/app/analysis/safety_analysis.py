"""Interpret GIS safety signals without performing geometry calculations."""

from typing import Any, Mapping


def assess_spatial_safety(gis_result: Mapping[str, Any]) -> dict[str, Any]:
    """Convert supplied GIS zone hits into a conservative safety signal."""
    if gis_result.get("data_status") == "unavailable":
        return {"summary": "Spatial safety data is unavailable.", "risk_score": None, "concerns": []}
    concerns = list(gis_result.get("concerns", []))
    return {"summary": "Spatial safety review completed." if not concerns else "Spatial safety concerns were found.", "risk_score": gis_result.get("risk_score", 0.0), "concerns": concerns}
