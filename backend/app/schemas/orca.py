from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field
from app.schemas.common import EvidenceItem, Location


class OrcaQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    location: Location | None = None
    time_range: tuple[datetime | None, datetime | None] | None = None
    context: dict[str, Any] = Field(default_factory=dict)


class AssessmentResponse(BaseModel):
    level: Literal["low", "moderate", "high", "critical", "unknown"] = "unknown"
    summary: str
    factors: list[str] = Field(default_factory=list)
    score: float | None = Field(default=None, ge=0, le=1)


class RecommendationResponse(BaseModel):
    action: str
    rationale: str
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    confidence: float = Field(ge=0, le=1)
    next_steps: list[str] = Field(default_factory=list)


class OrcaQueryResponse(BaseModel):
    query_id: str
    answer: str
    intent: str
    agents_used: list[str] = Field(default_factory=list)
    assessment: AssessmentResponse
    recommendations: list[RecommendationResponse] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    created_at: datetime


class QueryHistoryItem(BaseModel):
    query_id: str
    query: str
    intent: str
    created_at: datetime


class QueryHistoryResponse(BaseModel):
    items: list[QueryHistoryItem]
