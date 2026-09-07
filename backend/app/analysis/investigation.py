"""Build traceable investigation prompts from normalized GIS results."""

from typing import Any, Mapping


def investigate_spatial_result(gis_result: Mapping[str, Any]) -> dict[str, Any]:
    """Return next steps that make unavailable or static GIS provenance explicit."""
    status = gis_result.get("data_status", "unavailable")
    if status == "unavailable":
        return {"status": status, "next_steps": ["Supply an authorized GIS layer or configure a GIS provider."]}
    return {"status": status, "next_steps": ["Verify caller-supplied static layer currency before operational use."]}
