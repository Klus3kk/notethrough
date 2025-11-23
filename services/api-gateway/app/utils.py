from __future__ import annotations

from typing import Dict

from .models import Track
from .schemas import Suggestion, TrackDetail, TrackSummary


def _genres_to_list(genres: str | None) -> list[str]:
    if not genres:
        return []
    cleaned = genres.replace("'", "").replace('"', "")
    return [genre.strip() for genre in cleaned.split(",") if genre.strip()]


def to_summary_schema(track: Track) -> TrackSummary:
    data: Dict[str, object] = {
        "Track URI": track.track_uri,
        "Track Name": track.track_name,
        "Album Name": track.album_name,
        "Artist Name(s)": track.artist_names,
        "Release Date": track.release_date,
        "Release Year": track.release_year,
        "Popularity": float(track.popularity) if track.popularity is not None else None,
        "Genres": _genres_to_list(track.genres),
        "Danceability": track.danceability,
        "Energy": track.energy,
        "Valence": track.valence,
        "Tempo": track.tempo,
    }
    return TrackSummary(**data)


def to_detail_schema(track: Track) -> TrackDetail:
    summary = to_summary_schema(track)
    data = summary.dict(by_alias=True)
    data.update(
        {
            "Duration (ms)": float(track.duration_ms) if track.duration_ms is not None else None,
            "Explicit": track.explicit,
            "Loudness": track.loudness,
            "Speechiness": track.speechiness,
            "Acousticness": track.acousticness,
            "Instrumentalness": track.instrumentalness,
            "Liveness": track.liveness,
            "Time Signature": track.time_signature,
            "Key": track.key,
            "Mode": track.mode,
        }
    )
    return TrackDetail(**data)


def to_suggestion_schema(track: Track) -> Suggestion:
    return Suggestion(
        track_uri=track.track_uri,
        track_name=track.track_name,
        artist_names=track.artist_names,
        album_name=track.album_name,
        release_date=track.release_date,
    )
