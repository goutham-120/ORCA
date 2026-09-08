"""Database initialization entry point."""

from app.database.database import Database
from app.config import get_settings


def init_db() -> Database:
    database = Database(get_settings().database_url)
    database.initialize()
    return database
