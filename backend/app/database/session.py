"""Database configuration without a mandatory startup connection."""

from dataclasses import dataclass
from app.config import get_settings


@dataclass(frozen=True)
class DatabaseConfig:
    url: str | None
    dialect: str = "postgresql+postgis"

    @property
    def configured(self) -> bool:
        return bool(self.url)


database_config = DatabaseConfig(url=get_settings().database_url)
