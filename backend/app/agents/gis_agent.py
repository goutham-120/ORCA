"""Coordinate spatial tools and return structured, provenance-aware GIS results."""

from __future__ import annotations

from typing import Any, Mapping

from app.tools.gis_tools import GISTool


class GISAgent:
    name = "gis"

    def __init__(self, tools: GISTool | None = None) -> None:
        self.tools = tools or GISTool()

    def interpret(self, context: Mapping[str, Any]) -> dict[str, Any]:
        """Perform the requested local spatial operation using supplied layer data only."""
        location = context.get("location")
        query = str(context.get("query", "")).lower()
        layers = self.tools.layers_from_context(context)
        if not isinstance(location, Mapping):
            return self._unavailable("A valid location is required for GIS analysis.", layers)
        try:
            coordinate = self.tools.validate_coordinate(location.get("latitude"), location.get("longitude"))
        except ValueError as exc:
            return self._unavailable(str(exc), layers)
        latitude, longitude = coordinate["latitude"], coordinate["longitude"]
        if not layers:
            return self._unavailable("No source-backed GIS layers are loaded for this request. Import or synchronize an authorized layer before relying on spatial results.", layers, coordinate)
        operations: dict[str, Any] = {"coordinate": coordinate["geometry"]}
        if any(term in query for term in ("near", "distance", "nearby")):
            radius = context.get("metadata", {}).get("gis_radius_km", 25) if isinstance(context.get("metadata"), Mapping) else 25
            try:
                operations["nearby"] = self.tools.nearby(layers, latitude, longitude, float(radius))
            except (TypeError, ValueError) as exc:
                return self._unavailable(f"Invalid GIS search radius: {exc}", layers, coordinate)
        zone_hits = self.tools.zones_at(layers, latitude, longitude)
        if any(zone_hits.values()) or any(term in query for term in ("hazard", "restricted", "zone", "safe", "boundary")):
            operations["zones_at_location"] = zone_hits
        route = context.get("metadata", {}).get("route_geometry") if isinstance(context.get("metadata"), Mapping) else None
        if route and any(term in query for term in ("route", "path", "navigate", "voyage")):
            try:
                operations["route_intersections"] = self.tools.route_intersections(route, layers)
            except ValueError as exc:
                return self._unavailable(f"Invalid route geometry: {exc}", layers, coordinate)
        matches = sum(
            len(items)
            for operation in ("nearby", "zones_at_location", "route_intersections")
            for items in operations.get(operation, {}).values()
            if isinstance(items, list)
        )
        restricted = len(zone_hits.get("restricted_zones", []))
        hazards = len(zone_hits.get("hazards", []))
        risk = max(0.7 if restricted else 0.0, 0.6 if hazards else 0.0)
        source_status = self._source_status(layers)
        return {"summary": f"GIS checked {len(layers)} source-backed layer(s); {matches} spatial match(es) found.", "risk_score": risk, "concerns": (["Location is inside a supplied restricted zone."] if restricted else []) + (["Location is inside a supplied hazard zone."] if hazards else []), "data_status": source_status, "available": source_status != "unavailable", "operation": self._operation_name(query), "results": operations, "layer_metadata": [{"id": layer.id, "source_status": layer.source_status, "source": layer.source, "available": layer.available} for layer in layers.values()]}

    @staticmethod
    def _source_status(layers: Mapping[str, Any]) -> str:
        statuses = {layer.source_status for layer in layers.values() if layer.available}
        for status in ("live", "cached", "static", "stale"):
            if status in statuses:
                return status
        return "unavailable"

    def _unavailable(self, message: str, layers: Mapping[str, Any], coordinate: Mapping[str, Any] | None = None) -> dict[str, Any]:
        return {"summary": message, "risk_score": None, "concerns": [], "data_status": "unavailable", "available": False, "operation": "unavailable", "results": {"coordinate": coordinate.get("geometry") if coordinate else None}, "layer_metadata": [{"id": layer.id, "source_status": layer.source_status, "source": layer.source, "available": layer.available} for layer in layers.values()]}

    @staticmethod
    def _operation_name(query: str) -> str:
        if any(term in query for term in ("route", "path", "navigate", "voyage")):
            return "route_intersection"
        if any(term in query for term in ("near", "distance", "nearby")):
            return "proximity"
        return "zone_check"
