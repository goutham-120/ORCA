from __future__ import annotations

"""Validated, application-owned contracts for LLM planning."""
from typing import Any, Literal
from pydantic import BaseModel, Field

class Subtask(BaseModel):
    id: str
    domain: Literal["ocean", "weather", "gis"]
    purpose: str
    evidence_required: list[str] = Field(default_factory=list)

class AgentExecutionStep(BaseModel):
    step: int
    agent: str
    action: str
    status: Literal["planned", "executing", "completed", "failed", "skipped"] = "completed"
    description: str
    details: dict[str, Any] = Field(default_factory=dict)
    timestamp: str | None = None

class ToolCallRecord(BaseModel):
    tool: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    summary: str
    status: str = "success"

class AgenticTrace(BaseModel):
    plan_intent: str
    reasoning_summary: str
    steps: list[AgentExecutionStep] = Field(default_factory=list)
    tools_called: list[ToolCallRecord] = Field(default_factory=list)

class QueryPlan(BaseModel):
    intent: str = "general"
    requested_domains: list[Literal["ocean", "weather", "gis", "pfz"]] = Field(default_factory=list)
    location_required: bool = False
    time_expression: str | None = None
    subtasks: list[Subtask] = Field(default_factory=list)
    response_focus: str = "clear conditions and limitations"
    decision_type: Literal["safety", "fishing", "pfz", "hazard", "route", "anomaly", "simulation"] | None = None
    trace: AgenticTrace | None = None

