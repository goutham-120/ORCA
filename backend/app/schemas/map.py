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
    id: int | str
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
    vessel_speed_knots: float = Field(default=12.0, gt=0, le=50)


class DetailedRouteAnalysisResponse(BaseModel):
    status: str
    overall_status: str
    route_distance_km: float
    route_distance_nm: float | None = None
    direct_distance_km: float | None = None
    estimated_travel_time: str
    estimated_travel_time_hours: float | None = None
    vessel_speed_knots: float | None = None
    estimated_fuel_liters: float | None = None
    fuel_delta_liters: float | None = None
    route_geometry: dict[str, Any]
    direct_geometry: dict[str, Any] | None = None
    alternative_used: bool = False
    waypoints: list[dict[str, Any]] = Field(default_factory=list)
    marine_safety_index: dict[str, Any] | None = None
    gis_analysis: dict[str, Any]
    weather_analysis: dict[str, Any]
    wind_analysis: dict[str, Any]
    ocean_analysis: dict[str, Any]
    explanation: str
    detected_obstacles: list[str] = Field(default_factory=list)
    detected_risks: list[str] = Field(default_factory=list)


class NavigateNearestPFZRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=150.0, gt=0, le=500)
    vessel_speed_knots: float = Field(default=12.0, gt=0, le=50)


class NavigateNearestPFZResponse(BaseModel):
    has_pfz: bool
    status: str
    message: str
    selected_pfz: dict[str, Any] | None = None
    distance_km: float | None = None
    distance_nm: float | None = None
    bearing_deg: float | None = None
    compass_heading: str | None = None
    route: DetailedRouteAnalysisResponse | None = None
    navigation_summary: dict[str, Any] = Field(default_factory=dict)
    land_transit: dict[str, Any] | None = None
    candidate_count: int = 0
    all_candidates: list[dict[str, Any]] = Field(default_factory=list)

