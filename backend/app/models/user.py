"""User persistence model and repository."""

from dataclasses import dataclass

from app.database.session import database


@dataclass(frozen=True)
class User:
    id: int
    email: str
    display_name: str
    password_hash: str
    user_category: str | None


def _to_user(row: object | None) -> User | None:
    if row is None:
        return None
    return User(id=row[0], email=row[1], display_name=row[2], password_hash=row[3], user_category=row[4])


class UserRepository:
    def initialize(self) -> None:
        database.initialize()

    def create(self, email: str, display_name: str, password_hash: str) -> User:
        self.initialize()
        database.execute("INSERT INTO users (email, display_name, password_hash) VALUES (?, ?, ?)", (email, display_name, password_hash))
        user = self.by_email(email)
        if user is None:
            raise RuntimeError("User creation did not persist.")
        return user

    def by_email(self, email: str) -> User | None:
        self.initialize()
        return _to_user(database.fetchone("SELECT id, email, display_name, password_hash, user_category FROM users WHERE email = ?", (email,)))

    def by_id(self, user_id: int) -> User | None:
        self.initialize()
        return _to_user(database.fetchone("SELECT id, email, display_name, password_hash, user_category FROM users WHERE id = ?", (user_id,)))

    def update_category(self, user_id: int, user_category: str) -> User | None:
        self.initialize()
        database.execute("UPDATE users SET user_category = ? WHERE id = ?", (user_category, user_id))
        return self.by_id(user_id)


users = UserRepository()
