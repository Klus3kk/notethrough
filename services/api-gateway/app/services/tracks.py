from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy import and_, func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Track
from ..schemas import (
    DiscoveryJourney,
    JourneyStep,
    RecommendationResponseItem,
    StoryInsight,
    StatsResponse,
    Suggestion,
    TrackDetail,
    TrackSummary,
)
from ..utils import to_detail_schema, to_suggestion_schema, to_summary_schema
from .spotify import SpotifyServiceError, fetch_spotify_seed_uris
from .ml_client import MLServiceError, rank_candidates
from .user_stats import compute_user_library_stats


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


async def _resolve_seed_uris(
    session: AsyncSession,
    uris: List[str],
    spotify_user_id: str | None,
    seed_limit: int,
) -> List[str]:
    unique = [uri for uri in dict.fromkeys(uris) if uri]
    if unique:
        return unique[:seed_limit]
    if not spotify_user_id:
        return []
    try:
        return await fetch_spotify_seed_uris(session, spotify_user_id, limit=seed_limit)
    except SpotifyServiceError:
        return []


def _clamp_range(value: float, margin: float, min_value: float = 0.0, max_value: float = 1.0) -> tuple[float, float]:
    return max(min_value, value - margin), min(max_value, value + margin)


def _extract_seed_filters(seeds: List[Track]) -> tuple[list, dict[str, float]]:
    filters: list = []
    stats: dict[str, float] = {}

    years = [seed.release_year for seed in seeds if isinstance(seed.release_year, int)]
    if years:
        min_year = min(years) - 5
        max_year = max(years) + 5
        filters.append(Track.release_year.between(max(min_year, 1950), min(max_year, 2035)))
        stats["release_year"] = float(np.mean(years))

    energies = [seed.energy for seed in seeds if isinstance(seed.energy, (int, float))]
    if energies:
        energy_avg = float(np.mean(energies))
        filters.append(Track.energy.between(*_clamp_range(energy_avg, 0.2)))
        stats["energy"] = energy_avg

    dances = [seed.danceability for seed in seeds if isinstance(seed.danceability, (int, float))]
    if dances:
        dance_avg = float(np.mean(dances))
        filters.append(Track.danceability.between(*_clamp_range(dance_avg, 0.2)))
        stats["danceability"] = dance_avg

    valences = [seed.valence for seed in seeds if isinstance(seed.valence, (int, float))]
    if valences:
        valence_avg = float(np.mean(valences))
        filters.append(Track.valence.between(*_clamp_range(valence_avg, 0.25)))
        stats["valence"] = valence_avg

    genre_tokens: Dict[str, int] = {}
    for seed in seeds:
        if not seed.genres:
            continue
        for raw in seed.genres.split(","):
            token = raw.strip().lower()
            if token:
                genre_tokens[token] = genre_tokens.get(token, 0) + 1
    if genre_tokens:
        top_genres = sorted(genre_tokens.items(), key=lambda item: item[1], reverse=True)[:3]
        genre_filters = [
            Track.genres.ilike(f"%{genre}%")
            for genre, _ in top_genres
        ]
        if genre_filters:
            filters.append(or_(*genre_filters))

    return filters, stats


def _order_expressions(stats: dict[str, float]) -> List:
    orders: List = []
    if "release_year" in stats:
        target = stats["release_year"]
        orders.append(func.abs(func.coalesce(Track.release_year, target) - target))
    if "energy" in stats:
        target = stats["energy"]
        orders.append(func.abs(func.coalesce(Track.energy, target) - target))
    if "danceability" in stats:
        target = stats["danceability"]
        orders.append(func.abs(func.coalesce(Track.danceability, target) - target))
    if "valence" in stats:
        target = stats["valence"]
        orders.append(func.abs(func.coalesce(Track.valence, target) - target))
    return orders


def _candidate_statement(seed_uris: List[str], filters: Optional[list], stats: dict[str, float], limit: int) -> select:
    stmt = select(Track).where(~Track.track_uri.in_(seed_uris)).limit(max(limit * 10, 200))
    if filters:
        stmt = stmt.where(and_(*filters))
    orders = _order_expressions(stats)
    if orders:
        stmt = stmt.order_by(*orders, Track.track_uri)
    else:
        stmt = stmt.order_by(Track.track_uri)
    return stmt


async def fetch_recommendations(
    session: AsyncSession,
    uris: List[str],
    limit: int = 25,
    spotify_user_id: str | None = None,
    seed_limit: int = 3,
) -> List[RecommendationResponseItem]:
    seed_uris = await _resolve_seed_uris(session, uris, spotify_user_id, seed_limit)
    if not seed_uris:
        return []

    seeds = (await session.execute(select(Track).where(Track.track_uri.in_(seed_uris)))).scalars().all()
    if not seeds:
        return []

    filters, stats = _extract_seed_filters(seeds)
    candidate_stmt = _candidate_statement(seed_uris, filters, stats, limit)
    candidates = (await session.execute(candidate_stmt)).scalars().all()

    if not candidates:
        # fall back to a relaxed pool to guarantee output
        relaxed_stmt = _candidate_statement(seed_uris, None, {}, limit)
        candidates = (await session.execute(relaxed_stmt)).scalars().all()

    if not candidates:
        return []

    seeds_payload = []
    for seed in seeds:
        popularity = float(seed.popularity) if seed.popularity is not None else 50.0
        weight = max(popularity / 100.0, 0.01)
        seeds_payload.append({"track_uri": seed.track_uri, "weight": weight})
    candidate_map: Dict[str, Track] = {candidate.track_uri: candidate for candidate in candidates}
    candidate_uris = list(candidate_map.keys())

    ranked_items: Optional[List[Tuple[Track, float, Optional[Dict[str, float]]]]] = None
    try:
        ml_results = await rank_candidates(seeds_payload, candidate_uris)
        ranked_items = []
        for item in ml_results:
            uri = item.get("track_uri")
            if not isinstance(uri, str):
                continue
            track = candidate_map.get(uri)
            if track is None:
                continue
            score = float(item.get("score", 0.0))
            components = item.get("components")
            if not isinstance(components, dict):
                components = None
            ranked_items.append((track, score, components))
    except MLServiceError:
        ranked_items = None

    if not ranked_items:
        ranked_items = _fallback_rank(seeds, candidates)

    ranked_items.sort(key=lambda entry: entry[1], reverse=True)

    return [
        RecommendationResponseItem(
            **to_summary_schema(track).dict(),
            similarity=score,
            components=components,
        )
        for track, score, components in ranked_items[:limit]
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


async def build_story_insights(session: AsyncSession, user_id: str | None = None) -> List[StoryInsight]:
    if user_id:
        stats = await compute_user_library_stats(session, user_id)
        scope = "your library"
    else:
        stats = await compute_statistics(session)
        scope = "the catalog"

    if stats.totals.total_rows == 0:
        return []

    insights: List[StoryInsight] = []

    if stats.top_genres:
        top_genre = stats.top_genres[0]
        insights.append(
            StoryInsight(
                title=f"Top {top_genre['name']} wave",
                body=f"{scope.capitalize()} leans heavily into this genre—keep it in rotation.",
                metric=f"{top_genre['count']} tracks",
            )
        )

    avg_energy = stats.totals.average_energy
    avg_dance = stats.totals.average_danceability
    if avg_energy is not None and avg_dance is not None:
        tone = "uptempo" if avg_energy >= avg_dance else "laid-back"
        insights.append(
            StoryInsight(
                title="Energy vs danceability",
                body=f"{scope.capitalize()} skews toward {tone} mixes.",
                metric=f"Energy {avg_energy*100:.0f}% · Dance {avg_dance*100:.0f}%",
            )
        )

    release_span = stats.totals.release_year_range
    if release_span and release_span.get("min") and release_span.get("max"):
        insights.append(
            StoryInsight(
                title="Era coverage",
                body=f"Repertoire spans {release_span['min']}–{release_span['max']}, enabling multi-decade storytelling.",
                metric=f"{release_span['min']}–{release_span['max']}",
            )
        )

    return insights


async def build_discovery_journeys(session: AsyncSession, limit: int = 3, user_id: str | None = None) -> List[DiscoveryJourney]:
    journeys: List[DiscoveryJourney] = []
    if user_id:
        stats = await compute_user_library_stats(session, user_id)
        artists = [item["name"] for item in stats.top_artists if item.get("name")]
        genres = [item["name"] for item in stats.top_genres if item.get("name")]
        if not artists:
            return journeys
        for idx, artist in enumerate(artists[:limit]):
            anchor_genre = genres[idx] if idx < len(genres) else (genres[0] if genres else "adjacent scenes")
            steps = [
                JourneyStep(title="Start", description=f"Spin {artist}'s essentials to ground the vibe."),
                JourneyStep(title="Nearby influence", description=f"Blend other {anchor_genre} staples for cohesion."),
                JourneyStep(title="Stretch goal", description=f"Jump to adjacent genres to keep exploration fresh."),
            ]
            journeys.append(DiscoveryJourney(seed=artist, summary=f"{artist} → {anchor_genre} → discovery", steps=steps))
        return journeys

    rows = (
        await session.execute(
            select(
                Track.artist_names.label("artist"),
                func.count().label("count"),
                func.max(Track.record_label).label("label"),
                func.max(Track.genres).label("genres"),
            )
            .where(Track.artist_names.isnot(None))
            .group_by(Track.artist_names)
            .order_by(func.count().desc())
            .limit(limit)
        )
    ).all()

    for row in rows:
        artist = (row.artist or "Unknown").split(",")[0].strip()
        label = row.label or "Independent"
        genres = [g.strip() for g in (row.genres.split(",") if row.genres else []) if g.strip()]
        genre = genres[0] if genres else "adjacent scenes"
        steps = [
            JourneyStep(title="Seed", description=f"Start with {artist}'s best-known cuts."),
            JourneyStep(title="Label hop", description=f"Drill into other {label} releases for shared DNA."),
            JourneyStep(title="Genre quest", description=f"Blend nearby {genre} acts to surprise listeners."),
        ]
        journeys.append(DiscoveryJourney(seed=artist, summary=f"From {artist} → {label} → {genre}", steps=steps))
    return journeys


def _fallback_rank(seeds: List[Track], candidates: List[Track]) -> List[Tuple[Track, float, Optional[Dict[str, float]]]]:
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

    scored: list[Tuple[Track, float, Optional[Dict[str, float]]]] = []
    for candidate in candidates:
        vec = _vector(candidate)
        dist = np.linalg.norm(vec - centroid)
        similarity = float(1.0 / (1.0 + dist))
        scored.append((candidate, similarity, None))
    return scored
