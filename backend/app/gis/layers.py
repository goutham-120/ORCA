"""Layer models for supplied GIS data; no layer in this module is live data."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping

from app.gis.geometry import Geometry, normalize_geometry


@dataclass(frozen=True)
class GISFeature:
    """A validated feature supplied by a caller or a future GIS provider."""

    id: str
    geometry: Geometry
    properties: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any], fallback_id: str = "feature") -> "GISFeature":
        return cls(id=str(value.get("id", value.get("properties", {}).get("id", fallback_id))), geometry=normalize_geometry(value), properties=dict(value.get("properties") or {}))

    def as_dict(self) -> dict[str, Any]:
        return {"id": self.id, "geometry": self.geometry, "properties": self.properties}


@dataclass
class GISLayer:
    """A named GIS layer with explicit provenance and availability."""

    id: str
    name: str
    layer_type: str
    description: str
    features: list[GISFeature] = field(default_factory=list)
    source_status: str = "unavailable"
    source: str | None = None

    @property
    def available(self) -> bool:
        return bool(self.features)

    @classmethod
    def from_mapping(cls, layer_id: str, value: Mapping[str, Any]) -> "GISLayer":
        raw_features = value.get("features", [])
        features = [item if isinstance(item, GISFeature) else GISFeature.from_mapping(item, f"{layer_id}-{index}") for index, item in enumerate(raw_features) if isinstance(item, Mapping)]
        status = str(value.get("source_status", "static" if features else "unavailable"))
        return cls(id=str(value.get("id", layer_id)), name=str(value.get("name", layer_id.replace("_", " ").title())), layer_type=str(value.get("layer_type", "vector")), description=str(value.get("description", "Caller-supplied GIS layer.")), features=features, source_status=status, source=value.get("source"))


def layer_catalog() -> list[GISLayer]:
    """Describe ORCA's supported layer classes without inventing any features."""
    return [
        GISLayer("hazards", "Hazards", "vector", "Hazard zones supplied by a GIS source."),
        GISLayer("restricted_zones", "Restricted zones", "vector", "Marine restrictions supplied by a GIS source."),
        GISLayer("marine_areas", "Marine areas", "vector", "Marine-area boundaries supplied by a GIS source."),
        GISLayer("pfz", "Potential fishing zones", "vector", "PFZ geometries supplied by an authorized source."),
        GISLayer("routes", "Routes and waypoints", "vector", "Route or waypoint geometries supplied by a caller."),
    ]


def normalize_layers(raw_layers: Mapping[str, Any] | Iterable[GISLayer] | None) -> dict[str, GISLayer]:
    """Convert caller-provided layer data into a layer-id mapping."""
    if raw_layers is None:
        return {}
    if isinstance(raw_layers, Mapping):
        return {str(layer_id): value if isinstance(value, GISLayer) else GISLayer.from_mapping(str(layer_id), value) for layer_id, value in raw_layers.items() if isinstance(value, (GISLayer, Mapping))}
    return {layer.id: layer for layer in raw_layers if isinstance(layer, GISLayer)}
