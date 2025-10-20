from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class TrackSummary(BaseModel):
    track_uri: str = Field(alias="Track URI")
    track_name: str = Field(alias="Track Name")
    artist_names: Optional[str] = Field(alias="Artist Name(s)")
    album_name: Optional[str] = Field(alias="Album Name")
    release_date: Optional[str] = Field(alias="Release Date")
    release_year: Optional[int] = Field(alias="Release Year")
    popularity: Optional[float] = Field(alias="Popularity")
    genres: List[str] = Field(default_factory=list)
    danceability: Optional[float] = Field(alias="Danceability")
    energy: Optional[float] = Field(alias="Energy")
    valence: Optional[float] = Field(alias="Valence")
    tempo: Optional[float] = Field(alias="Tempo")

    class Config:
        allow_population_by_field_name = True


class TrackDetail(TrackSummary):
    duration_ms: Optional[float] = Field(alias="Duration (ms)")
    explicit: Optional[str] = Field(alias="Explicit")
    loudness: Optional[float] = Field(alias="Loudness")
    speechiness: Optional[float] = Field(alias="Speechiness")
    acousticness: Optional[float] = Field(alias="Acousticness")
    instrumentalness: Optional[float] = Field(alias="Instrumentalness")
    liveness: Optional[float] = Field(alias="Liveness")
    time_signature: Optional[int] = Field(alias="Time Signature")
    key: Optional[int] = Field(alias="Key")
    mode: Optional[int] = Field(alias="Mode")


class Suggestion(BaseModel):
    track_uri: str
    track_name: str
    artist_names: Optional[str]
    album_name: Optional[str]
    release_date: Optional[str]


class StatsTotals(BaseModel):
    total_rows: int
    unique_tracks: int
    unique_artists: int
    average_popularity: Optional[float]
    average_danceability: Optional[float]
    average_energy: Optional[float]
    release_year_range: dict


class StatsResponse(BaseModel):
    totals: StatsTotals
    top_artists: List[dict]
    top_genres: List[dict]
    yearly_release_counts: List[dict]
    top_tracks: List[dict]


class RecommendationRequest(BaseModel):
    uris: List[str]


class RecommendationResponseItem(TrackSummary):
    similarity: float
