from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ...db import get_session
from ...schemas import (
    RecommendationRequest,
    RecommendationResponseItem,
    StatsResponse,
    Suggestion,
    TrackDetail,
    TrackSummary,
)
from ...services.tracks import (
    fetch_recommendations,
    get_track_detail,
    search_tracks,
    suggest_tracks,
)
from ...stats import get_stats

router = APIRouter()


@router.get("/search", response_model=List[TrackSummary], summary="Search tracks")
async def search_endpoint(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(25, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> List[TrackSummary]:
    return await search_tracks(session, q, limit)


@router.get("/suggest", response_model=List[Suggestion], summary="Typeahead suggestions")
async def suggest_endpoint(
    q: str = Query(..., min_length=2),
    limit: int = Query(8, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
) -> List[Suggestion]:
    return await suggest_tracks(session, q, limit)  # type: ignore[return-value]


@router.get("/song/{track_uri}", response_model=TrackDetail, summary="Track detail")
async def song_detail_endpoint(
    track_uri: str,
    session: AsyncSession = Depends(get_session),
) -> TrackDetail:
    detail = await get_track_detail(session, track_uri)
    if not detail:
        raise HTTPException(status_code=404, detail="Track not found")
    return detail


@router.get("/stats", response_model=StatsResponse, summary="Dataset analytics")
async def stats_endpoint() -> StatsResponse:
    return await get_stats()


@router.post(
    "/recommend",
    response_model=List[RecommendationResponseItem],
    summary="Recommend similar tracks",
)
async def recommend_endpoint(
    payload: RecommendationRequest,
    session: AsyncSession = Depends(get_session),
) -> List[RecommendationResponseItem]:
    recs = await fetch_recommendations(session, payload.uris, limit=25)
    return recs
