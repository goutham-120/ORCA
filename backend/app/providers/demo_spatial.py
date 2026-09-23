"""Explicit, non-operational spatial data used when a live feed is unavailable.

These records exist solely to keep the GIS/PFZ demonstration usable in a
development or judging environment. They travel through the same repository
as provider records and are never represented as a live advisory.
"""

from __future__ import annotations

from datetime import datetime, timezone
import math
from typing import Any

from app.models.spatial_feature import SpatialFeatureRepository, spatial_features
from app.schemas.spatial import SpatialFeatureCreate


DEMO_SOURCE = "ORCA static demonstration dataset"
PFZ_DEMO_SOURCE = "ORCA static PFZ demonstration dataset"


def _feature(dataset: str, layer: str, identifier: str, geometry: dict, name: str, source: str, properties: dict | None = None) -> SpatialFeatureCreate:
    now = datetime.now(timezone.utc)
    base_props = {
        "name": name,
        "demo": True,
        "data_status": "demo",
        "source_type": "demo",
        "notice": "Non-operational demonstration data; do not use for navigation or fishing decisions.",
    }
    if properties:
        base_props.update(properties)

    return SpatialFeatureCreate(
        dataset=dataset,
        layer=layer,
        geometry=geometry,
        properties=base_props,
        source=source,
        source_identifier=identifier,
        observed_at=now,
        fetched_at=now,
        freshness_status="demo",
        quality={"source_type": "demo", "purpose": "ORCA GIS/PFZ demonstration"},
    )


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
        if not existing:
            records = (
                # 1. Visakhapatnam coastal & nearshore
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
        if not existing:
            for record in records:
                repository.create(record)

            # Ensure PFZs are also seeded
            pfz_records = repository.list(dataset="PFZ")
            if not pfz_records:
                replace_demo_pfz(repository)

            return len(records)

        return 0
    except Exception:
        return 0


def replace_demo_pfz(repository: SpatialFeatureRepository = spatial_features) -> int:
    """Persist rich fallback PFZ tracks and points across all coastal sectors of India."""
    try:
        repository.delete_source_dataset("PFZ", PFZ_DEMO_SOURCE)
        records = (
            # 1. Visakhapatnam & North AP Sector (Bay of Bengal)
            _feature("PFZ", "pfz", "demo-pfz-vizag-track", {
                "type": "LineString", "coordinates": [[83.35, 17.62], [83.42, 17.70], [83.50, 17.78]]
            }, "Visakhapatnam Offshore Shelf PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 45, "sst_c": 28.2, "bearing_deg": 110}),
            _feature("PFZ", "pfz", "demo-pfz-vizag-point-1", {
                "type": "Point", "coordinates": [83.42, 17.68]
            }, "PFZ Shelf Edge Point (Visakhapatnam)", PFZ_DEMO_SOURCE, {"depth_m": 50, "sst_c": 28.1}),

            # 2. Kakinada & Godavari Delta (Andhra Pradesh)
            _feature("PFZ", "pfz", "demo-pfz-kakinada-track", {
                "type": "LineString", "coordinates": [[82.35, 16.92], [82.42, 17.02], [82.50, 17.15]]
            }, "Godavari Plume Frontal PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 38, "sst_c": 28.5, "bearing_deg": 120}),

            # 3. Chennai / Kasimedu Sector (Coromandel Coast, Tamil Nadu)
            _feature("PFZ", "pfz", "demo-pfz-chennai-track", {
                "type": "LineString", "coordinates": [[80.33, 12.85], [80.38, 13.05], [80.45, 13.25]]
            }, "Coromandel Coast Oceanic PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 40, "sst_c": 28.6, "bearing_deg": 95}),
            _feature("PFZ", "pfz", "demo-pfz-chennai-point", {
                "type": "Point", "coordinates": [80.38, 13.08]
            }, "Kasimedu Offshore PFZ Zone", PFZ_DEMO_SOURCE, {"depth_m": 38, "sst_c": 28.5}),

            # 4. Nagapattinam & Palk Bay (Tamil Nadu)
            _feature("PFZ", "pfz", "demo-pfz-nagapattinam-track", {
                "type": "LineString", "coordinates": [[79.95, 10.65], [80.05, 10.78], [80.15, 10.92]]
            }, "Palk Bay Pelagic PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 32, "sst_c": 28.9, "bearing_deg": 85}),

            # 5. Tuticorin & Gulf of Mannar (Tamil Nadu)
            _feature("PFZ", "pfz", "demo-pfz-tuticorin-track", {
                "type": "LineString", "coordinates": [[78.25, 8.68], [78.35, 8.80], [78.48, 8.95]]
            }, "Gulf of Mannar Thermal PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 42, "sst_c": 28.7, "bearing_deg": 115}),

            # 6. Cochin / Munambam Sector (Kerala)
            _feature("PFZ", "pfz", "demo-pfz-cochin-track", {
                "type": "LineString", "coordinates": [[76.05, 9.80], [76.12, 9.95], [76.20, 10.12]]
            }, "Malabar Upwelling PFZ Convergence Track", PFZ_DEMO_SOURCE, {"depth_m": 35, "sst_c": 28.3, "bearing_deg": 260}),
            _feature("PFZ", "pfz", "demo-pfz-cochin-point", {
                "type": "Point", "coordinates": [76.12, 9.92]
            }, "Cochin Offshore Pelagic PFZ", PFZ_DEMO_SOURCE, {"depth_m": 36, "sst_c": 28.2}),

            # 7. Neendakara & Kollam Sector (Kerala)
            _feature("PFZ", "pfz", "demo-pfz-kollam-track", {
                "type": "LineString", "coordinates": [[76.40, 8.82], [76.48, 8.95], [76.58, 9.08]]
            }, "Wadge Bank Transition PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 48, "sst_c": 28.1, "bearing_deg": 240}),

            # 8. Mangalore & Malpe Sector (Karnataka)
            _feature("PFZ", "pfz", "demo-pfz-mangalore-track", {
                "type": "LineString", "coordinates": [[74.65, 12.75], [74.72, 12.90], [74.80, 13.05]]
            }, "Karnataka Shelf Pelagic PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 38, "sst_c": 28.1, "bearing_deg": 250}),

            # 9. Goa & Karwar Sector
            _feature("PFZ", "pfz", "demo-pfz-goa-track", {
                "type": "LineString", "coordinates": [[73.65, 15.25], [73.75, 15.40], [73.85, 15.55]]
            }, "Goa Offshore Sardine-Mackerel PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 44, "sst_c": 28.0, "bearing_deg": 255}),

            # 10. Mumbai / Sassoon Dock Sector (Maharashtra)
            _feature("PFZ", "pfz", "demo-pfz-mumbai-track", {
                "type": "LineString", "coordinates": [[72.48, 18.82], [72.56, 18.95], [72.65, 19.12]]
            }, "Konkan Shelf Pelagic PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 55, "sst_c": 27.8, "bearing_deg": 270}),
            _feature("PFZ", "pfz", "demo-pfz-mumbai-point", {
                "type": "Point", "coordinates": [72.55, 18.95]
            }, "Sassoon Dock Offshore PFZ Point", PFZ_DEMO_SOURCE, {"depth_m": 52, "sst_c": 27.7}),

            # 11. Ratnagiri Sector (Maharashtra)
            _feature("PFZ", "pfz", "demo-pfz-ratnagiri-track", {
                "type": "LineString", "coordinates": [[73.08, 16.92], [73.18, 17.05], [73.28, 17.20]]
            }, "Ratnagiri Frontal Convergence PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 50, "sst_c": 27.9, "bearing_deg": 260}),

            # 12. Veraval & Somnath Sector (Gujarat)
            _feature("PFZ", "pfz", "demo-pfz-veraval-track", {
                "type": "LineString", "coordinates": [[70.20, 20.75], [70.35, 20.88], [70.50, 21.02]]
            }, "Saurashtra Thermal Front PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 48, "sst_c": 27.4, "bearing_deg": 225}),

            # 13. Porbandar & Okha Sector (Gujarat)
            _feature("PFZ", "pfz", "demo-pfz-porbandar-track", {
                "type": "LineString", "coordinates": [[69.45, 21.50], [69.58, 21.65], [69.70, 21.80]]
            }, "Gulf of Kutch Approach PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 52, "sst_c": 27.2, "bearing_deg": 230}),

            # 14. Paradip & Jagatsinghpur Sector (Odisha)
            _feature("PFZ", "pfz", "demo-pfz-paradip-track", {
                "type": "LineString", "coordinates": [[86.80, 20.15], [86.92, 20.30], [87.05, 20.45]]
            }, "Odisha Shelf Frontal PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 42, "sst_c": 28.4, "bearing_deg": 135}),

            # 15. Puri & Chilika Sector (Odisha)
            _feature("PFZ", "pfz", "demo-pfz-puri-track", {
                "type": "LineString", "coordinates": [[85.78, 19.65], [85.90, 19.78], [86.02, 19.92]]
            }, "Chilika Plume Oceanic PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 36, "sst_c": 28.5, "bearing_deg": 130}),

            # 16. Digha & Sundarbans Sector (West Bengal)
            _feature("PFZ", "pfz", "demo-pfz-digha-track", {
                "type": "LineString", "coordinates": [[87.55, 21.45], [87.68, 21.58], [87.82, 21.72]]
            }, "Bengal Shelf Hilsa-Pomfret PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 28, "sst_c": 28.6, "bearing_deg": 140}),

            # 17. Port Blair Sector (Andaman & Nicobar)
            _feature("PFZ", "pfz", "demo-pfz-portblair-track", {
                "type": "LineString", "coordinates": [[92.75, 11.55], [92.85, 11.68], [92.95, 11.82]]
            }, "Andaman Deep Trench Pelagic Tuna PFZ Track", PFZ_DEMO_SOURCE, {"depth_m": 85, "sst_c": 29.1, "bearing_deg": 70}),
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
