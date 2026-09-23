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
    user_category: str | None = None
    preferences: dict[str, Any] = field(default_factory=dict)
    name: str | None = None
    role: str = "fisherman"
    approval_status: str = "approved"
    organization: str | None = None
    designation: str | None = None
    created_at: str | None = None


def _to_user(row: object | None) -> User | None:
    if row is None:
        return None

    # Support both sqlite Row (dict-like or tuple) or tuple
    if hasattr(row, "__getitem__") and hasattr(row, "keys"):
        keys = row.keys()
        raw_prefs = row["preferences"] if "preferences" in keys else (row["preferences_json"] if "preferences_json" in keys else {})
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
            id=row["id"],
            email=row["email"],
            display_name=row["display_name"],
            name=row["name"] if "name" in keys and row["name"] else row["display_name"],
            password_hash=row["password_hash"],
            user_category=row["user_category"] if "user_category" in keys else None,
            preferences=prefs,
            role=row["role"] if "role" in keys and row["role"] else "fisherman",
            approval_status=row["approval_status"] if "approval_status" in keys and row["approval_status"] else "approved",
            organization=row["organization"] if "organization" in keys else None,
            designation=row["designation"] if "designation" in keys else None,
            created_at=str(row["created_at"]) if "created_at" in keys and row["created_at"] else None,
        )

    # Fallback positional unpacking
    raw_prefs = row[11] if len(row) > 11 else {}
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
        user_category=row[4] if len(row) > 4 else None,
        name=row[5] if len(row) > 5 and row[5] else row[2],
        role=row[6] if len(row) > 6 and row[6] else "fisherman",
        approval_status=row[7] if len(row) > 7 and row[7] else "approved",
        organization=row[8] if len(row) > 8 else None,
        designation=row[9] if len(row) > 9 else None,
        created_at=str(row[10]) if len(row) > 10 else None,
        preferences=prefs,
    )


SELECT_COLS = "id, email, display_name, password_hash, user_category, name, role, approval_status, organization, designation, created_at"


class UserRepository:
    def initialize(self) -> None:
        database.initialize()

    def _select_query(self, where_clause: str) -> str:
        pref_col = "preferences" if database.is_postgres else "preferences_json AS preferences"
        return f"SELECT {SELECT_COLS}, {pref_col} FROM users WHERE {where_clause}"

    def create(
        self,
        email: str,
        display_name: str,
        password_hash: str,
        user_category: str | None = None,
        preferences: dict[str, Any] | None = None,
        role: str = "fisherman",
        approval_status: str = "approved",
        organization: str | None = None,
        designation: str | None = None,
        name: str | None = None,
    ) -> User:
        self.initialize()
        user_name = name or display_name
        prefs_json = json.dumps(preferences or {})
        if database.is_postgres:
            database.execute(
                """
                INSERT INTO users (email, display_name, name, password_hash, user_category, preferences, role, approval_status, organization, designation)
                VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)
                """,
                (email, display_name, user_name, password_hash, user_category, prefs_json, role, approval_status, organization, designation),
            )
        else:
            database.execute(
                """
                INSERT INTO users (email, display_name, name, password_hash, user_category, preferences_json, role, approval_status, organization, designation)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (email, display_name, user_name, password_hash, user_category, prefs_json, role, approval_status, organization, designation),
            )

        user = self.by_email(email)
        if user is None:
            raise RuntimeError("User creation did not persist.")
        return user

    def by_email(self, email: str) -> User | None:
        self.initialize()
        row = database.fetchone(self._select_query("LOWER(email) = LOWER(?)"), (email,))
        return _to_user(row)

    def by_id(self, user_id: int) -> User | None:
        self.initialize()
        row = database.fetchone(self._select_query("id = ?"), (user_id,))
        return _to_user(row)

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

    def get_pending_users(self) -> list[User]:
        self.initialize()
        rows = database.fetchall(self._select_query("approval_status = 'pending' ORDER BY id DESC"))
        return [u for row in rows if (u := _to_user(row)) is not None]

    def update_approval_status(self, user_id: int, status: str) -> User | None:
        self.initialize()
        database.execute("UPDATE users SET approval_status = ? WHERE id = ?", (status, user_id))
        return self.by_id(user_id)

    def ensure_admin_user(self, email: str, password_hash: str) -> User:
        self.initialize()
        admin_user = self.by_email(email)
        if admin_user is None:
            if database.is_postgres:
                database.execute(
                    """
                    INSERT INTO users (email, display_name, name, password_hash, role, approval_status, organization, designation, preferences)
                    VALUES (?, ?, ?, ?, 'admin', 'approved', 'ORCA Administration', 'System Administrator', '{}'::jsonb)
                    """,
                    (email, "System Administrator", "System Administrator", password_hash),
                )
            else:
                database.execute(
                    """
                    INSERT INTO users (email, display_name, name, password_hash, role, approval_status, organization, designation, preferences_json)
                    VALUES (?, ?, ?, ?, 'admin', 'approved', 'ORCA Administration', 'System Administrator', '{}')
                    """,
                    (email, "System Administrator", "System Administrator", password_hash),
                )
            admin_user = self.by_email(email)
        return admin_user


users = UserRepository()
