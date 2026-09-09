"""Summarize authorized PFZ evidence without inventing fishing guidance."""

from typing import Any, Mapping


def assess_pfz(gis_result: Mapping[str, Any]) -> dict[str, Any]:
    """Summarize PFZ matches from either GIS nearby results or decision output."""
    if gis_result.get("status") == "unavailable" or gis_result.get("data_status") == "unavailable":
        return {"summary": "PFZ data is unavailable.", "risk_score": None, "matches": [], "suitability": "unavailable"}
    if isinstance(gis_result.get("features"), list):
        matches = gis_result["features"]
    else:
        layers = gis_result.get("results", {}).get("nearby", {})
        matches = layers.get("pfz", []) if isinstance(layers, Mapping) else []
    suitability = gis_result.get("suitability", "unavailable")
    return {"summary": f"{len(matches)} authorized PFZ feature(s) are nearby.", "risk_score": 0.0, "matches": matches, "suitability": suitability}
