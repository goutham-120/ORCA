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


def ensure_demo_gis(repository: SpatialFeatureRepository = spatial_features) -> int:
    """Seed a small labelled GIS dataset once, without touching live records."""
    try:
        existing = repository.list(source=DEMO_SOURCE)
        if existing:
            return 0
        records = (
            _feature("ORCA_DEMO_GIS", "marine_areas", "demo-marine-vizag", {
                "type": "Polygon", "coordinates": [[[83.05, 17.55], [83.45, 17.55], [83.45, 17.88], [83.05, 17.88], [83.05, 17.55]]]
            }, "Visakhapatnam demonstration marine area", DEMO_SOURCE),
            _feature("ORCA_DEMO_GIS", "restricted_zones", "demo-restricted-vizag", {
                "type": "Polygon", "coordinates": [[[83.16, 17.67], [83.25, 17.67], [83.25, 17.74], [83.16, 17.74], [83.16, 17.67]]]
            }, "Demonstration restricted/safety area", DEMO_SOURCE),
            _feature("ORCA_DEMO_GIS", "hazards", "demo-hazard-vizag", {
                "type": "Polygon", "coordinates": [[[83.28, 17.62], [83.38, 17.62], [83.38, 17.71], [83.28, 17.71], [83.28, 17.62]]]
            }, "Demonstration route hazard area", DEMO_SOURCE),
        )
        for record in records:
            repository.create(record)
        return len(records)
    except Exception:
        return 0


def replace_demo_pfz(repository: SpatialFeatureRepository = spatial_features) -> int:
    """Persist fallback PFZ points when the official INCOIS feed cannot be read."""
    try:
        repository.delete_source_dataset("PFZ", PFZ_DEMO_SOURCE)
        records = (
            _feature("PFZ", "pfz", "demo-pfz-vizag-1", {
                "type": "Point", "coordinates": [83.2185, 17.6868]
            }, "PFZ demonstration point near Visakhapatnam", PFZ_DEMO_SOURCE),
            _feature("PFZ", "pfz", "demo-pfz-vizag-2", {
                "type": "Point", "coordinates": [83.305, 17.635]
            }, "PFZ demonstration point off Visakhapatnam", PFZ_DEMO_SOURCE),
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
