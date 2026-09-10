from typing import Any
from pydantic import BaseModel, Field
from app.schemas.common import Location


class MapLayer(BaseModel):
    id: str
    name: str
    layer_type: str
    description: str
    available: bool = True
    feature_count: int = 0
    features: list[dict[str, Any]] = Field(default_factory=list)


class MapFeature(BaseModel):
    id: int
    layer: str | None = None
    dataset: str
    geometry: dict[str, Any] | None = None
    properties: dict[str, Any] = Field(default_factory=dict)
    source: str
    source_identifier: str | None = None
    source_url: str | None = None
    observed_at: Any | None = None
    freshness_status: str


class MapFeaturesResponse(BaseModel):
    features: list[MapFeature] = Field(default_factory=list)


class MapLayersResponse(BaseModel):
    layers: list[MapLayer]


class MapAnalysisRequest(BaseModel):
    location: Location
    analysis_type: str = Field(min_length=1, max_length=100)
    parameters: dict[str, Any] = Field(default_factory=dict)


class MapAnalysisResponse(BaseModel):
    status: str
    result: dict[str, Any] = Field(default_factory=dict)
    message: str


class RouteRequest(BaseModel):
    origin: Location
    destination: Location
    departure_time: str | None = None
    constraints: dict[str, Any] = Field(default_factory=dict)


class RouteResponse(BaseModel):
    status: str
    route: dict[str, Any] | None = None
    message: str
