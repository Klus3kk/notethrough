from __future__ import annotations

from typing import Optional

from .db import get_session
from .schemas import StatsResponse
from .services.tracks import compute_statistics

_stats_cache: Optional[StatsResponse] = None


async def get_stats(force: bool = False) -> StatsResponse:
    global _stats_cache
    if _stats_cache is not None and not force:
        return _stats_cache

    async with get_session() as session:
        _stats_cache = await compute_statistics(session)

    return _stats_cache
