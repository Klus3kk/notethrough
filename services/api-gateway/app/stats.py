from __future__ import annotations

from typing import Optional

from .db import get_session, session_scope
from .schemas import StatsResponse
from .services.tracks import compute_statistics
from .cache import get_json, set_json

_REDIS_KEY = "stats:v1"

_stats_cache: Optional[StatsResponse] = None


async def get_stats(force: bool = False) -> StatsResponse:
    global _stats_cache
    if _stats_cache is not None and not force:
        return _stats_cache

    if not force:
        cached = await get_json(_REDIS_KEY)
        if cached:
            _stats_cache = StatsResponse.parse_obj(cached)
            return _stats_cache

    async with session_scope() as session:
        _stats_cache = await compute_statistics(session)

    await set_json(_REDIS_KEY, _stats_cache.dict())

    return _stats_cache
