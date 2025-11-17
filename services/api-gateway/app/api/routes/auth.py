from __future__ import annotations

import base64
import secrets
import time
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, status

from ...cache import get_client
from ...config import get_settings

STATE_TTL_SECONDS = 600
_state_memory: dict[str, float] = {}

router = APIRouter(prefix="/auth", tags=["auth"])


def _require_spotify_settings():
    settings = get_settings()
    if not (settings.spotify_client_id and settings.spotify_client_secret and settings.spotify_redirect_uri):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Spotify credentials are not configured")
    return settings


async def _store_state_token(state: str) -> None:
    client = await get_client()
    key = f"spotify:state:{state}"
    if client:
        await client.setex(key, STATE_TTL_SECONDS, "1")
    else:
        _state_memory[state] = time.time() + STATE_TTL_SECONDS


async def _validate_state_token(state: str) -> None:
    client = await get_client()
    key = f"spotify:state:{state}"
    if client:
        exists = await client.get(key)
        if not exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
        await client.delete(key)
        return
    expiry = _state_memory.get(state)
    if not expiry or expiry < time.time():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
    _state_memory.pop(state, None)


@router.get("/spotify/login")
async def spotify_login() -> dict[str, str]:
    settings = _require_spotify_settings()
    state = secrets.token_urlsafe(24)
    params = {
        "response_type": "code",
        "client_id": settings.spotify_client_id,
        "scope": settings.spotify_scopes,
        "redirect_uri": settings.spotify_redirect_uri,
        "state": state,
        "show_dialog": "false",
    }
    await _store_state_token(state)
    auth_url = f"https://accounts.spotify.com/authorize?{urlencode(params)}"
    return {"auth_url": auth_url, "state": state}


@router.get("/spotify/callback")
async def spotify_callback(code: str | None = None, state: str | None = None) -> dict:
    if not code or not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization parameters")
    settings = _require_spotify_settings()
    await _validate_state_token(state)
    token_url = "https://accounts.spotify.com/api/token"
    auth_header = base64.b64encode(
        f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode("utf-8")
    ).decode("utf-8")
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.spotify_redirect_uri,
    }
    headers = {"Authorization": f"Basic {auth_header}", "Content-Type": "application/x-www-form-urlencoded"}
    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(token_url, data=data, headers=headers)
    if token_resp.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to exchange Spotify code")
    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Spotify did not return an access token")
    profile_data: dict | None = None
    async with httpx.AsyncClient(timeout=15) as client:
        profile_resp = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if profile_resp.status_code < 400:
            profile_data = profile_resp.json()
    return {
        "access_token": access_token,
        "refresh_token": token_data.get("refresh_token"),
        "expires_in": token_data.get("expires_in"),
        "scope": token_data.get("scope"),
        "token_type": token_data.get("token_type"),
        "profile": profile_data,
    }
