from __future__ import annotations

from collections import Counter
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Track, UserTrack
from ..schemas import StatsResponse, StatsTotals


def _empty_stats() -> StatsResponse:
    return StatsResponse(
        totals=StatsTotals(
            total_rows=0,
            unique_tracks=0,
            unique_artists=0,
            average_popularity=None,
            average_danceability=None,
            average_energy=None,
            release_year_range={"min": None, "max": None},
        ),
        top_artists=[],
        top_genres=[],
        yearly_release_counts=[],
        top_tracks=[],
    )


async def compute_user_library_stats(session: AsyncSession, user_id: str) -> StatsResponse:
    records = (
        await session.execute(
            select(Track, UserTrack.weight)
            .join(UserTrack, Track.track_uri == UserTrack.track_uri)
            .where(UserTrack.user_id == user_id)
        )
    ).all()

    if not records:
        return _empty_stats()

    tracks: List[Track] = []
    weights: dict[str, float] = {}
    for track, weight in records:
        tracks.append(track)
        weights[track.track_uri] = float(weight or 0.0)

    total_rows = len(tracks)
    unique_track_uris = {track.track_uri for track in tracks}
    unique_tracks = len(unique_track_uris)
    artist_tokens = []
    genres_tokens = []
    release_years = []
    pop_values = []
    dance_values = []
    energy_values = []

    for track in tracks:
        if track.artist_names:
            for artist in track.artist_names.split(","):
                artist_tokens.append(artist.strip())
        if track.genres:
            for genre in track.genres.split(","):
                genres_tokens.append(genre.strip().lower())
        if track.release_year is not None:
            release_years.append(int(track.release_year))
        if track.popularity is not None:
            pop_values.append(float(track.popularity))
        if track.danceability is not None:
            dance_values.append(float(track.danceability))
        if track.energy is not None:
            energy_values.append(float(track.energy))

    unique_artists = len({token for token in artist_tokens if token})

    def _average(values: list[float]) -> float | None:
        return sum(values) / len(values) if values else None

    release_range = {
        "min": min(release_years) if release_years else None,
        "max": max(release_years) if release_years else None,
    }

    top_artists = [
        {"name": name, "count": count}
        for name, count in Counter(token for token in artist_tokens if token).most_common(10)
    ]

    top_genres = [
        {"name": name, "count": count}
        for name, count in Counter(token for token in genres_tokens if token).most_common(15)
    ]

    yearly_counts = [
        {"year": year, "count": count}
        for year, count in Counter(release_years).most_common()
    ]
    yearly_counts.sort(key=lambda item: item["year"])

    top_tracks = sorted(
        [
            {
                "Track URI": track.track_uri,
                "Track Name": track.track_name,
                "Artist Name(s)": track.artist_names,
                "Popularity": float(track.popularity) if track.popularity is not None else None,
                "weight": weights.get(track.track_uri, 0.0),
            }
            for track in tracks
        ],
        key=lambda item: (item["weight"], item.get("Popularity") or 0.0),
        reverse=True,
    )[:10]

    for item in top_tracks:
        item.pop("weight", None)

    totals = StatsTotals(
        total_rows=total_rows,
        unique_tracks=unique_tracks,
        unique_artists=unique_artists,
        average_popularity=_average(pop_values),
        average_danceability=_average(dance_values),
        average_energy=_average(energy_values),
        release_year_range=release_range,
    )

    return StatsResponse(
        totals=totals,
        top_artists=top_artists,
        top_genres=top_genres,
        yearly_release_counts=yearly_counts,
        top_tracks=top_tracks,
    )
