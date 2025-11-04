from __future__ import annotations

from typing import Optional

import json
import logging

import redis.asyncio as redis

from .config import get_settings

_logger = logging.getLogger(__name__)
_client: Optional[redis.Redis] = None


async def get_client() -> Optional[redis.Redis]:
    global _client
    if _client is not None:
        return _client

    settings = get_settings()
    client = redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
    try:
        await client.ping()
    except Exception as exc:  # pragma: no cover - best effort
        _logger.warning("Redis unavailable: %s", exc)
        await client.close()
        _client = None
    else:
        _client = client
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


async def get_json(key: str) -> Optional[dict]:
    client = await get_client()
    if not client:
        return None
    raw = await client.get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


async def set_json(key: str, value: dict, ttl_seconds: int = 300) -> None:
    client = await get_client()
    if not client:
        return
    try:
        await client.set(key, json.dumps(value), ex=ttl_seconds)
    except Exception as exc:  # pragma: no cover - cache failures are non-fatal
        _logger.debug("Failed to write redis cache: %s", exc)
