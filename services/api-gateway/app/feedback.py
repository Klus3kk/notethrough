from __future__ import annotations

import json
import time
from typing import List

from .cache import get_client
from .schemas import TrackFeedback

_MEMORY_BUFFER: List[dict] = []
_MAX_BUFFER = 200
_REDIS_KEY = "feedback:tracks:v1"


async def record_feedback(payload: TrackFeedback) -> None:
    entry = payload.model_dump()
    entry["ts"] = time.time()
    client = await get_client()
    if client:
        await client.lpush(_REDIS_KEY, json.dumps(entry))
        await client.ltrim(_REDIS_KEY, 0, 999)
        return

    _MEMORY_BUFFER.insert(0, entry)
    if len(_MEMORY_BUFFER) > _MAX_BUFFER:
        _MEMORY_BUFFER.pop()
