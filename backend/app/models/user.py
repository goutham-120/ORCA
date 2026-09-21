"""User persistence model and repository."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from typing import Any

from app.database.session import database


@dataclass(frozen=True)
class User:
    id: int
    email: str
    display_name: str
    password_hash: str
    user_category: str | None
    preferences: dict[str, Any] = field(default_factory=dict)


def _to_user(row: object | None) -> User | None:
    if row is None:
        return None
    raw_prefs = row[5] if len(row) > 5 else {}
    if isinstance(raw_prefs, str):
        try:
            prefs = json.loads(raw_prefs)
        except Exception:
            prefs = {}
    elif isinstance(raw_prefs, dict):
        prefs = raw_prefs
    else:
        prefs = {}
    return User(
        id=row[0],
        email=row[1],
        display_name=row[2],
        password_hash=row[3],
        user_category=row[4],
        preferences=prefs,
    )


class UserRepository:
    def initialize(self) -> None:
        database.initialize()

    def _select_query(self, where_clause: str) -> str:
        pref_col = "preferences" if database.is_postgres else "preferences_json AS preferences"
        return f"SELECT id, email, display_name, password_hash, user_category, {pref_col} FROM users WHERE {where_clause}"

    def create(self, email: str, display_name: str, password_hash: str, user_category: str | None = None, preferences: dict[str, Any] | None = None) -> User:
        self.initialize()
        prefs_json = json.dumps(preferences or {})
        if database.is_postgres:
            database.execute(
                "INSERT INTO users (email, display_name, password_hash, user_category, preferences) VALUES (?, ?, ?, ?, ?::jsonb)",
                (email, display_name, password_hash, user_category, prefs_json),
            )
        else:
            database.execute(
                "INSERT INTO users (email, display_name, password_hash, user_category, preferences_json) VALUES (?, ?, ?, ?, ?)",
                (email, display_name, password_hash, user_category, prefs_json),
            )
        user = self.by_email(email)
        if user is None:
            raise RuntimeError("User creation did not persist.")
        return user

    def by_email(self, email: str) -> User | None:
        self.initialize()
        return _to_user(database.fetchone(self._select_query("email = ?"), (email,)))

    def by_id(self, user_id: int) -> User | None:
        self.initialize()
        return _to_user(database.fetchone(self._select_query("id = ?"), (user_id,)))

    def update_category(self, user_id: int, user_category: str) -> User | None:
        self.initialize()
        database.execute("UPDATE users SET user_category = ? WHERE id = ?", (user_category, user_id))
        return self.by_id(user_id)

    def update_preferences(self, user_id: int, preferences: dict[str, Any]) -> User | None:
        self.initialize()
        prefs_json = json.dumps(preferences or {})
        if database.is_postgres:
            database.execute("UPDATE users SET preferences = ?::jsonb WHERE id = ?", (prefs_json, user_id))
        else:
            database.execute("UPDATE users SET preferences_json = ? WHERE id = ?", (prefs_json, user_id))
        return self.by_id(user_id)


users = UserRepository()

