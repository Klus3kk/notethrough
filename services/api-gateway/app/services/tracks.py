from __future__ import annotations

from typing import List

import numpy as np
from sqlalchemy import and_, func, literal, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Track
from ..schemas import (
    RecommendationResponseItem,
    StatsResponse,
    Suggestion,
    TrackDetail,
    TrackSummary,
)
from ..utils import to_detail_schema, to_suggestion_schema, to_summary_schema


async def search_tracks(session: AsyncSession, query: str, limit: int = 25) -> List[TrackSummary]:
    tokens = [token.strip().lower() for token in query.split() if token.strip()]
    if not tokens:
        return []

    if hasattr(Track, "search_text"):
        column_expr = func.lower(func.coalesce(Track.search_text, ""))
    else:
        column_expr = func.lower(
            func.coalesce(Track.track_name, "")
            + literal(" ")
            + func.coalesce(Track.artist_names, "")
            + literal(" ")
            + func.coalesce(Track.album_name, "")
        )
    conditions = [column_expr.like(f"%{token}%") for token in tokens]

    stmt = (
        select(Track)
        .where(and_(*conditions))
        .order_by(Track.popularity.desc().nullslast())
        .limit(limit)
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [to_summary_schema(track) for track in rows]


async def suggest_tracks(session: AsyncSession, query: str, limit: int = 8) -> List[Suggestion]:
    tokens = [token.strip().lower() for token in query.split() if token.strip()]
    if not tokens:
        return []

    if hasattr(Track, "search_text"):
        column_expr = func.lower(func.coalesce(Track.search_text, ""))
    else:
        column_expr = func.lower(
            func.coalesce(Track.track_name, "")
            + literal(" ")
            + func.coalesce(Track.artist_names, "")
            + literal(" ")
            + func.coalesce(Track.album_name, "")
        )
    conditions = [column_expr.like(f"%{token}%") for token in tokens]

    stmt = (
        select(Track)
        .where(and_(*conditions))
        .order_by(Track.popularity.desc().nullslast())
        .limit(limit)
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [to_suggestion_schema(track) for track in rows]


async def get_track_detail(session: AsyncSession, uri: str) -> TrackDetail | None:
    row = (await session.execute(select(Track).where(Track.track_uri == uri))).scalar_one_or_none()
    if not row:
        return None
    return to_detail_schema(row)


async def fetch_recommendations(session: AsyncSession, uris: List[str], limit: int = 25) -> List[RecommendationResponseItem]:
    if not uris:
        return []

    seeds = (await session.execute(select(Track).where(Track.track_uri.in_(uris)))).scalars().all()
    if not seeds:
        return []

    feature_columns = [
        Track.danceability,
        Track.energy,
        Track.valence,
        Track.tempo,
        Track.liveness,
        Track.acousticness,
        Track.speechiness,
        Track.instrumentalness,
        Track.loudness,
        Track.duration_ms,
        Track.popularity,
    ]

    def _vector(track: Track) -> np.ndarray:
        values: list[float] = []
        for column in feature_columns:
            value = getattr(track, column.key)
            values.append(float(value) if value is not None else 0.0)
        return np.array(values, dtype=np.float32)

    seed_matrix = np.vstack([_vector(seed) for seed in seeds])
    centroid = seed_matrix.mean(axis=0)

    candidate_stmt = (
        select(Track)
        .where(~Track.track_uri.in_(uris))
        .order_by(Track.popularity.desc().nullslast())
        .limit(max(limit * 10, 200))
    )
    candidates = (await session.execute(candidate_stmt)).scalars().all()
    if not candidates:
        return []

    scored: list[tuple[Track, float]] = []
    for candidate in candidates:
        vec = _vector(candidate)
        dist = np.linalg.norm(vec - centroid)
        similarity = float(1.0 / (1.0 + dist))
        scored.append((candidate, similarity))

    scored.sort(key=lambda item: item[1], reverse=True)
    scored = scored[:limit]

    return [
        RecommendationResponseItem(**to_summary_schema(track).dict(), similarity=score)
        for track, score in scored
    ]


async def compute_statistics(session: AsyncSession) -> StatsResponse:
    totals_row = (
        await session.execute(
            select(
                func.count(Track.track_uri),
                func.count(func.distinct(Track.track_uri)),
                func.count(func.distinct(Track.artist_names)),
                func.avg(Track.popularity),
                func.avg(Track.danceability),
                func.avg(Track.energy),
                func.min(Track.release_year),
                func.max(Track.release_year),
            )
        )
    ).first()

    totals = {
        "total_rows": int(totals_row[0] or 0),
        "unique_tracks": int(totals_row[1] or 0),
        "unique_artists": int(totals_row[2] or 0),
        "average_popularity": float(totals_row[3]) if totals_row[3] is not None else None,
        "average_danceability": float(totals_row[4]) if totals_row[4] is not None else None,
        "average_energy": float(totals_row[5]) if totals_row[5] is not None else None,
        "release_year_range": {
            "min": int(totals_row[6]) if totals_row[6] is not None else None,
            "max": int(totals_row[7]) if totals_row[7] is not None else None,
        },
    }

    top_artists_rows = (
        await session.execute(
            select(Track.artist_names, func.count())
            .group_by(Track.artist_names)
            .order_by(func.count().desc())
            .limit(10)
        )
    ).all()
    top_artists = [
        {"name": row[0], "count": int(row[1])}
        for row in top_artists_rows
        if row[0]
    ]

    top_genres_rows = (
        await session.execute(
            select(Track.genres)
            .where(Track.genres.isnot(None))
            .limit(10000)
        )
    ).all()
    genre_counter: dict[str, int] = {}
    for row in top_genres_rows:
        for genre in (row[0] or "").split(","):
            genre = genre.strip()
            if genre:
                genre_counter[genre] = genre_counter.get(genre, 0) + 1
    top_genres = [
        {"name": name, "count": count}
        for name, count in sorted(genre_counter.items(), key=lambda item: item[1], reverse=True)[:15]
    ]

    yearly_rows = (
        await session.execute(
            select(Track.release_year, func.count())
            .where(Track.release_year.isnot(None))
            .group_by(Track.release_year)
            .order_by(Track.release_year)
        )
    ).all()
    yearly_counts = [
        {"year": int(row[0]), "count": int(row[1])}
        for row in yearly_rows
    ]

    top_tracks_rows = (
        await session.execute(
            select(Track.track_uri, Track.track_name, Track.artist_names, Track.popularity)
            .order_by(Track.popularity.desc().nullslast())
            .limit(10)
        )
    ).all()
    top_tracks = [
        {
            "Track URI": row[0],
            "Track Name": row[1],
            "Artist Name(s)": row[2],
            "Popularity": float(row[3]) if row[3] is not None else None,
        }
        for row in top_tracks_rows
    ]

    return StatsResponse(
        totals=totals,
        top_artists=top_artists,
        top_genres=top_genres,
        yearly_release_counts=yearly_counts,
        top_tracks=top_tracks,
    )
