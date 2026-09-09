"""Persistence adapter for normalised, real PFZ provider data."""

from typing import Any

from app.models.spatial_feature import SpatialFeatureRepository
from app.schemas.spatial import SpatialFeatureCreate


class PFZDataService:
    """Persists only successful PFZ provider results as EPSG:4326 spatial features."""

    def __init__(self, repository: SpatialFeatureRepository) -> None:
        self.repository = repository

    def persist(self, result: dict[str, Any]) -> list[Any]:
        if not result.get("available"):
            return []
        stored = []
        for zone in result.get("data", []):
            stored.append(self.repository.create(SpatialFeatureCreate(
                dataset="pfz", layer="potential_fishing_zone", geometry=zone["geometry"],
                properties=zone.get("properties", {}), source=result["provider"],
                source_identifier=zone.get("zone_identifier"), source_url=result["source_url"],
                observed_at=zone.get("observed_at"), valid_from=zone.get("valid_from"),
                valid_to=zone.get("valid_to"), fetched_at=result.get("fetched_at"),
                freshness_status=result["source_status"], quality=zone.get("quality", {}))))
        return stored
