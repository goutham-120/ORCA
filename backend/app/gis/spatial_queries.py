"""Spatial feature queries independent of FastAPI and external providers."""

from __future__ import annotations

from typing import Any, Iterable, Mapping

from app.gis.geometry import bounding_box, distance_km, intersects, point
from app.gis.layers import GISFeature


def _features(features: Iterable[GISFeature | Mapping[str, Any]]) -> list[GISFeature]:
    return [item if isinstance(item, GISFeature) else GISFeature.from_mapping(item, f"feature-{index}") for index, item in enumerate(features)]


def features_in_bounding_box(features: Iterable[GISFeature | Mapping[str, Any]], bounds: tuple[float, float, float, float]) -> list[GISFeature]:
    """Return features whose bounding box intersects the supplied bounds."""
    min_x, min_y, max_x, max_y = bounds
    if min_x > max_x or min_y > max_y:
        raise ValueError("Bounding-box minima cannot exceed maxima.")
    return [feature for feature in _features(features) if _boxes_intersect(bounding_box(feature.geometry), bounds)]


def features_near_coordinate(features: Iterable[GISFeature | Mapping[str, Any]], latitude: float, longitude: float, radius_km: float) -> list[dict[str, Any]]:
    """Return Point features no farther than ``radius_km``, with distances."""
    if radius_km < 0:
        raise ValueError("Radius cannot be negative.")
    origin = point(latitude, longitude)
    results = []
    for feature in _features(features):
        if feature.geometry["type"] == "Point":
            distance = distance_km(origin, feature.geometry)
            if distance <= radius_km:
                results.append({"feature": feature, "distance_km": distance})
        elif intersects(feature.geometry, origin):
            results.append({"feature": feature, "distance_km": 0.0})
    return sorted(results, key=lambda item: item["distance_km"])


def coordinate_in_zone(features: Iterable[GISFeature | Mapping[str, Any]], latitude: float, longitude: float) -> list[GISFeature]:
    """Return zones containing or touching the specified coordinate."""
    candidate = point(latitude, longitude)
    return [feature for feature in _features(features) if intersects(feature.geometry, candidate)]


def intersecting_features(features: Iterable[GISFeature | Mapping[str, Any]], geometry: Mapping[str, Any]) -> list[GISFeature]:
    """Return features that intersect a supplied geometry."""
    return [feature for feature in _features(features) if intersects(feature.geometry, geometry)]


def _boxes_intersect(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> bool:
    return a[0] <= b[2] and a[2] >= b[0] and a[1] <= b[3] and a[3] >= b[1]
