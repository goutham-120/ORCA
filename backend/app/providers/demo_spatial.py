"""Explicit, non-operational spatial data used when a live feed is unavailable.

These records exist solely to keep the GIS/PFZ demonstration usable in a
development or judging environment.  They travel through the same repository
as provider records and are never represented as a live advisory.
"""

from __future__ import annotations

from datetime import datetime, timezone

from app.models.spatial_feature import SpatialFeatureRepository, spatial_features
from app.schemas.spatial import SpatialFeatureCreate


DEMO_SOURCE = "ORCA static demonstration dataset"
PFZ_DEMO_SOURCE = "ORCA static PFZ demonstration dataset"


def _feature(dataset: str, layer: str, identifier: str, geometry: dict, name: str, source: str) -> SpatialFeatureCreate:
    now = datetime.now(timezone.utc)
    return SpatialFeatureCreate(
        dataset=dataset,
        layer=layer,
        geometry=geometry,
        properties={
            "name": name,
            "demo": True,
            "data_status": "demo",
            "source_type": "demo",
            "notice": "Non-operational demonstration data; do not use for navigation or fishing decisions.",
        },
        source=source,
        source_identifier=identifier,
        observed_at=now,
        fetched_at=now,
        freshness_status="demo",
        quality={"source_type": "demo", "purpose": "ORCA GIS/PFZ demonstration"},
    )


import math


def _make_circle_polygon(center_lon: float, center_lat: float, radius_km: float, num_points: int = 24) -> dict[str, Any]:
    """Generate smooth circular polygon coordinates in EPSG:4326."""
    lat_rad = math.radians(center_lat)
    d_lat = radius_km / 111.0
    d_lon = radius_km / (111.0 * max(0.1, math.cos(lat_rad)))

    coords = []
    for i in range(num_points):
        angle = 2.0 * math.pi * i / num_points
        lon = round(center_lon + d_lon * math.cos(angle), 5)
        lat = round(center_lat + d_lat * math.sin(angle), 5)
        coords.append([lon, lat])
    coords.append(coords[0])  # Close the ring
    return {"type": "Polygon", "coordinates": [coords]}


def ensure_demo_gis(repository: SpatialFeatureRepository = spatial_features) -> int:
    """Seed comprehensive coastal and deep offshore GIS features with round geometries."""
    try:
        existing = repository.list(source=DEMO_SOURCE)
        if existing:
            return 0
        records = (
            # 1. Visakhapatnam coastal & nearshore (Smooth round zones in marine waters)
            _feature(
                "ORCA_DEMO_GIS",
                "marine_areas",
                "demo-marine-vizag",
                _make_circle_polygon(83.36, 17.68, radius_km=18.0),
                "Visakhapatnam coastal marine monitoring area",
                DEMO_SOURCE,
            ),
            _feature(
                "ORCA_DEMO_GIS",
                "restricted_zones",
                "demo-restricted-vizag",
                _make_circle_polygon(83.30, 17.68, radius_km=5.0),
                "Visakhapatnam naval base & inner harbor security zone",
                DEMO_SOURCE,
            ),
            _feature(
                "ORCA_DEMO_GIS",
                "hazards",
                "demo-hazard-vizag",
                _make_circle_polygon(83.35, 17.65, radius_km=5.5),
                "Visakhapatnam harbor approach shallow shoal & dredging hazard",
                DEMO_SOURCE,
            ),

            # 2. Deep Offshore Bay of Bengal & Krishna-Godavari (KG Basin)
            _feature(
                "ORCA_DEMO_GIS",
                "restricted_zones",
                "demo-restricted-naval-bob",
                _make_circle_polygon(85.05, 17.75, radius_km=60.0),
                "Deep Offshore Naval & Missile Firing Range (Bay of Bengal)",
                DEMO_SOURCE,
            ),
            _feature(
                "ORCA_DEMO_GIS",
                "restricted_zones",
                "demo-restricted-kg-basin",
                _make_circle_polygon(82.55, 16.32, radius_km=28.0),
                "KG Basin Deepwater Offshore Platform 500m Safety Exclusion Zone",
                DEMO_SOURCE,
            ),
            _feature(
                "ORCA_DEMO_GIS",
                "hazards",
                "demo-hazard-deepsea-swell",
                _make_circle_polygon(84.20, 17.10, radius_km=32.0),
                "Offshore High-Wave Convergence & Bathymetric Shelf Hazard",
                DEMO_SOURCE,
            ),

            # 3. Chennai Coastal & Offshore Shipping Lane (TSS)
            _feature(
                "ORCA_DEMO_GIS",
                "marine_areas",
                "demo-marine-chennai",
                _make_circle_polygon(80.30, 13.10, radius_km=20.0),
                "Chennai Port & Coastal Anchorage Area",
                DEMO_SOURCE,
            ),
            _feature(
                "ORCA_DEMO_GIS",
                "hazards",
                "demo-hazard-chennai-shipping",
                _make_circle_polygon(80.50, 13.18, radius_km=14.0),
                "Chennai Offshore Commercial Shipping Traffic Separation Scheme (TSS)",
                DEMO_SOURCE,
            ),

            # 4. Mumbai Offshore & Mumbai High Oilfield
            _feature(
                "ORCA_DEMO_GIS",
                "restricted_zones",
                "demo-restricted-mumbai-high",
                _make_circle_polygon(71.50, 19.48, radius_km=35.0),
                "Mumbai High Deep Offshore Oilfield Mandatory Security Zone",
                DEMO_SOURCE,
            ),
            _feature(
                "ORCA_DEMO_GIS",
                "hazards",
                "demo-hazard-mumbai-shoal",
                _make_circle_polygon(72.72, 18.98, radius_km=12.0),
                "Prongs Reef & Coastal Navigation Hazard Area",
                DEMO_SOURCE,
            ),
        )
        for record in records:
            repository.create(record)
        return len(records)
    except Exception:
        return 0


def replace_demo_pfz(repository: SpatialFeatureRepository = spatial_features) -> int:
    """Persist fallback PFZ points across monitoring areas when the official INCOIS feed cannot be read."""
    try:
        repository.delete_source_dataset("PFZ", PFZ_DEMO_SOURCE)
        records = (
            _feature("PFZ", "pfz", "demo-pfz-vizag-1", {
                "type": "Point", "coordinates": [83.42, 17.68]
            }, "PFZ offshore demonstration point (Visakhapatnam)", PFZ_DEMO_SOURCE),
            _feature("PFZ", "pfz", "demo-pfz-vizag-2", {
                "type": "Point", "coordinates": [83.48, 17.55]
            }, "PFZ offshore shelf edge track (Visakhapatnam)", PFZ_DEMO_SOURCE),
            _feature("PFZ", "pfz", "demo-pfz-chennai-1", {
                "type": "Point", "coordinates": [80.38, 12.65]
            }, "PFZ demonstration point off Chennai", PFZ_DEMO_SOURCE),
            _feature("PFZ", "pfz", "demo-pfz-mumbai-1", {
                "type": "Point", "coordinates": [72.55, 18.95]
            }, "PFZ demonstration point off Mumbai", PFZ_DEMO_SOURCE),
        )
        for record in records:
            repository.create(record.model_copy(update={
                "properties": {
                    **record.properties,
                    "advisory_date": "Static demonstration dataset",
                    "valid_until": "Not an operational advisory",
                    "source": PFZ_DEMO_SOURCE,
                }
            }))
        return len(records)
    except Exception:
        return 0
