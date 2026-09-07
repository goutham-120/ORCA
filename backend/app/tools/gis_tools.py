"""Tool boundary for deterministic, caller-supplied GIS operations."""

from __future__ import annotations

from typing import Any, Mapping

from app.gis.geometry import bounding_box_polygon, distance_km, intersects, point, validate_latitude_longitude
from app.gis.layers import GISLayer, normalize_layers
from app.gis.spatial_queries import coordinate_in_zone, features_in_bounding_box, features_near_coordinate, intersecting_features


class GISTool:
    """Expose spatial calculations without data retrieval or domain interpretation."""

    def validate_coordinate(self, latitude: Any, longitude: Any) -> dict[str, Any]:
        lat, lon = validate_latitude_longitude(latitude, longitude)
        return {"valid": True, "latitude": lat, "longitude": lon, "geometry": point(lat, lon)}

    def make_bounding_box(self, geometry: Mapping[str, Any], padding_degrees: float = 0.0) -> dict[str, Any]:
        return bounding_box_polygon(geometry, padding_degrees)

    def distance_between(self, first: Mapping[str, Any], second: Mapping[str, Any]) -> float:
        return distance_km(first, second)

    def geometries_intersect(self, first: Mapping[str, Any], second: Mapping[str, Any]) -> bool:
        return intersects(first, second)

    def layers_from_context(self, context: Mapping[str, Any]) -> dict[str, GISLayer]:
        metadata = context.get("metadata") if isinstance(context.get("metadata"), Mapping) else {}
        raw = metadata.get("gis_layers", context.get("gis_layers"))
        return normalize_layers(raw if isinstance(raw, (Mapping, list, tuple)) else None)

    def zones_at(self, layers: Mapping[str, GISLayer], latitude: float, longitude: float, layer_ids: tuple[str, ...] = ("hazards", "restricted_zones")) -> dict[str, list[dict[str, Any]]]:
        return {layer_id: [feature.as_dict() for feature in layers[layer_id].features and coordinate_in_zone(layers[layer_id].features, latitude, longitude)] for layer_id in layer_ids if layer_id in layers}

    def nearby(self, layers: Mapping[str, GISLayer], latitude: float, longitude: float, radius_km: float) -> dict[str, list[dict[str, Any]]]:
        return {layer_id: [{"feature": item["feature"].as_dict(), "distance_km": item["distance_km"]} for item in features_near_coordinate(layer.features, latitude, longitude, radius_km)] for layer_id, layer in layers.items()}

    def filter_by_bbox(self, layer: GISLayer, bounds: tuple[float, float, float, float]) -> list[dict[str, Any]]:
        return [feature.as_dict() for feature in features_in_bounding_box(layer.features, bounds)]

    def route_intersections(self, route: Mapping[str, Any], layers: Mapping[str, GISLayer], layer_ids: tuple[str, ...] = ("hazards", "restricted_zones")) -> dict[str, list[dict[str, Any]]]:
        return {layer_id: [feature.as_dict() for feature in intersecting_features(layers[layer_id].features, route)] for layer_id in layer_ids if layer_id in layers}
