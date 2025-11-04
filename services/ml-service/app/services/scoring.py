from __future__ import annotations

from typing import List

import numpy as np

from ..config import get_settings
from ..schemas import HybridRecommendationRequest, RankedTrack


def compute_hybrid_scores(request: HybridRecommendationRequest) -> List[RankedTrack]:
    """Placeholder hybrid scorer.

    In production this will query pgvector embeddings, collaborative models, and language models.
    For now we simulate deterministic but reproducible scores so downstream consumers can integrate.
    """
    settings = get_settings()
    alpha = request.alpha if request.alpha is not None else settings.alpha
    beta = request.beta if request.beta is not None else settings.beta
    gamma = request.gamma if request.gamma is not None else settings.gamma

    weights = np.array([alpha, beta, gamma], dtype=np.float32)
    weights = weights / np.clip(weights.sum(), 1e-6, None)

    rng = np.random.default_rng(42)
    results: List[RankedTrack] = []
    for uri in request.candidate_uris:
        components = rng.random(3)
        blended = float(np.dot(weights, components))
        results.append(
            RankedTrack(
                track_uri=uri,
                score=blended,
                components={
                    "content": float(components[0]),
                    "collaborative": float(components[1]),
                    "text": float(components[2]),
                },
            )
        )

    results.sort(key=lambda item: item.score, reverse=True)

    # basic epsilon-greedy exploration placeholder
    epsilon = request.exploration
    if epsilon > 0 and len(results) > 1:
        swap_index = min(int(np.floor(epsilon * len(results))), len(results) - 1)
        results[0], results[swap_index] = results[swap_index], results[0]

    return results
