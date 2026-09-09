"""Validated, application-owned contracts for LLM planning."""
from typing import Literal
from pydantic import BaseModel, Field

class Subtask(BaseModel):
    id: str
    domain: Literal["ocean", "weather", "gis"]
    purpose: str
    evidence_required: list[str] = Field(default_factory=list)

class QueryPlan(BaseModel):
    intent: str = "general"
    requested_domains: list[Literal["ocean", "weather", "gis", "pfz"]] = Field(default_factory=list)
    location_required: bool = False
    time_expression: str | None = None
    subtasks: list[Subtask] = Field(default_factory=list)
    response_focus: str = "clear conditions and limitations"
