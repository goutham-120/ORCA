"""Environment-backed application settings."""

from functools import lru_cache
import os
from pathlib import Path

from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

@dataclass(frozen=True)
class Settings:
    app_name: str = "ORCA API"
    environment: str = "development"
    api_prefix: str = ""
    cors_origins: list[str] = field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]
    )
    database_url: str | None = None
    jwt_secret: str | None = None
    map_api_key: str | None = None
    llm_api_key: str | None = None
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_model: str = "llama-3.3-70b-versatile"


@lru_cache
def get_settings() -> Settings:
    # Permit the conventional comma-separated form while retaining typed settings.
    origins = os.getenv("ORCA_CORS_ORIGINS", "")
    return Settings(
        app_name=os.getenv("ORCA_APP_NAME", "ORCA API"),
        environment=os.getenv("ORCA_ENVIRONMENT", "development"),
        api_prefix=os.getenv("ORCA_API_PREFIX", ""),
        cors_origins=[origin.strip() for origin in origins.split(",") if origin.strip()]
        or ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
        database_url=os.getenv("ORCA_DATABASE_URL"),
        jwt_secret=os.getenv("ORCA_JWT_SECRET"),
        map_api_key=os.getenv("ORCA_MAP_API_KEY"),
        llm_api_key=os.getenv("GROQ_API_KEY") or os.getenv("ORCA_LLM_API_KEY"),
        llm_base_url=os.getenv("ORCA_LLM_BASE_URL", "https://api.groq.com/openai/v1"),
        llm_model=os.getenv("ORCA_LLM_MODEL", "llama-3.3-70b-versatile"),
    )
