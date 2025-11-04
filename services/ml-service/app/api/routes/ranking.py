from __future__ import annotations

from typing import List

from fastapi import APIRouter

from ...schemas import HybridRecommendationRequest, HybridRecommendationResponse
from ...services.scoring import compute_hybrid_scores

router = APIRouter()


@router.post("/hybrid", summary="Compute hybrid ranking", response_model=HybridRecommendationResponse)
async def hybrid_ranking_endpoint(payload: HybridRecommendationRequest) -> HybridRecommendationResponse:
    scored = await compute_hybrid_scores(payload)
    return HybridRecommendationResponse(results=scored)
