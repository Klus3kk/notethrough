from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = Field("Notethrough ML Service", description="Service name")
    environment: str = Field("development", description="Runtime environment")
    database_url: str = Field(
        "postgresql+psycopg://notethrough:notethrough@postgres:5432/notethrough",
        description="Primary Postgres DSN",
    )
    redis_url: str = Field(
        "redis://redis:6379/1",
        description="Redis connection URL for caches and bandit feedback",
    )
    model_registry_path: str = Field(
        "/data/models",
        description="Filesystem path or bucket URI for persisted model artifacts",
    )
    alpha: float = Field(0.5, description="Hybrid rank weight for content similarity")
    beta: float = Field(0.3, description="Hybrid rank weight for collaborative filtering")
    gamma: float = Field(0.2, description="Hybrid rank weight for text relevance")

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
