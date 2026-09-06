"""Environment-backed application settings."""

from functools import lru_cache
import os

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    app_name: str = "ORCA API"
    environment: str = "development"
    api_prefix: str = ""
    cors_origins: list[str] = field(default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"])
    database_url: str | None = None
    jwt_secret: str | None = None


@lru_cache
def get_settings() -> Settings:
    # Permit the conventional comma-separated form while retaining typed settings.
    origins = os.getenv("ORCA_CORS_ORIGINS", "")
    return Settings(
        app_name=os.getenv("ORCA_APP_NAME", "ORCA API"),
        environment=os.getenv("ORCA_ENVIRONMENT", "development"),
        api_prefix=os.getenv("ORCA_API_PREFIX", ""),
        cors_origins=[origin.strip() for origin in origins.split(",") if origin.strip()]
        or ["http://localhost:5173", "http://127.0.0.1:5173"],
        database_url=os.getenv("ORCA_DATABASE_URL"),
        jwt_secret=os.getenv("ORCA_JWT_SECRET"),
    )
