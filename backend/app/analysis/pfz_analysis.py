"""Interpret caller-supplied PFZ spatial results; does not retrieve PFZ data."""

from typing import Any, Mapping


def assess_pfz(gis_result: Mapping[str, Any]) -> dict[str, Any]:
    """Summarize PFZ matches while preserving their supplied-data status."""
    if gis_result.get("data_status") == "unavailable":
        return {"summary": "PFZ data is unavailable.", "risk_score": None, "matches": []}
    layers = gis_result.get("results", {}).get("nearby", {})
    matches = layers.get("pfz", []) if isinstance(layers, Mapping) else []
    return {"summary": f"{len(matches)} supplied PFZ feature(s) are nearby.", "risk_score": 0.0, "matches": matches}
