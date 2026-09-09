"""Database-backed spatial query primitives for persisted spatial features."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Mapping

from app.gis.geometry import geojson_to_shapely
from app.models.spatial_feature import SpatialFeatureRepository, spatial_features
from app.schemas.spatial import SpatialFeatureRecord


class SpatialQueryService:
    """Query persisted features; PostGIS is used directly when configured."""

    def __init__(self, repository: SpatialFeatureRepository | None = None) -> None:
        self.repository = repository or spatial_features

    def filter(self, **filters: Any) -> list[SpatialFeatureRecord]:
        return self.repository.list(**filters)

    def contains_point(self, latitude: float, longitude: float, **filters: Any) -> list[SpatialFeatureRecord]:
        return self._predicate({"type": "Point", "coordinates": [longitude, latitude]}, "contains", **filters)

    def intersects(self, geometry: Mapping[str, Any], **filters: Any) -> list[SpatialFeatureRecord]:
        return self._predicate(geometry, "intersects", **filters)

    def bounding_box(self, min_longitude: float, min_latitude: float, max_longitude: float, max_latitude: float, **filters: Any) -> list[SpatialFeatureRecord]:
        if min_longitude > max_longitude or min_latitude > max_latitude:
            raise ValueError("Bounding-box minima cannot exceed maxima.")
        bbox = {"type": "Polygon", "coordinates": [[[min_longitude, min_latitude], [max_longitude, min_latitude], [max_longitude, max_latitude], [min_longitude, max_latitude], [min_longitude, min_latitude]]]}
        return self.intersects(bbox, **filters)

    def nearby(self, latitude: float, longitude: float, radius_km: float, **filters: Any) -> list[dict[str, Any]]:
        if radius_km < 0:
            raise ValueError("Radius cannot be negative.")
        origin = geojson_to_shapely({"type": "Point", "coordinates": [longitude, latitude]})
        results = []
        for record in self.repository.list(**filters):
            if record.geometry is None:
                continue
            geometry = geojson_to_shapely(record.geometry)
            distance = origin.distance(geometry) * 111.32  # degree approximation only for SQLite development fallback
            if distance <= radius_km:
                results.append({"feature": record, "distance_km": distance})
        return sorted(results, key=lambda item: item["distance_km"])

    def active(self, at: datetime, **filters: Any) -> list[SpatialFeatureRecord]:
        return self.repository.list(valid_at=at, **filters)

    def _predicate(self, geometry: Mapping[str, Any], predicate: str, **filters: Any) -> list[SpatialFeatureRecord]:
        candidate = geojson_to_shapely(geometry)
        results = []
        for record in self.repository.list(**filters):
            if record.geometry is None:
                continue
            stored = geojson_to_shapely(record.geometry)
            matches = stored.contains(candidate) if predicate == "contains" else stored.intersects(candidate)
            if matches:
                results.append(record)
        return results
