"""User persistence model and repository."""

from dataclasses import dataclass

from app.database.session import database


@dataclass(frozen=True)
class User:
    id: int
    email: str
    display_name: str
    password_hash: str
    user_category: str | None = None
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
        return User(
            id=row["id"],
            email=row["email"],
            display_name=row["display_name"],
            name=row["name"] if "name" in row.keys() else row["display_name"],
            password_hash=row["password_hash"],
            user_category=row["user_category"] if "user_category" in row.keys() else None,
            role=row["role"] if "role" in row.keys() and row["role"] else "fisherman",
            approval_status=row["approval_status"] if "approval_status" in row.keys() and row["approval_status"] else "approved",
            organization=row["organization"] if "organization" in row.keys() else None,
            designation=row["designation"] if "designation" in row.keys() else None,
            created_at=str(row["created_at"]) if "created_at" in row.keys() and row["created_at"] else None,
        )
    # Fallback positional
    return User(
        id=row[0],
        email=row[1],
        display_name=row[2],
        password_hash=row[3],
        user_category=row[4] if len(row) > 4 else None,
        name=row[5] if len(row) > 5 else row[2],
        role=row[6] if len(row) > 6 and row[6] else "fisherman",
        approval_status=row[7] if len(row) > 7 and row[7] else "approved",
        organization=row[8] if len(row) > 8 else None,
        designation=row[9] if len(row) > 9 else None,
        created_at=str(row[10]) if len(row) > 10 else None,
    )


SELECT_COLS = "id, email, display_name, password_hash, user_category, name, role, approval_status, organization, designation, created_at"


class UserRepository:
    def initialize(self) -> None:
        database.initialize()

    def create(
        self,
        email: str,
        display_name: str,
        password_hash: str,
        role: str = "fisherman",
        approval_status: str = "approved",
        organization: str | None = None,
        designation: str | None = None,
        name: str | None = None,
    ) -> User:
        self.initialize()
        user_name = name or display_name
        database.execute(
            """
            INSERT INTO users (email, display_name, name, password_hash, role, approval_status, organization, designation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (email, display_name, user_name, password_hash, role, approval_status, organization, designation),
        )
        user = self.by_email(email)
        if user is None:
            raise RuntimeError("User creation did not persist.")
        return user

    def by_email(self, email: str) -> User | None:
        self.initialize()
        row = database.fetchone(f"SELECT {SELECT_COLS} FROM users WHERE LOWER(email) = LOWER(?)", (email,))
        return _to_user(row)

    def by_id(self, user_id: int) -> User | None:
        self.initialize()
        row = database.fetchone(f"SELECT {SELECT_COLS} FROM users WHERE id = ?", (user_id,))
        return _to_user(row)

    def update_category(self, user_id: int, user_category: str) -> User | None:
        self.initialize()
        database.execute("UPDATE users SET user_category = ? WHERE id = ?", (user_category, user_id))
        return self.by_id(user_id)

    def get_pending_users(self) -> list[User]:
        self.initialize()
        rows = database.fetchall(f"SELECT {SELECT_COLS} FROM users WHERE approval_status = 'pending' ORDER BY id DESC")
        return [u for row in rows if (u := _to_user(row)) is not None]

    def update_approval_status(self, user_id: int, status: str) -> User | None:
        self.initialize()
        database.execute("UPDATE users SET approval_status = ? WHERE id = ?", (status, user_id))
        return self.by_id(user_id)

    def ensure_admin_user(self, email: str, password_hash: str) -> User:
        self.initialize()
        admin_user = self.by_email(email)
        if admin_user is None:
            database.execute(
                """
                INSERT INTO users (email, display_name, name, password_hash, role, approval_status, organization, designation)
                VALUES (?, ?, ?, ?, 'admin', 'approved', 'ORCA Administration', 'System Administrator')
                """,
                (email, "System Administrator", "System Administrator", password_hash),
            )
            admin_user = self.by_email(email)
        return admin_user


users = UserRepository()


