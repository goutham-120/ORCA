from typing import Any
from pydantic import BaseModel, Field
from app.schemas.common import Location


class MapLayer(BaseModel):
    id: str
    name: str
    layer_type: str
    description: str
    available: bool = True
    features: list[dict[str, Any]] = Field(default_factory=list)


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
