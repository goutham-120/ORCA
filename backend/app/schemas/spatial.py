"""Portable spatial-data contracts for provider and persistence layers."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.gis.geometry import normalize_geometry

SpatialStatus = Literal["live", "cached", "stale", "unavailable"]


class SpatialProvenance(BaseModel):
    source: str = Field(min_length=1, max_length=255)
    source_identifier: str | None = Field(default=None, max_length=255)
    source_url: HttpUrl | None = None
    observed_at: datetime | None = None
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    fetched_at: datetime | None = None
    freshness_status: SpatialStatus = "unavailable"
    confidence: float | None = Field(default=None, ge=0, le=1)
    quality: dict[str, Any] = Field(default_factory=dict)


class SpatialFeatureCreate(SpatialProvenance):
    dataset: str = Field(min_length=1, max_length=128)
    layer: str | None = Field(default=None, max_length=128)
    geometry: dict[str, Any] | None = None
    properties: dict[str, Any] = Field(default_factory=dict)

    @field_validator("geometry")
    @classmethod
    def validate_geometry(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        return normalize_geometry(value) if value is not None else None

    @field_validator("valid_to")
    @classmethod
    def validate_time_range(cls, value: datetime | None, info: Any) -> datetime | None:
        valid_from = info.data.get("valid_from")
        if value is not None and valid_from is not None and value < valid_from:
            raise ValueError("valid_to must be at or after valid_from.")
        return value


class SpatialFeatureRecord(SpatialFeatureCreate):
    id: int
    geometry_type: str | None = None
    updated_at: datetime | None = None
