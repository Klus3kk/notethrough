from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx

from ..config import get_settings

_client: Optional[httpx.AsyncClient] = None


class MLServiceError(Exception):
    """Raised when the ML service cannot be reached or returns an error."""


async def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = httpx.AsyncClient(base_url=settings.ml_service_url, timeout=httpx.Timeout(10.0, connect=3.0))
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def rank_candidates(
    seeds: List[Dict[str, Any]],
    candidate_uris: List[str],
    exploration: float = 0.05,
    alpha: float | None = None,
    beta: float | None = None,
    gamma: float | None = None,
) -> List[dict[str, object]]:
    client = await _get_client()
    payload = {
        "seeds": seeds,
        "candidate_uris": candidate_uris,
        "exploration": exploration,
        "alpha": alpha,
        "beta": beta,
        "gamma": gamma,
    }
    try:
        response = await client.post("/ranking/hybrid", json=payload)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise MLServiceError("Failed to contact ML service") from exc

    data = response.json()
    if "results" not in data or not isinstance(data["results"], list):
        raise MLServiceError("Unexpected ML service response")
    return data["results"]
