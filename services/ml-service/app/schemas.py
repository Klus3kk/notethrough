from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field, conlist


class SeedTrack(BaseModel):
    track_uri: str = Field(..., description="Canonical track URI (spotify:track:…)" )
    weight: float = Field(1.0, ge=0.0, description="Optional per-seed weight")


class HybridRecommendationRequest(BaseModel):
    seeds: conlist(SeedTrack, min_length=1) = Field(..., description="Seed tracks driving the hybrid rank")
    candidate_uris: conlist(str, min_length=1) = Field(..., description="Candidate track URIs to score")
    exploration: float = Field(0.05, ge=0.0, le=1.0, description="Bandit exploration rate (ε)")
    alpha: float | None = Field(None, ge=0.0, le=1.0, description="Override for content weight")
    beta: float | None = Field(None, ge=0.0, le=1.0, description="Override for collaborative weight")
    gamma: float | None = Field(None, ge=0.0, le=1.0, description="Override for text weight")


class RankedTrack(BaseModel):
    track_uri: str
    score: float
    components: dict[str, float]


class HybridRecommendationResponse(BaseModel):
    results: List[RankedTrack]
