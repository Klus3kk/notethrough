from __future__ import annotations

import base64
import time
from typing import Dict, List, Sequence

import httpx
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models import SpotifyToken, Track, UserTrack, UserPlaylist, PlaylistTrack
from ..schemas import SpotifySeedTrack


_LIBRARY_SYNC_TTL = 300  # seconds
_library_sync_memory: dict[str, float] = {}


class SpotifyServiceError(Exception):
    """Raised when Spotify data cannot be fetched or refreshed."""


async def _ensure_access_token(session: AsyncSession, token: SpotifyToken) -> str | None:
    now = int(time.time())
    if token.expires_at and token.expires_at - 90 > now:
        return token.access_token
    if not token.refresh_token:
        return token.access_token
    return await _refresh_access_token(session, token)


async def _refresh_access_token(session: AsyncSession, token: SpotifyToken) -> str | None:
    settings = get_settings()
    if not settings.spotify_client_id or not settings.spotify_client_secret:
        raise SpotifyServiceError("Spotify credentials are not configured")
    if not token.refresh_token:
        raise SpotifyServiceError("Spotify refresh token missing")

    credentials = f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode("utf-8")
    auth_header = base64.b64encode(credentials).decode("utf-8")
    data = {
        "grant_type": "refresh_token",
        "refresh_token": token.refresh_token,
    }
    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post("https://accounts.spotify.com/api/token", data=data, headers=headers)
    if response.status_code >= 400:
        raise SpotifyServiceError("Failed to refresh Spotify token")
    payload = response.json()
    token.access_token = payload.get("access_token", token.access_token)
    expires_in = int(payload.get("expires_in") or 3600)
    token.expires_at = int(time.time()) + expires_in
    if payload.get("refresh_token"):
        token.refresh_token = payload["refresh_token"]
    await session.commit()
    return token.access_token


async def _call_spotify_api(access_token: str, params: dict) -> httpx.Response:
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=20) as client:
        return await client.get(
            "https://api.spotify.com/v1/me/top/tracks",
            params=params,
            headers=headers,
        )


def _normalize_track_payload(payload: dict | None) -> tuple[str, str, str] | None:
    if not isinstance(payload, dict):
        return None
    track_obj = payload.get("track") if "track" in payload else payload
    if not isinstance(track_obj, dict):
        return None
    uri = track_obj.get("uri")
    name = track_obj.get("name")
    if not uri or not name:
        return None
    artists = ", ".join(
        artist.get("name")
        for artist in track_obj.get("artists", [])
        if isinstance(artist, dict) and artist.get("name")
    )
    return uri, name, artists


async def _pull_user_top_tracks(session: AsyncSession, user_id: str, limit: int, time_range: str = "medium_term") -> List[SpotifySeedTrack]:
    token = await session.get(SpotifyToken, user_id)
    if not token:
        raise SpotifyServiceError("Spotify account not linked.")
    access_token = await _ensure_access_token(session, token)
    if not access_token:
        raise SpotifyServiceError("Spotify access token unavailable.")

    params = {"limit": min(limit, 50), "time_range": time_range}
    response = await _call_spotify_api(access_token, params)

    # If unauthorized, try a single refresh attempt.
    if response.status_code == 401 and token.refresh_token:
        access_token = await _refresh_access_token(session, token)
        if not access_token:
            raise SpotifyServiceError("Unable to refresh Spotify token.")
        response = await _call_spotify_api(access_token, params)

    if response.status_code >= 400:
        raise SpotifyServiceError("Spotify API request failed.")

    tracks: List[SpotifySeedTrack] = []
    for item in response.json().get("items", []):
        normalized = _normalize_track_payload(item)
        if not normalized:
            continue
        uri, name, artists = normalized
        tracks.append(SpotifySeedTrack(track_uri=uri, track_name=name, artist_names=artists))
    return tracks


async def _annotate_catalog_membership(session: AsyncSession, tracks: Sequence[SpotifySeedTrack]) -> List[SpotifySeedTrack]:
    if not tracks:
        return []
    uris = [track.track_uri for track in tracks]
    rows = (
        await session.execute(select(Track.track_uri).where(Track.track_uri.in_(uris)))
    ).scalars().all()
    catalog = set(rows)
    annotated: List[SpotifySeedTrack] = []
    for track in tracks:
        annotated.append(
            track.model_copy(update={"in_catalog": track.track_uri in catalog})
        )
    return annotated


async def _fetch_saved_tracks(access_token: str, limit: int = 400) -> List[SpotifySeedTrack]:
    headers = {"Authorization": f"Bearer {access_token}"}
    collected: List[SpotifySeedTrack] = []
    url = "https://api.spotify.com/v1/me/tracks"
    params = {"limit": 50}
    async with httpx.AsyncClient(timeout=20) as client:
        next_url: str | None = url
        while next_url and len(collected) < limit:
            resp = await client.get(next_url, headers=headers, params=params if next_url == url else None)
            if resp.status_code >= 400:
                break
            data = resp.json()
            for item in data.get("items", []):
                normalized = _normalize_track_payload(item)
                if not normalized:
                    continue
                uri, name, artists = normalized
                collected.append(SpotifySeedTrack(track_uri=uri, track_name=name, artist_names=artists))
                if len(collected) >= limit:
                    break
            next_url = data.get("next")
            params = None
    return collected


async def _fetch_playlist_tracks(access_token: str, playlist_id: str, limit: int = 200) -> List[str]:
    headers = {"Authorization": f"Bearer {access_token}"}
    collected: List[str] = []
    url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
    params = {"limit": 100}
    async with httpx.AsyncClient(timeout=20) as client:
        next_url: str | None = url
        while next_url and len(collected) < limit:
            resp = await client.get(next_url, headers=headers, params=params if next_url == url else None)
            if resp.status_code >= 400:
                break
            data = resp.json()
            for item in data.get("items", []):
                normalized = _normalize_track_payload(item)
                if not normalized:
                    continue
                collected.append(normalized[0])
                if len(collected) >= limit:
                    break
            next_url = data.get("next")
            params = None
    return collected


async def _fetch_user_playlists(access_token: str, user_id: str, limit: int = 20) -> List[dict]:
    headers = {"Authorization": f"Bearer {access_token}"}
    playlists: List[dict] = []
    url = "https://api.spotify.com/v1/me/playlists"
    params = {"limit": 20}
    async with httpx.AsyncClient(timeout=20) as client:
        next_url: str | None = url
        while next_url and len(playlists) < limit:
            resp = await client.get(next_url, headers=headers, params=params if next_url == url else None)
            if resp.status_code >= 400:
                break
            data = resp.json()
            for item in data.get("items", []):
                playlist_id = item.get("id")
                owner_id = item.get("owner", {}).get("id")
                if not playlist_id or owner_id != user_id:
                    continue
                playlist = {
                    "id": playlist_id,
                    "name": item.get("name") or "Untitled playlist",
                    "description": item.get("description"),
                    "tracks_total": item.get("tracks", {}).get("total"),
                    "track_uris": [],
                }
                playlists.append(playlist)
                if len(playlists) >= limit:
                    break
            next_url = data.get("next")
            params = None

    for playlist in playlists:
        track_uris = await _fetch_playlist_tracks(access_token, playlist["id"])
        playlist["track_uris"] = list(dict.fromkeys(track_uris))
    return playlists


async def _persist_user_playlists(session: AsyncSession, user_id: str, playlists: List[dict]) -> None:
    existing_ids = (
        await session.execute(select(UserPlaylist.id).where(UserPlaylist.user_id == user_id))
    ).scalars().all()
    if existing_ids:
        await session.execute(delete(PlaylistTrack).where(PlaylistTrack.playlist_id.in_(existing_ids)))
    await session.execute(delete(UserPlaylist).where(UserPlaylist.user_id == user_id))
    await session.flush()

    for playlist in playlists:
        session.add(
            UserPlaylist(
                id=playlist["id"],
                user_id=user_id,
                name=playlist.get("name"),
                description=playlist.get("description"),
                tracks=playlist.get("tracks_total"),
            )
        )
        unique_uris = list(dict.fromkeys(playlist.get("track_uris") or []))
        if unique_uris:
            stmt = (
                insert(PlaylistTrack)
                .values([{"playlist_id": playlist["id"], "track_uri": uri} for uri in unique_uris])
                .on_conflict_do_nothing(index_elements=[PlaylistTrack.playlist_id, PlaylistTrack.track_uri])
            )
            await session.execute(stmt)
    await session.flush()
    await session.commit()


async def _persist_user_tracks(session: AsyncSession, user_id: str, weights: Dict[str, float]) -> None:
    if not weights:
        return
    await session.execute(delete(UserTrack).where(UserTrack.user_id == user_id))
    await session.flush()
    rows = [
        {"user_id": user_id, "track_uri": uri, "weight": float(weight)}
        for uri, weight in weights.items()
    ]
    if rows:
        insert_stmt = insert(UserTrack)
        stmt = insert_stmt.values(rows).on_conflict_do_update(
            index_elements=[UserTrack.user_id, UserTrack.track_uri],
            set_={"weight": insert_stmt.excluded.weight},
        )
        await session.execute(stmt)
    await session.commit()


async def sync_user_library(session: AsyncSession, user_id: str, saved_limit: int = 400) -> None:
    now = time.time()
    if _library_sync_memory.get(user_id, 0) + _LIBRARY_SYNC_TTL > now:
        return

    token = await session.get(SpotifyToken, user_id)
    if not token:
        raise SpotifyServiceError("Spotify account not linked.")
    access_token = await _ensure_access_token(session, token)
    if not access_token:
        raise SpotifyServiceError("Spotify access token unavailable.")

    range_weights = {
        "short_term": 1.0,
        "medium_term": 0.85,
        "long_term": 0.7,
    }
    weights: Dict[str, float] = {}

    for time_range, base_weight in range_weights.items():
        tracks = await _pull_user_top_tracks(session, user_id, limit=50, time_range=time_range)
        for idx, track in enumerate(tracks):
            weight = base_weight - idx * 0.01
            if weight <= 0:
                continue
            current = weights.get(track.track_uri, 0.0)
            if weight > current:
                weights[track.track_uri] = weight

    saved_tracks = await _fetch_saved_tracks(access_token, limit=saved_limit)
    for idx, track in enumerate(saved_tracks):
        weight = max(0.4 - idx * 0.001, 0.05)
        current = weights.get(track.track_uri, 0.0)
        if weight > current:
            weights[track.track_uri] = weight

    await _persist_user_tracks(session, user_id, weights)

    playlists = await _fetch_user_playlists(access_token, user_id, limit=20)
    await _persist_user_playlists(session, user_id, playlists)
    _library_sync_memory[user_id] = now


async def fetch_spotify_seed_tracks(
    session: AsyncSession,
    user_id: str,
    limit: int = 15,
    annotate_catalog: bool = False,
    time_range: str | None = None,
) -> List[SpotifySeedTrack]:
    ranges = ["short_term", "medium_term", "long_term"]
    if time_range in ranges:
        ranges = [time_range]

    seen: set[str] = set()
    tracks: List[SpotifySeedTrack] = []
    for tr in ranges:
        batch = await _pull_user_top_tracks(session, user_id, limit=min(limit, 50), time_range=tr)
        for track in batch:
            if track.track_uri in seen:
                continue
            seen.add(track.track_uri)
            tracks.append(track)
            if len(tracks) >= limit:
                break
        if len(tracks) >= limit:
            break
    if annotate_catalog:
        return await _annotate_catalog_membership(session, tracks)
    return tracks


async def fetch_spotify_seed_uris(session: AsyncSession, user_id: str, limit: int = 3) -> List[str]:
    try:
        await sync_user_library(session, user_id)
    except SpotifyServiceError:
        pass

    rows = (
        await session.execute(
            select(UserTrack.track_uri)
            .where(UserTrack.user_id == user_id)
            .order_by(UserTrack.weight.desc())
            .limit(max(limit * 5, 50))
        )
    ).scalars().all()

    if rows:
        dataset_rows = (
            await session.execute(select(Track.track_uri).where(Track.track_uri.in_(rows)))
        ).scalars().all()
        if dataset_rows:
            return dataset_rows[:limit]

    # Fallback to direct API fetch if sync failed or no matches
    raw_tracks = await fetch_spotify_seed_tracks(
        session,
        user_id,
        limit=min(limit * 5, 50),
        annotate_catalog=True,
    )
    available = [track.track_uri for track in raw_tracks if track.in_catalog]
    return available[:limit]
