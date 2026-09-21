"""
Investigation Analysis Module for GIS Provenance and Marine Ecosystem Diagnostics.
"""

from typing import Any, Mapping
from app.services.ecosystem_service import ecosystem_anomaly_service


def investigate_spatial_result(gis_result: Mapping[str, Any]) -> dict[str, Any]:
    """Return next steps that make unavailable or static GIS provenance explicit."""
    status = gis_result.get("data_status", "unavailable")
    if status == "unavailable":
        return {"status": status, "next_steps": ["Supply an authorized GIS layer or configure a GIS provider."]}
    return {"status": status, "next_steps": ["Verify caller-supplied static layer currency before operational use."]}


def investigate_ecosystem_anomaly(
    latitude: float,
    longitude: float,
    current_sst: float | None = None,
    current_chlorophyll: float | None = None,
    wind_speed_mps: float | None = None,
) -> dict[str, Any]:
    """Diagnose fish catch decline and ecosystem anomalies using Earth Observation baselines."""
    return ecosystem_anomaly_service.diagnose_productivity_decline(
        latitude=latitude,
        longitude=longitude,
        current_sst=current_sst,
        current_chlorophyll=current_chlorophyll,
        wind_speed_mps=wind_speed_mps,
    )
