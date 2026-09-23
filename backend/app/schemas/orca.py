from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field
from app.schemas.common import EvidenceItem, Location


class ChatMessageItem(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str

class OrcaQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    location: Location | None = None
    time_range: tuple[datetime | None, datetime | None] | None = None
    context: dict[str, Any] = Field(default_factory=dict)
    conversation_id: str | None = Field(default=None, max_length=120)
    language: str = Field(default="en", min_length=2, max_length=12)
    history: list[ChatMessageItem] = Field(default_factory=list)


class AssessmentResponse(BaseModel):
    level: Literal["low", "moderate", "high", "critical", "unknown"] = "unknown"
    summary: str
    factors: list[str] = Field(default_factory=list)
    score: float | None = Field(default=None, ge=0, le=1)


class RecommendationResponse(BaseModel):
    action: str
    rationale: str
    priority: Literal["low", "medium", "moderate", "high", "critical", "urgent", "advisory"] = "medium"
    confidence: float = Field(ge=0, le=1)
    next_steps: list[str] = Field(default_factory=list)


class OrcaQueryResponse(BaseModel):
    query_id: str
    answer: str
    intent: str
    agents_used: list[str] = Field(default_factory=list)
    assessment: AssessmentResponse | None = None
    recommendations: list[RecommendationResponse] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    created_at: datetime
    conversation_id: str | None = None
    language: str = "en"
    context: dict[str, Any] = Field(default_factory=dict)
    pending_domains: list[str] = Field(default_factory=list)
    unavailable_domains: list[str] = Field(default_factory=list)
    response_kind: Literal["general", "specialized"] = "specialized"
    selected_agents: list[str] = Field(default_factory=list)
    decision: dict[str, Any] | None = None
    execution_steps: list[dict[str, Any]] = Field(default_factory=list)
    trace: dict[str, Any] | None = None
    spatial_data: dict[str, Any] | None = None



class QueryHistoryItem(BaseModel):
    query_id: str
    query: str
    intent: str
    created_at: datetime


class QueryHistoryResponse(BaseModel):
    items: list[QueryHistoryItem]


class ScenarioSimulationRequest(BaseModel):
    location: Location
    delta_sst_c: float = 0.0
    delta_wave_m: float = 0.0
    delta_wind_mps: float = 0.0
    wind_multiplier: float = 1.0
    storm_condition: str | None = None


class ScenarioSimulationResponse(BaseModel):
    status: str
    scenario_summary: str
    perturbations_applied: dict[str, Any]
    baseline: dict[str, Any]
    simulated: dict[str, Any]
    msi_delta: int
    comparison_matrix: list[dict[str, Any]]
    species_impacts: list[dict[str, Any]]
    vessel_advisories: list[dict[str, Any]]
    port_impact: dict[str, Any]
    recommendations: list[dict[str, Any]]
    location: dict[str, Any]
    location_name: str | None = None
    timestamp: str

