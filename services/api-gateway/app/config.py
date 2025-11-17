from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = Field("Spotify Explorer API", description="Application name")
    environment: str = Field("development", description="Runtime environment")
    database_url: str = Field(..., description="Async SQLAlchemy DSN")
    redis_url: str = Field(..., description="Redis connection URI")
    ml_service_url: str = Field(..., description="Base URL for the ML ranking service")

    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        protected_namespaces=("settings_",),
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
