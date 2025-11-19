from __future__ import annotations

from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
from sqlalchemy import select

from ..config import get_settings
from ..db import get_session
from ..models import Track
from ..schemas import HybridRecommendationRequest, RankedTrack, SeedTrack

FEATURE_COLUMNS = [
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

_settings = get_settings()


async def compute_hybrid_scores(request: HybridRecommendationRequest) -> List[RankedTrack]:
    if not request.seeds or not request.candidate_uris:
        return []

    alpha, beta, gamma = _resolve_weights(request)

    async with get_session() as session:
        seed_uris = [seed.track_uri for seed in request.seeds]
        candidate_uris = list(dict.fromkeys(request.candidate_uris))

        seeds = await _fetch_tracks(session, seed_uris)
        if not seeds:
            return []

        seed_weights = _normalize_seed_weights(request.seeds, seeds)
        if not seed_weights:
            return []

        ordered_seed_uris = list(seed_weights.keys())
        seed_tracks = [seeds[uri] for uri in ordered_seed_uris]
        weight_values = [seed_weights[uri] for uri in ordered_seed_uris]

        centroid = _compute_weighted_centroid(seed_tracks, weight_values)

        candidates = await _fetch_tracks(session, candidate_uris)
        if not candidates:
            return []

        results: List[Tuple[str, float, Dict[str, float]]] = []
        for uri in candidate_uris:
            track = candidates.get(uri)
            if track is None:
                continue
            content_component = _content_similarity(track, centroid)
            collaborative_component = _collaborative_component(track)
            text_component = _text_component(track, seed_tracks)

            weights = np.array([alpha, beta, gamma], dtype=np.float32)
            components_array = np.array(
                [content_component, collaborative_component, text_component],
                dtype=np.float32,
            )
            score = float(np.dot(weights, components_array) / np.clip(weights.sum(), 1e-6, None))
            results.append(
                (
                    uri,
                    score,
                    {
                        "content": float(content_component),
                        "collaborative": float(collaborative_component),
                        "text": float(text_component),
                    },
                )
            )

    results.sort(key=lambda item: item[1], reverse=True)
    results = _apply_epsilon_greedy(results, request.exploration)

    return [
        RankedTrack(track_uri=uri, score=score, components=components)
        for uri, score, components in results
    ]


def _resolve_weights(request: HybridRecommendationRequest) -> Tuple[float, float, float]:
    alpha = request.alpha if request.alpha is not None else _settings.alpha
    beta = request.beta if request.beta is not None else _settings.beta
    gamma = request.gamma if request.gamma is not None else _settings.gamma
    return alpha, beta, gamma


async def _fetch_tracks(session, uris: Sequence[str]) -> Dict[str, Track]:
    if not uris:
        return {}
    rows = (await session.execute(select(Track).where(Track.track_uri.in_(uris)))).scalars().all()
    return {row.track_uri: row for row in rows}


def _normalize_seed_weights(seeds: Sequence[SeedTrack], track_map: Dict[str, Track]) -> Dict[str, float]:
    weighted = []
    for seed in seeds:
        track = track_map.get(seed.track_uri)
        if not track:
            continue
        weight = float(seed.weight) if seed.weight and seed.weight > 0 else 1.0
        weighted.append((seed.track_uri, weight))
    if not weighted:
        return {}
    weights = np.array([weight for _, weight in weighted], dtype=np.float32)
    weights_sum = float(weights.sum())
    if weights_sum <= 0:
        normalized = 1.0 / len(weighted)
        return {uri: normalized for uri, _ in weighted}
    return {uri: float(weight / weights_sum) for uri, weight in weighted}


def _track_vector(track: Track) -> np.ndarray:
    values: List[float] = []
    for column in FEATURE_COLUMNS:
        value = getattr(track, column.key)
        values.append(float(value) if value is not None else 0.0)
    return np.array(values, dtype=np.float32)


def _compute_weighted_centroid(tracks: Iterable[Track], weights: Iterable[float]) -> np.ndarray:
    vectors = []
    weight_list = []
    for track, weight in zip(tracks, weights):
        vectors.append(_track_vector(track))
        weight_list.append(weight)
    vectors_array = np.vstack(vectors)
    weights_array = np.array(weight_list, dtype=np.float32)
    if float(weights_array.sum()) <= 0:
        weights_array = np.full_like(weights_array, 1.0 / len(weights_array))
    return np.average(vectors_array, axis=0, weights=weights_array)


def _content_similarity(track: Track, centroid: np.ndarray) -> float:
    vec = _track_vector(track)
    if np.allclose(centroid, 0):
        return 0.5
    vec_norm = vec / np.linalg.norm(vec) if np.linalg.norm(vec) > 0 else vec
    centroid_norm = centroid / np.linalg.norm(centroid) if np.linalg.norm(centroid) > 0 else centroid
    similarity = float(np.clip(np.dot(vec_norm, centroid_norm), -1.0, 1.0))
    similarity = (similarity + 1.0) / 2.0
    return float(np.clip(similarity, 0.05, 0.95))


def _collaborative_component(track: Track) -> float:
    popularity = float(track.popularity) if track.popularity is not None else 0.0
    return float(np.clip(popularity / 100.0, 0.0, 1.0))


def _text_component(track: Track, seed_tracks: Iterable[Track]) -> float:
    candidate_year = track.release_year
    if candidate_year is None:
        return 0.5
    best = None
    for seed in seed_tracks:
        seed_year = seed.release_year
        if seed_year is None:
            continue
        diff = abs(candidate_year - seed_year)
        if best is None or diff < best:
            best = diff
    if best is None:
        return 0.5
    return float(np.clip(1.0 - min(best, 50) / 50.0, 0.0, 1.0))


def _apply_epsilon_greedy(results: List[Tuple[str, float, Dict[str, float]]], epsilon: float) -> List[Tuple[str, float, Dict[str, float]]]:
    if epsilon <= 0 or len(results) < 2:
        return results
    seed = hash(tuple(uri for uri, _, _ in results)) & 0xFFFFFFFF
    rng = np.random.default_rng(seed)
    exploration_span = max(1, int(round(epsilon * len(results))))
    exploration_span = min(exploration_span, len(results) - 1)
    swap_index = rng.integers(1, exploration_span + 1)
    mutable = results.copy()
    mutable[0], mutable[swap_index] = mutable[swap_index], mutable[0]
    return mutable
