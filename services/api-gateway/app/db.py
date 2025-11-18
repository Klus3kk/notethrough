from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlsplit

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from .config import get_settings
from .models import Base


_engine: Optional[AsyncEngine] = None
_session_factory: Optional[sessionmaker] = None


def _sanitize_database_url(raw_url: str) -> str:
    """Strip deprecated SQLAlchemy query args automatically."""
    split = urlsplit(raw_url)
    if not split.query:
        return raw_url

    original_pairs = parse_qsl(split.query, keep_blank_values=True)
    filtered_pairs = [
        (key, value) for key, value in original_pairs if key.lower() != "async_fallback"
    ]
    if len(filtered_pairs) == len(original_pairs):
        return raw_url

    new_query = urlencode(filtered_pairs, doseq=True)
    return split._replace(query=new_query).geturl()


def _get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        database_url = _sanitize_database_url(settings.database_url)
        _engine = create_async_engine(
            database_url,
            echo=False,
            future=True,
        )
    return _engine


def _get_session_factory() -> sessionmaker:
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(
            bind=_get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    session_factory = _get_session_factory()
    async with session_factory() as session:
        yield session


async def get_session() -> AsyncIterator[AsyncSession]:
    async with session_scope() as session:
        yield session


async def init_db() -> None:
    engine = _get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
