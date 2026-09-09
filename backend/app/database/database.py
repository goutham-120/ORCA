"""Small DB-API persistence layer for ORCA users."""

from __future__ import annotations

from contextlib import contextmanager
import sqlite3
from pathlib import Path
from typing import Iterator


class Database:
    def __init__(self, url: str | None) -> None:
        self.url = url
        self.is_postgres = bool(url and url.startswith(("postgresql", "postgres://")))
        self.sqlite_path = Path(__file__).resolve().parents[2] / "orca.db"

    @contextmanager
    def connection(self) -> Iterator[object]:
        if self.is_postgres:
            try:
                import psycopg
            except ImportError as exc:
                raise RuntimeError("PostgreSQL is configured but psycopg is not installed. Install psycopg before starting ORCA.") from exc
            connection_url = f"postgresql://{self.url.split('://', 1)[1]}" if self.url.startswith("postgresql+") else self.url
            connection = psycopg.connect(connection_url)
        else:
            connection = sqlite3.connect(self.sqlite_path)
            connection.row_factory = sqlite3.Row

        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def initialize(self) -> None:
        id_column = "BIGSERIAL PRIMARY KEY" if self.is_postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
        with self.connection() as connection:
            cursor = connection.cursor()
            cursor.execute(
                f"""
                CREATE TABLE IF NOT EXISTS users (
                    id {id_column},
                    email VARCHAR(255) NOT NULL UNIQUE,
                    display_name VARCHAR(100) NOT NULL,
                    password_hash TEXT NOT NULL,
                    user_category VARCHAR(64),
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            self._initialize_spatial_schema(cursor)

    def _initialize_spatial_schema(self, cursor: object) -> None:
        """Create idempotent spatial storage without altering user persistence."""
        if self.is_postgres:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS spatial_features (
                    id BIGSERIAL PRIMARY KEY,
                    dataset VARCHAR(128) NOT NULL,
                    layer VARCHAR(128),
                    geometry geometry(Geometry, 4326),
                    geometry_type VARCHAR(64),
                    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
                    source VARCHAR(255) NOT NULL,
                    source_identifier VARCHAR(255),
                    source_url TEXT,
                    observed_at TIMESTAMPTZ,
                    valid_from TIMESTAMPTZ,
                    valid_to TIMESTAMPTZ,
                    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    freshness_status VARCHAR(32) NOT NULL DEFAULT 'unavailable',
                    confidence DOUBLE PRECISION,
                    quality JSONB NOT NULL DEFAULT '{}'::jsonb
                )
                """
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_spatial_features_geometry ON spatial_features USING GIST (geometry)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_spatial_features_dataset_layer ON spatial_features (dataset, layer)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_spatial_features_source ON spatial_features (source)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_spatial_features_validity ON spatial_features (valid_from, valid_to)")
        else:
            # SQLite is a development fallback. It stores GeoJSON but does not
            # claim PostGIS query support; production spatial indexes use PostGIS.
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS spatial_features (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dataset TEXT NOT NULL,
                    layer TEXT,
                    geometry_json TEXT,
                    geometry_type TEXT,
                    properties_json TEXT NOT NULL DEFAULT '{}',
                    source TEXT NOT NULL,
                    source_identifier TEXT,
                    source_url TEXT,
                    observed_at TEXT,
                    valid_from TEXT,
                    valid_to TEXT,
                    fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    freshness_status TEXT NOT NULL DEFAULT 'unavailable',
                    confidence REAL,
                    quality_json TEXT NOT NULL DEFAULT '{}'
                )
                """
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_spatial_features_dataset_layer ON spatial_features (dataset, layer)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_spatial_features_source ON spatial_features (source)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_spatial_features_validity ON spatial_features (valid_from, valid_to)")
        cursor.execute("CREATE TABLE IF NOT EXISTS spatial_schema_migrations (version VARCHAR(64) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)")
        cursor.execute(self._query("INSERT INTO spatial_schema_migrations (version) VALUES (?) ON CONFLICT (version) DO NOTHING"), ("spatial-foundation-v1",))

    def fetchone(self, query: str, params: tuple[object, ...]) -> object | None:
        with self.connection() as connection:
            cursor = connection.cursor()
            cursor.execute(self._query(query), params)
            return cursor.fetchone()

    def fetchall(self, query: str, params: tuple[object, ...] = ()) -> list[object]:
        with self.connection() as connection:
            cursor = connection.cursor()
            cursor.execute(self._query(query), params)
            return list(cursor.fetchall())

    def execute(self, query: str, params: tuple[object, ...]) -> None:
        with self.connection() as connection:
            cursor = connection.cursor()
            cursor.execute(self._query(query), params)

    def _query(self, query: str) -> str:
        return query.replace("?", "%s") if self.is_postgres else query
