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

    def fetchone(self, query: str, params: tuple[object, ...]) -> object | None:
        with self.connection() as connection:
            cursor = connection.cursor()
            cursor.execute(self._query(query), params)
            return cursor.fetchone()

    def execute(self, query: str, params: tuple[object, ...]) -> None:
        with self.connection() as connection:
            cursor = connection.cursor()
            cursor.execute(self._query(query), params)

    def _query(self, query: str) -> str:
        return query.replace("?", "%s") if self.is_postgres else query
