from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = Field("Spotify Explorer API", description="Application name")
    environment: str = Field("development", description="Runtime environment")
    database_url: str = Field(
        "postgresql+psycopg://postgres:postgres@localhost:5432/spotify?async_fallback=true",
        description="Async SQLAlchemy DSN",
    )
    redis_url: str = Field(
        "redis://localhost:6379/0",
        description="Redis connection URI",
    )
    ml_service_url: str = Field(
        "http://ml-service:8081",
        description="Base URL for the ML ranking service",
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
