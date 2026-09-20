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


class DetailedRouteAnalysisRequest(BaseModel):
    origin_latitude: float = Field(..., ge=-90, le=90)
    origin_longitude: float = Field(..., ge=-180, le=180)
    destination_latitude: float = Field(..., ge=-90, le=90)
    destination_longitude: float = Field(..., ge=-180, le=180)
    pfz_id: str | None = None


class DetailedRouteAnalysisResponse(BaseModel):
    status: str
    overall_status: str
    route_distance_km: float
    estimated_travel_time: str
    estimated_travel_time_hours: float | None = None
    route_geometry: dict[str, Any]
    alternative_used: bool = False
    gis_analysis: dict[str, Any]
    weather_analysis: dict[str, Any]
    wind_analysis: dict[str, Any]
    ocean_analysis: dict[str, Any]
    explanation: str
    detected_obstacles: list[str] = Field(default_factory=list)
    detected_risks: list[str] = Field(default_factory=list)

