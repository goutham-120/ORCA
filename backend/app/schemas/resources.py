from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


class AlertResponse(BaseModel):
    id: str
    title: str
    severity: Literal["low", "medium", "high", "critical"]
    status: str
    created_at: datetime
    details: dict[str, Any] = Field(default_factory=dict)


class AlertListResponse(BaseModel):
    items: list[AlertResponse]


class ReportCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    query_id: str | None = None
    content: dict[str, Any] = Field(default_factory=dict)


class ReportResponse(BaseModel):
    id: str
    title: str
    query_id: str | None = None
    created_at: datetime
    content: dict[str, Any] = Field(default_factory=dict)


class ReportListResponse(BaseModel):
    items: list[ReportResponse]
