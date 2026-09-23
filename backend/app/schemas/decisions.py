"""Machine-readable contracts for deterministic ORCA decision products."""

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field, field_validator
from app.schemas.common import Location
from app.gis.geometry import normalize_geometry

DecisionStatus = Literal["available", "partial", "unavailable"]
RiskLevel = Literal["low", "moderate", "high", "critical", "unavailable"]
Suitability = Literal["favorable", "moderate", "unfavorable", "unavailable"]


class DecisionEvidence(BaseModel):
    source: str
    data_type: str
    timestamp: datetime | None = None
    location: Location | None = None
    value: Any = None
    unit: str | None = None
    freshness: str | None = None
    provenance: dict[str, Any] = Field(default_factory=dict)


class MarineSafetyRequest(BaseModel):
    location: Location
    at: datetime | None = None


class SafetyDecisionResponse(BaseModel):
    status: DecisionStatus
    risk_level: RiskLevel
    assessment: str
    factors: list[str] = Field(default_factory=list)
    evidence: list[DecisionEvidence] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    unavailable_data: list[str] = Field(default_factory=list)
    time: datetime | None = None
    marine_safety_index: dict[str, Any] | None = None
    tide: dict[str, Any] | None = None


class PFZNearbyRequest(BaseModel):
    location: Location
    radius_km: float = Field(default=50, gt=0, le=500)
    at: datetime | None = None


class NearestSuitablePFZRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radius_km: float = Field(default=50.0, gt=0, le=500)


class NearestSuitablePFZResponse(BaseModel):
    selected_pfz: dict[str, Any] | None = None
    selected_geometry: dict[str, Any] | None = None
    distance_km: float | None = None
    requested_radius_km: float
    weather_status: str
    weather_evidence: dict[str, Any] = Field(default_factory=dict)
    ocean_status: str
    ocean_evidence: dict[str, Any] = Field(default_factory=dict)
    gis_status: str
    gis_evidence: dict[str, Any] = Field(default_factory=dict)
    overall_suitability: str
    reason: str
    candidate_pfzs: list[dict[str, Any]] = Field(default_factory=list)
    route_geometry: dict[str, Any] | None = None


class PFZFeatureResponse(BaseModel):
    id: int | str
    geometry: dict[str, Any] | None
    distance_km: float
    source: str
    source_identifier: str | None = None
    source_url: str | None = None
    observed_at: datetime | None = None
    freshness: str
    properties: dict[str, Any] = Field(default_factory=dict)
    suitability: Suitability = "unavailable"


class PFZDecisionResponse(BaseModel):
    status: DecisionStatus
    assessment: str
    suitability: Suitability
    risk_level: RiskLevel = "unavailable"
    features: list[PFZFeatureResponse] = Field(default_factory=list)
    evidence: list[DecisionEvidence] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    unavailable_data: list[str] = Field(default_factory=list)


class HazardDecisionResponse(BaseModel):
    status: DecisionStatus
    hazard_status: Literal["relevant_hazard_found", "no_relevant_hazard_found", "source_unavailable"]
    risk_level: RiskLevel
    assessment: str
    cyclones: list[dict[str, Any]] = Field(default_factory=list)
    evidence: list[DecisionEvidence] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    unavailable_data: list[str] = Field(default_factory=list)


class AnomalyDecisionResponse(BaseModel):
    status: DecisionStatus
    assessment: str
    anomaly_status: Literal["notable_condition", "no_notable_condition", "insufficient_reference_data", "source_unavailable"]
    evidence: list[DecisionEvidence] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    unavailable_data: list[str] = Field(default_factory=list)
    ecosystem_diagnosis: dict[str, Any] | None = None


class RouteDecisionRequest(BaseModel):
    origin: Location
    destination: Location
    route_geometry: dict[str, Any] | None = None
    at: datetime | None = None

    @field_validator("route_geometry")
    @classmethod
    def validate_route_geometry(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        return normalize_geometry(value) if value is not None else None


class RouteDecisionResponse(BaseModel):
    status: DecisionStatus
    assessment: str
    risk_level: RiskLevel
    route_geometry: dict[str, Any]
    distance_km: float | None = None
    hazard_segments: list[dict[str, Any]] = Field(default_factory=list)
    waypoints: list[dict[str, Any]] = Field(default_factory=list)
    estimated_travel_time: str | None = None
    marine_safety_index: dict[str, Any] | None = None
    evidence: list[DecisionEvidence] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    unavailable_data: list[str] = Field(default_factory=list)
    safer_alternatives_supported: bool = False
