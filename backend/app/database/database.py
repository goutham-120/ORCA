"""Small DB-API persistence layer for ORCA users."""

from __future__ import annotations

from contextlib import contextmanager
import os
import sqlite3
from pathlib import Path
from typing import Iterator


class Database:
    def __init__(self, url: str | None) -> None:
        self.url = url
        self.is_postgres = bool(url and url.startswith(("postgresql", "postgres://")))
        self.sqlite_path = Path(__file__).resolve().parents[2] / "orca.db"
        self.last_error: Exception | None = None
        self.connect_timeout = float(os.getenv("ORCA_DB_CONNECT_TIMEOUT_SECONDS", "2.5"))

    @contextmanager
    def connection(self) -> Iterator[object]:
        if self.is_postgres:
            try:
                import psycopg
            except ImportError as exc:
                raise RuntimeError("PostgreSQL is configured but psycopg is not installed. Install psycopg before starting ORCA.") from exc
            connection_url = f"postgresql://{self.url.split('://', 1)[1]}" if self.url.startswith("postgresql+") else self.url
            try:
                connection = psycopg.connect(connection_url, connect_timeout=self.connect_timeout)
            except Exception as exc:
                self.last_error = exc
                raise
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

    def initialize(self) -> bool:
        try:
            id_column = "BIGSERIAL PRIMARY KEY" if self.is_postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
            with self.connection() as connection:
                cursor = connection.cursor()
                cursor.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS users (
                        id {id_column},
                        email VARCHAR(255) NOT NULL UNIQUE,
                        display_name VARCHAR(100) NOT NULL,
                        name VARCHAR(100),
                        password_hash TEXT NOT NULL,
                        user_category VARCHAR(64),
                        role VARCHAR(64),
                        approval_status VARCHAR(32) NOT NULL DEFAULT 'approved',
                        organization VARCHAR(255),
                        designation VARCHAR(255),
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
                self._migrate_users_schema(cursor)
                self._initialize_spatial_schema(cursor)
                self._initialize_coastal_schema(cursor)
            self.last_error = None
            return True
        except Exception as exc:
            self.last_error = exc
            if self.is_postgres:
                # PostgreSQL connection failed; fall back to local SQLite in development
                self.is_postgres = False
                return self.initialize()
            return False

    def _migrate_users_schema(self, cursor: object) -> None:
        """Idempotently add missing auth columns to existing users table."""
        columns_to_add = [
            ("name", "VARCHAR(100)"),
            ("role", "VARCHAR(64)"),
            ("approval_status", "VARCHAR(32) DEFAULT 'approved'"),
            ("organization", "VARCHAR(255)"),
            ("designation", "VARCHAR(255)"),
        ]
        if self.is_postgres:
            for col_name, col_type in columns_to_add:
                cursor.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
        else:
            cursor.execute("PRAGMA table_info(users)")
            existing_cols = {row[1] for row in cursor.fetchall()}
            for col_name, col_type in columns_to_add:
                if col_name not in existing_cols:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")


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

    def _initialize_coastal_schema(self, cursor: object) -> None:
        """Create tables for Coastal Authority hazards, complaints, and announcements."""
        id_col = "BIGSERIAL PRIMARY KEY" if self.is_postgres else "INTEGER PRIMARY KEY AUTOINCREMENT"
        
        # 1. Coastal Hazard Reports Table
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS coastal_hazard_reports (
                id {id_col},
                region VARCHAR(255) NOT NULL,
                hazard_type VARCHAR(128) NOT NULL,
                location VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                photo_url TEXT,
                photo_name VARCHAR(255),
                timestamp VARCHAR(128) NOT NULL,
                status VARCHAR(64) NOT NULL DEFAULT 'Pending Review',
                acknowledged_at VARCHAR(128),
                source VARCHAR(128) NOT NULL DEFAULT 'Marine & Disaster Operations',
                op_role VARCHAR(128) DEFAULT 'Disaster Response',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # 2. Coastal Complaints & Messages Table
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS coastal_complaints (
                id {id_col},
                sender_user_id INTEGER,
                sender_name VARCHAR(128) NOT NULL,
                sender_role VARCHAR(64) NOT NULL,
                sender_email VARCHAR(255),
                recipient_role VARCHAR(64) NOT NULL DEFAULT 'coastal_authority',
                message TEXT NOT NULL,
                region VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                photo_url TEXT,
                photo_name VARCHAR(255),
                timestamp VARCHAR(128) NOT NULL,
                status VARCHAR(64) NOT NULL DEFAULT 'Pending Response',
                response TEXT,
                responded_at VARCHAR(128),
                responder_user_id INTEGER,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        if self.is_postgres:
            for col_name, col_type in [
                ("sender_user_id", "INTEGER"),
                ("sender_email", "VARCHAR(255)"),
                ("recipient_role", "VARCHAR(64) DEFAULT 'coastal_authority'"),
                ("location", "VARCHAR(255)"),
                ("photo_url", "TEXT"),
                ("photo_name", "VARCHAR(255)"),
                ("responder_user_id", "INTEGER"),
            ]:
                cursor.execute(f"ALTER TABLE coastal_complaints ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
        else:
            cursor.execute("PRAGMA table_info(coastal_complaints)")
            cols = [r[1] for r in cursor.fetchall()]
            for col_name, col_type in [
                ("sender_user_id", "INTEGER"),
                ("sender_email", "VARCHAR(255)"),
                ("recipient_role", "VARCHAR(64) DEFAULT 'coastal_authority'"),
                ("location", "VARCHAR(255)"),
                ("photo_url", "TEXT"),
                ("photo_name", "VARCHAR(255)"),
                ("responder_user_id", "INTEGER"),
            ]:
                if col_name not in cols:
                    cursor.execute(f"ALTER TABLE coastal_complaints ADD COLUMN {col_name} {col_type}")

        # 3. Authority Announcements Table
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS authority_announcements (
                id {id_col},
                title VARCHAR(255) NOT NULL,
                details TEXT NOT NULL,
                short_desc TEXT,
                source VARCHAR(128) NOT NULL DEFAULT 'Coastal Authority',
                region VARCHAR(255) NOT NULL,
                target_audience VARCHAR(128) NOT NULL DEFAULT 'Fishermen / Mariners',
                datetime VARCHAR(128) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        # 4. Login Activity Logs Table
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS login_activity (
                id {id_col},
                user_id INTEGER,
                email VARCHAR(255) NOT NULL,
                role VARCHAR(64) NOT NULL,
                timestamp VARCHAR(128) NOT NULL,
                status VARCHAR(32) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute("SELECT COUNT(*) FROM login_activity")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                """
                INSERT INTO login_activity (user_id, email, role, timestamp, status, created_at)
                SELECT id, email, COALESCE(role, 'fisherman'), 'Sep 23, 2026, 11:00 PM', 'success', created_at
                FROM users
                """
            )

        # Seed initial default hazard reports if empty
        cursor.execute("SELECT COUNT(*) FROM coastal_hazard_reports")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                """
                INSERT INTO coastal_hazard_reports (region, hazard_type, location, description, photo_url, photo_name, timestamp, status, source, op_role)
                VALUES 
                ('Visakhapatnam Coast', 'Cyclone', 'Visakhapatnam Outer Harbor (17.6868° N, 83.2185° E)', 'Heavy atmospheric pressure drop and sea swell surging near eastern harbor breakwater wall. Wind velocity recorded at 48 km/h.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80', 'storm_surge_harbor.jpg', 'Sep 23, 2026, 08:40 PM', 'Pending Review', 'Marine & Disaster Operations', 'Disaster Response'),
                ('Visakhapatnam Coast', 'Oil Spill', 'Gangavaram Port Anchorage (17.6200° N, 83.2400° E)', 'Minor chemical sheen reported near fuel transshipment jetty berth 2. Coastal containment boom requested.', 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=400&q=80', 'oil_slick_evidence.jpg', 'Sep 23, 2026, 06:15 PM', 'Pending Review', 'Marine & Disaster Operations', 'Marine Operations')
                """
            )

        # Seed initial default complaints if empty
        cursor.execute("SELECT COUNT(*) FROM coastal_complaints")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                """
                INSERT INTO coastal_complaints (sender_name, sender_role, message, region, timestamp, status)
                VALUES 
                ('Raju K (Fisherman)', 'Fisherman', 'Illegal trawling activity reported inside the 5-mile reserved coastal zone near Lawson Bay reef.', 'Visakhapatnam Coast', 'Sep 23, 2026, 08:35 PM', 'Pending Response'),
                ('Captain Sharma (Vessel Master)', 'Marine Operator', 'Unmarked floating navigation obstruction observed near Visakhapatnam fairway channel entrance.', 'Visakhapatnam Coast', 'Sep 23, 2026, 07:52 PM', 'Pending Response')
                """
            )

        # Seed initial default announcements if empty
        cursor.execute("SELECT COUNT(*) FROM authority_announcements")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                """
                INSERT INTO authority_announcements (title, details, short_desc, source, region, target_audience, datetime)
                VALUES 
                ('High Swell Wave & Rough Sea Advisory', 'Visakhapatnam Coastal Authority in coordination with INCOIS reports high swell waves affecting outer anchorage berths. Motorized fishing vessels under 15m length should defer departure until 18:00 hrs.', 'Swell waves up to 3.2m expected along offshore region. Trawlers advised caution near harbor mouth.', 'Visakhapatnam Coastal Authority', 'Visakhapatnam Coast', 'Fishermen / Mariners', 'Sep 23, 2026 08:30 AM'),
                ('Coastal Port Security Level 2 Readiness Notice', 'All vessel captains and local marine operators must maintain VHF Ch 16. Emergency tugboats positioned at berths 3 and 7.', 'Routine emergency readiness verification active across Outer Harbor berths.', 'Visakhapatnam Port Control', 'Visakhapatnam Coast', 'Marine operators', 'Sep 22, 2026 04:15 PM')
                """
            )

    def fetchone(self, query: str, params: tuple[object, ...] = ()) -> object | None:
        with self.connection() as connection:
            cursor = connection.cursor()
            cursor.execute(self._query(query), params)
            return cursor.fetchone()

    def fetchall(self, query: str, params: tuple[object, ...] = ()) -> list[object]:
        with self.connection() as connection:
            cursor = connection.cursor()
            cursor.execute(self._query(query), params)
            return list(cursor.fetchall())

    def execute(self, query: str, params: tuple[object, ...] = ()) -> None:
        with self.connection() as connection:
            cursor = connection.cursor()
            cursor.execute(self._query(query), params)

    def _query(self, query: str) -> str:
        return query.replace("?", "%s") if self.is_postgres else query
