"""Database-backed spatial query primitives for persisted spatial features."""

from __future__ import annotations

from datetime import datetime
from math import cos, hypot, pi
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
        origin_geojson = {"type": "Point", "coordinates": [longitude, latitude]}
        try:
            origin = geojson_to_shapely(origin_geojson)
        except RuntimeError:
            origin = None
        results = []
        for record in self.repository.list(**filters):
            if record.geometry is None:
                continue
            if origin is not None:
                geometry = geojson_to_shapely(record.geometry)
                distance = origin.distance(geometry) * 111.32
            else:
                # INCOIS PFZ features are commonly MultiLineStrings.  Nearby
                # map lookups must still work in the SQLite/dev environment
                # when the optional Shapely dependency is not installed.
                distance = _distance_to_geojson_km(latitude, longitude, record.geometry)
            if distance is None:
                continue
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


def _distance_to_geojson_km(latitude: float, longitude: float, geometry: Mapping[str, Any]) -> float | None:
    """Return point-to-GeoJSON distance for common line/polygon PFZ geometries.

    This is a local fallback for proximity filtering only. It uses an
    equirectangular projection centered on the queried coordinate, which is
    appropriate for the API's bounded (maximum 500 km) nearby search.
    """
    coordinates = geometry.get("coordinates")
    kind = geometry.get("type")
    if kind == "Point" and _coordinate(coordinates):
        return _point_distance_km(latitude, longitude, _coordinate(coordinates))
    lines = _lines(kind, coordinates)
    if not lines:
        return None
    return min(
        _point_to_segment_distance_km(latitude, longitude, first, second)
        for line in lines
        for first, second in zip(line, line[1:])
    )


def _lines(kind: Any, coordinates: Any) -> list[list[tuple[float, float]]]:
    if kind == "LineString":
        return [_coordinates(coordinates)]
    if kind in {"MultiLineString", "Polygon"}:
        return [_coordinates(line) for line in coordinates or []]
    if kind == "MultiPolygon":
        return [_coordinates(line) for polygon in coordinates or [] for line in polygon]
    return []


def _coordinates(values: Any) -> list[tuple[float, float]]:
    return [coordinate for item in values or [] if (coordinate := _coordinate(item)) is not None]


def _coordinate(value: Any) -> tuple[float, float] | None:
    if not isinstance(value, (list, tuple)) or len(value) < 2:
        return None
    try:
        longitude, latitude = float(value[0]), float(value[1])
    except (TypeError, ValueError):
        return None
    return (longitude, latitude) if -180 <= longitude <= 180 and -90 <= latitude <= 90 else None


def _point_distance_km(latitude: float, longitude: float, coordinate: tuple[float, float]) -> float:
    return _point_to_segment_distance_km(latitude, longitude, coordinate, coordinate)


def _point_to_segment_distance_km(latitude: float, longitude: float, first: tuple[float, float], second: tuple[float, float]) -> float:
    """Point-to-segment distance in a query-centred local metric projection."""
    km_per_radian = 6371.0088
    latitude_scale = km_per_radian * pi / 180
    longitude_scale = latitude_scale * cos(latitude * pi / 180)
    ax, ay = (first[0] - longitude) * longitude_scale, (first[1] - latitude) * latitude_scale
    bx, by = (second[0] - longitude) * longitude_scale, (second[1] - latitude) * latitude_scale
    dx, dy = bx - ax, by - ay
    denominator = dx * dx + dy * dy
    ratio = 0.0 if denominator == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / denominator))
    return hypot(ax + ratio * dx, ay + ratio * dy)
