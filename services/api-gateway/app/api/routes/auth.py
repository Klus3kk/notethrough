from __future__ import annotations

import base64
import secrets
import time
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...cache import get_client
from ...config import get_settings
from ...db import get_session, session_scope
from ...models import PlaylistTrack, SpotifyToken, SpotifyUser, Track, UserPlaylist
from ...schemas import SpotifySeedTrack, SpotifyUserPlaylist, StatsResponse, TrackSummary
from ...services.spotify import SpotifyServiceError, fetch_spotify_seed_tracks, sync_user_library
from ...services.user_stats import compute_user_library_stats
from ...utils import to_summary_schema

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
    if profile_data:
        await _persist_tokens(profile_data, token_data)
    return {
        "access_token": access_token,
        "refresh_token": token_data.get("refresh_token"),
        "expires_in": token_data.get("expires_in"),
        "scope": token_data.get("scope"),
        "token_type": token_data.get("token_type"),
        "profile": profile_data,
    }


async def _persist_tokens(profile: dict, token_data: dict) -> None:
    user_id = profile.get("id")
    if not user_id:
        return
    display_name = profile.get("display_name")
    email = profile.get("email")
    followers = profile.get("followers", {}).get("total") if isinstance(profile.get("followers"), dict) else None

    expires_in = int(token_data.get("expires_in") or 3600)
    expires_at = int(time.time()) + expires_in
    refresh_token = token_data.get("refresh_token")

    async with session_scope() as session:
        user = await session.get(SpotifyUser, user_id)
        if not user:
            user = SpotifyUser(id=user_id)
            session.add(user)
        user.display_name = display_name
        user.email = email
        user.followers = followers

        token = await session.get(SpotifyToken, user_id)
        if not token:
            token = SpotifyToken(user_id=user_id, access_token=token_data.get("access_token"), refresh_token=refresh_token, expires_at=expires_at)
            session.add(token)
        else:
            token.access_token = token_data.get("access_token")
            if refresh_token:
                token.refresh_token = refresh_token
            token.expires_at = expires_at

        await session.commit()


@router.get("/spotify/users/{user_id}/top-tracks", response_model=list[SpotifySeedTrack])
async def spotify_user_top_tracks(
    user_id: str,
    limit: int = Query(15, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
) -> list[SpotifySeedTrack]:
    try:
        return await fetch_spotify_seed_tracks(session, user_id, limit=limit, annotate_catalog=True)
    except SpotifyServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/spotify/users/{user_id}/stats", response_model=StatsResponse)
async def spotify_user_stats(
    user_id: str,
    session: AsyncSession = Depends(get_session),
) -> StatsResponse:
    await sync_user_library(session, user_id)
    stats = await compute_user_library_stats(session, user_id)
    if stats.totals.total_rows == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No Spotify data synced for this user")
    return stats


@router.get("/spotify/users/{user_id}/playlists", response_model=list[SpotifyUserPlaylist])
async def spotify_user_playlists(
    user_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[SpotifyUserPlaylist]:
    await sync_user_library(session, user_id)
    rows = (
        await session.execute(
            select(UserPlaylist).where(UserPlaylist.user_id == user_id)
        )
    ).scalars().all()
    return [
        SpotifyUserPlaylist(id=row.id, name=row.name, description=row.description, tracks=row.tracks)
        for row in rows
    ]


@router.get("/spotify/users/{user_id}/playlists/{playlist_id}/tracks", response_model=list[TrackSummary])
async def spotify_user_playlist_tracks(
    user_id: str,
    playlist_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[TrackSummary]:
    await sync_user_library(session, user_id)
    rows = (
        await session.execute(
            select(Track)
            .join(PlaylistTrack, PlaylistTrack.track_uri == Track.track_uri)
            .join(UserPlaylist, UserPlaylist.id == PlaylistTrack.playlist_id)
            .where(UserPlaylist.user_id == user_id, PlaylistTrack.playlist_id == playlist_id)
        )
    ).scalars().all()
    return [to_summary_schema(row) for row in rows]
