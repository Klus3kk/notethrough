from __future__ import annotations

from typing import List, Optional, Literal

from pydantic import BaseModel, ConfigDict, Field


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

    model_config = ConfigDict(populate_by_name=True)


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
    uris: List[str] = Field(default_factory=list)
    spotify_user_id: Optional[str] = None
    seed_limit: int = Field(3, ge=1, le=5)


class RecommendationResponseItem(TrackSummary):
    similarity: float
    components: Optional[dict[str, float]] = None


class StoryInsight(BaseModel):
    title: str
    body: str
    metric: str


class JourneyStep(BaseModel):
    title: str
    description: str


class DiscoveryJourney(BaseModel):
    seed: str
    summary: str
    steps: List[JourneyStep]


class SpotifySeedTrack(BaseModel):
    track_uri: str
    track_name: str
    artist_names: str
    in_catalog: bool = True


class SpotifyUserPlaylist(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    tracks: Optional[int] = None


class TrackFeedback(BaseModel):
    track_uri: str
    verdict: Literal["up", "down"]
    spotify_user_id: Optional[str] = None
    seed_context: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
