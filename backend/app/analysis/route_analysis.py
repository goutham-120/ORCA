"""Interpret route-intersection output produced by GIS tools."""

from typing import Any, Mapping


def assess_route(gis_result: Mapping[str, Any]) -> dict[str, Any]:
    """Report whether a supplied route intersects supplied hazard layers."""
    if gis_result.get("data_status") == "unavailable":
        return {"summary": "Route GIS data is unavailable.", "risk_score": None, "intersections": {}}
    intersections = gis_result.get("results", {}).get("route_intersections", {})
    count = sum(len(items) for items in intersections.values()) if isinstance(intersections, Mapping) else 0
    return {"summary": f"Route intersects {count} supplied zone feature(s).", "risk_score": 0.7 if count else 0.0, "intersections": intersections}
