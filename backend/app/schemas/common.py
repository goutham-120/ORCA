from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str


class MessageResponse(BaseModel):
    message: str


class Location(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    label: str | None = None


class EvidenceItem(BaseModel):
    source: str
    summary: str
    url: str | None = None
    observed_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
