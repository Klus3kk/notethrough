from __future__ import annotations

import pytest

from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(test_client: AsyncClient) -> None:
    response = await test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_root_metadata(test_client: AsyncClient) -> None:
    response = await test_client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert "message" in body
    assert "env=" in body["message"]
