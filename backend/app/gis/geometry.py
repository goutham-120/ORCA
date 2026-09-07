"""Deterministic GeoJSON-compatible geometry helpers.

Coordinates exposed by this module use GeoJSON order: ``[longitude, latitude]``.
"""

from __future__ import annotations

from math import asin, cos, radians, sin, sqrt
from typing import Any, Iterable, Mapping

Geometry = dict[str, Any]
Coordinate = tuple[float, float]  # longitude, latitude


def validate_latitude_longitude(latitude: Any, longitude: Any) -> tuple[float, float]:
    """Validate and return a latitude/longitude pair as floats."""
    if isinstance(latitude, bool) or isinstance(longitude, bool):
        raise ValueError("Latitude and longitude must be numeric.")
    try:
        lat, lon = float(latitude), float(longitude)
    except (TypeError, ValueError) as exc:
        raise ValueError("Latitude and longitude must be numeric.") from exc
    if not -90 <= lat <= 90 or not -180 <= lon <= 180:
        raise ValueError("Latitude must be between -90 and 90 and longitude between -180 and 180.")
    return lat, lon


def point(latitude: Any, longitude: Any) -> Geometry:
    """Create a validated GeoJSON Point from latitude/longitude input."""
    lat, lon = validate_latitude_longitude(latitude, longitude)
    return {"type": "Point", "coordinates": [lon, lat]}


def _coordinate(value: Any) -> Coordinate:
    if not isinstance(value, (list, tuple)) or len(value) < 2:
        raise ValueError("A coordinate must contain longitude and latitude.")
    lat, lon = validate_latitude_longitude(value[1], value[0])
    return lon, lat


def normalize_geometry(value: Mapping[str, Any]) -> Geometry:
    """Validate a GeoJSON Point, LineString, or Polygon and return a copy."""
    geometry = value.get("geometry", value) if isinstance(value, Mapping) else None
    if not isinstance(geometry, Mapping):
        raise ValueError("Geometry must be a mapping.")
    kind, coordinates = geometry.get("type"), geometry.get("coordinates")
    if kind == "Point":
        lon, lat = _coordinate(coordinates)
        return {"type": kind, "coordinates": [lon, lat]}
    if kind == "LineString":
        if not isinstance(coordinates, (list, tuple)) or len(coordinates) < 2:
            raise ValueError("A LineString needs at least two coordinates.")
        return {"type": kind, "coordinates": [list(_coordinate(item)) for item in coordinates]}
    if kind == "Polygon":
        if not isinstance(coordinates, (list, tuple)) or not coordinates:
            raise ValueError("A Polygon needs at least one ring.")
        rings: list[list[list[float]]] = []
        for ring in coordinates:
            if not isinstance(ring, (list, tuple)) or len(ring) < 3:
                raise ValueError("A polygon ring needs at least three coordinates.")
            normalized = [list(_coordinate(item)) for item in ring]
            if normalized[0] != normalized[-1]:
                normalized.append(normalized[0])
            if len(set(map(tuple, normalized[:-1]))) < 3:
                raise ValueError("A polygon ring needs three distinct coordinates.")
            rings.append(normalized)
        return {"type": kind, "coordinates": rings}
    raise ValueError("Supported geometry types are Point, LineString, and Polygon.")


def safe_normalize_geometry(value: Mapping[str, Any] | None) -> Geometry | None:
    """Return a normalized geometry or ``None`` for invalid input."""
    try:
        return normalize_geometry(value or {})
    except ValueError:
        return None


def bounding_box(value: Mapping[str, Any]) -> tuple[float, float, float, float]:
    """Return ``(min_longitude, min_latitude, max_longitude, max_latitude)``."""
    geometry = normalize_geometry(value)
    coords = list(_all_coordinates(geometry))
    return min(x for x, _ in coords), min(y for _, y in coords), max(x for x, _ in coords), max(y for _, y in coords)


def bounding_box_polygon(value: Mapping[str, Any], padding_degrees: float = 0.0) -> Geometry:
    """Create a Polygon representing a geometry's bounding box."""
    if padding_degrees < 0:
        raise ValueError("Bounding-box padding cannot be negative.")
    min_x, min_y, max_x, max_y = bounding_box(value)
    return {"type": "Polygon", "coordinates": [[[min_x - padding_degrees, min_y - padding_degrees], [max_x + padding_degrees, min_y - padding_degrees], [max_x + padding_degrees, max_y + padding_degrees], [min_x - padding_degrees, max_y + padding_degrees], [min_x - padding_degrees, min_y - padding_degrees]]]}


def distance_km(first: Mapping[str, Any], second: Mapping[str, Any]) -> float:
    """Calculate great-circle distance between two Point geometries in kilometres."""
    a, b = normalize_geometry(first), normalize_geometry(second)
    if a["type"] != "Point" or b["type"] != "Point":
        raise ValueError("Distance requires two Point geometries.")
    lon1, lat1 = a["coordinates"]
    lon2, lat2 = b["coordinates"]
    d_lat, d_lon = radians(lat2 - lat1), radians(lon2 - lon1)
    haversine = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    return 6371.0088 * 2 * asin(sqrt(haversine))


def contains_point(polygon: Mapping[str, Any], candidate: Mapping[str, Any]) -> bool:
    """Return whether a Point lies in a Polygon (including its boundary)."""
    poly, candidate_point = normalize_geometry(polygon), normalize_geometry(candidate)
    if poly["type"] != "Polygon" or candidate_point["type"] != "Point":
        raise ValueError("Containment requires a Polygon and a Point.")
    x, y = candidate_point["coordinates"]
    outer = poly["coordinates"][0]
    if not _point_in_ring(x, y, outer):
        return False
    return not any(_point_in_ring(x, y, ring) for ring in poly["coordinates"][1:])


def intersects(first: Mapping[str, Any], second: Mapping[str, Any]) -> bool:
    """Return whether supported Point, LineString, or Polygon geometries intersect."""
    a, b = normalize_geometry(first), normalize_geometry(second)
    if a["type"] == "Point" and b["type"] == "Point":
        return a["coordinates"] == b["coordinates"]
    if a["type"] == "Point" and b["type"] == "Polygon":
        return contains_point(b, a)
    if b["type"] == "Point" and a["type"] == "Polygon":
        return contains_point(a, b)
    if a["type"] == "Point":
        return _point_on_line(tuple(a["coordinates"]), _segments(b))
    if b["type"] == "Point":
        return _point_on_line(tuple(b["coordinates"]), _segments(a))
    if not _bbox_intersects(bounding_box(a), bounding_box(b)):
        return False
    if any(_segments_intersect(left, right) for left in _segments(a) for right in _segments(b)):
        return True
    if a["type"] == "Polygon" and b["type"] == "Polygon":
        return contains_point(a, {"type": "Point", "coordinates": b["coordinates"][0][0]}) or contains_point(b, {"type": "Point", "coordinates": a["coordinates"][0][0]})
    if a["type"] == "Polygon" and b["type"] == "LineString":
        return contains_point(a, {"type": "Point", "coordinates": b["coordinates"][0]})
    if b["type"] == "Polygon" and a["type"] == "LineString":
        return contains_point(b, {"type": "Point", "coordinates": a["coordinates"][0]})
    return False


def _all_coordinates(geometry: Geometry) -> Iterable[Coordinate]:
    if geometry["type"] == "Point":
        yield tuple(geometry["coordinates"])
    elif geometry["type"] == "LineString":
        yield from map(tuple, geometry["coordinates"])
    else:
        for ring in geometry["coordinates"]:
            yield from map(tuple, ring)


def _segments(geometry: Geometry) -> list[tuple[Coordinate, Coordinate]]:
    if geometry["type"] == "Point":
        return []
    lines = geometry["coordinates"] if geometry["type"] == "Polygon" else [geometry["coordinates"]]
    return [(tuple(line[index]), tuple(line[index + 1])) for line in lines for index in range(len(line) - 1)]


def _bbox_intersects(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> bool:
    return a[0] <= b[2] and a[2] >= b[0] and a[1] <= b[3] and a[3] >= b[1]


def _point_in_ring(x: float, y: float, ring: list[list[float]]) -> bool:
    inside = False
    for index in range(len(ring) - 1):
        a, b = tuple(ring[index]), tuple(ring[index + 1])
        if _point_on_line((x, y), [(a, b)]):
            return True
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
    return inside


def _point_on_line(point_value: Coordinate, segments: Iterable[tuple[Coordinate, Coordinate]]) -> bool:
    x, y = point_value
    for (x1, y1), (x2, y2) in segments:
        cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1)
        if abs(cross) < 1e-10 and min(x1, x2) - 1e-10 <= x <= max(x1, x2) + 1e-10 and min(y1, y2) - 1e-10 <= y <= max(y1, y2) + 1e-10:
            return True
    return False


def _segments_intersect(first: tuple[Coordinate, Coordinate], second: tuple[Coordinate, Coordinate]) -> bool:
    def orientation(a: Coordinate, b: Coordinate, c: Coordinate) -> float:
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    a, b, c, d = *first, *second
    o1, o2, o3, o4 = orientation(a, b, c), orientation(a, b, d), orientation(c, d, a), orientation(c, d, b)
    if o1 * o2 < 0 and o3 * o4 < 0:
        return True
    return _point_on_line(a, [second]) or _point_on_line(b, [second]) or _point_on_line(c, [first]) or _point_on_line(d, [first])
