"""Persistent spatial feature repository; it never fetches external data."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from typing import Any

from app.database.database import Database
from app.database.session import database
from app.schemas.spatial import SpatialFeatureCreate, SpatialFeatureRecord

_POSTGRES_COLUMNS = """
id, dataset, layer, geometry_type, properties,
source, source_identifier, source_url, observed_at,
valid_from, valid_to, fetched_at, updated_at,
freshness_status, confidence, quality
"""

_SQLITE_COLUMNS = """
id, dataset, layer, geometry_type,
properties_json AS properties,
source, source_identifier, source_url, observed_at,
valid_from, valid_to, fetched_at, updated_at,
freshness_status, confidence,
quality_json AS quality
"""


class SpatialFeatureRepository:
    """Store/query provider-supplied spatial records with provenance metadata."""

    def __init__(self, db: Database | None = None) -> None:
        self.db = db or database

    def initialize(self) -> None:
        self.db.initialize()

    def create(self, feature: SpatialFeatureCreate) -> SpatialFeatureRecord:
        self.initialize()
        geometry_type = feature.geometry.get("type") if feature.geometry else None
        timestamp = datetime.now(timezone.utc).isoformat()
        if self.db.is_postgres:
            query = """INSERT INTO spatial_features (dataset, layer, geometry, geometry_type, properties, source, source_identifier, source_url, observed_at, valid_from, valid_to, fetched_at, updated_at, freshness_status, confidence, quality) VALUES (?, ?, CASE WHEN ? IS NULL THEN NULL ELSE ST_SetSRID(ST_GeomFromGeoJSON(?), 4326) END, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP, ?, ?, ?::jsonb) RETURNING """ + _COLUMNS + ", ST_AsGeoJSON(geometry) AS geometry"
            payload = json.dumps(feature.geometry) if feature.geometry else None
            row = self.db.fetchone(query, (feature.dataset, feature.layer, payload, payload, geometry_type, json.dumps(feature.properties), feature.source, feature.source_identifier, str(feature.source_url) if feature.source_url else None, feature.observed_at, feature.valid_from, feature.valid_to, feature.fetched_at, feature.freshness_status, feature.confidence, json.dumps(feature.quality)))
        else:
            query = """INSERT INTO spatial_features (dataset, layer, geometry_json, geometry_type, properties_json, source, source_identifier, source_url, observed_at, valid_from, valid_to, fetched_at, updated_at, freshness_status, confidence, quality_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?)"""
            self.db.execute(query, (feature.dataset, feature.layer, json.dumps(feature.geometry) if feature.geometry else None, geometry_type, json.dumps(feature.properties), feature.source, feature.source_identifier, str(feature.source_url) if feature.source_url else None, _time(feature.observed_at), _time(feature.valid_from), _time(feature.valid_to), _time(feature.fetched_at), timestamp, feature.freshness_status, feature.confidence, json.dumps(feature.quality)))
            row = self.db.fetchone("SELECT id, dataset, layer, geometry_json, geometry_type, properties_json, source, source_identifier, source_url, observed_at, valid_from, valid_to, fetched_at, updated_at, freshness_status, confidence, quality_json FROM spatial_features ORDER BY id DESC LIMIT 1", ())
        if row is None:
            raise RuntimeError("Spatial feature creation did not persist.")
        return _record_from_row(row, self.db.is_postgres)

    def list(
    self,
    *,
    dataset: str | None = None,
    layer: str | None = None,
    source: str | None = None,
    status: str | None = None,
    valid_at: datetime | None = None,
) -> list[SpatialFeatureRecord]:
    self.initialize()

    clauses = ["1=1"]
    params: list[object] = []

    for column, value in (
        ("dataset", dataset),
        ("layer", layer),
        ("source", source),
        ("freshness_status", status),
    ):
        if value is not None:
            clauses.append(f"{column} = ?")
            params.append(value)

    if valid_at is not None:
        clauses.extend([
            "(valid_from IS NULL OR valid_from <= ?)",
            "(valid_to IS NULL OR valid_to >= ?)",
        ])

        valid_at_value = (
            _time(valid_at)
            if not self.db.is_postgres
            else valid_at
        )

        params.extend([valid_at_value, valid_at_value])

    geometry_column = (
        "ST_AsGeoJSON(geometry) AS geometry"
        if self.db.is_postgres
        else "geometry_json AS geometry"
    )

    columns = (
        _POSTGRES_COLUMNS
        if self.db.is_postgres
        else _SQLITE_COLUMNS
    )

    rows = self.db.fetchall(
        f"SELECT {columns}, {geometry_column} "
        f"FROM spatial_features "
        f"WHERE {' AND '.join(clauses)} "
        f"ORDER BY id",
        tuple(params),
    )

    return [
        _record_from_row(row, self.db.is_postgres)
        for row in rows
    ]


def _record_from_row(row: Any, postgres: bool) -> SpatialFeatureRecord:
    values = dict(row) if not postgres else dict(zip(["id", "dataset", "layer", "geometry_type", "properties", "source", "source_identifier", "source_url", "observed_at", "valid_from", "valid_to", "fetched_at", "updated_at", "freshness_status", "confidence", "quality", "geometry"], row))
    values.setdefault("properties", values.pop("properties_json", {}))
    values.setdefault("quality", values.pop("quality_json", {}))
    values.setdefault("geometry", values.pop("geometry_json", None))
    for key in ("properties", "quality", "geometry"):
        if isinstance(values.get(key), str):
            values[key] = json.loads(values[key])
    return SpatialFeatureRecord(**values)


spatial_features = SpatialFeatureRepository()
