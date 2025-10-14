from __future__ import annotations

import re
import sqlite3
from collections import Counter
from functools import lru_cache
from pathlib import Path

import os
import numpy as np
from flask import Flask, jsonify, render_template, request
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent


def _resolve_sqlite_file() -> Path:
    configured_path = os.environ.get("SPOTIFY_DATA_PATH")
    if configured_path:
        candidate = Path(configured_path)
        if not candidate.is_absolute():
            candidate = (BASE_DIR / candidate).resolve()
        return candidate
    return BASE_DIR / "data" / "combined_spotify_tracks.sqlite"


DATA_FILE = _resolve_sqlite_file()
DATA_COLUMNS = [
    "Track URI",
    "Track Name",
    "Album Name",
    "Artist Name(s)",
    "Release Date",
    "Duration (ms)",
    "Popularity",
    "Explicit",
    "Genres",
    "Danceability",
    "Energy",
    "Loudness",
    "Speechiness",
    "Acousticness",
    "Instrumentalness",
    "Liveness",
    "Valence",
    "Tempo",
    "Time Signature",
    "Key",
    "Mode",
]

NUMERIC_COLUMNS: dict[str, str] = {
    "Duration (ms)": "Int64",
    "Popularity": "Int64",
    "Danceability": "float",
    "Energy": "float",
    "Loudness": "float",
    "Speechiness": "float",
    "Acousticness": "float",
    "Instrumentalness": "float",
    "Liveness": "float",
    "Valence": "float",
    "Tempo": "float",
    "Time Signature": "Int64",
    "Key": "Int64",
    "Mode": "Int64",
}

BOOL_COLUMNS = ["Explicit"]

SEARCH_COLUMNS = [
    "Track URI",
    "Track Name",
    "Artist Name(s)",
    "Album Name",
    "Release Date",
    "Release Year",
    "Popularity",
    "Genres",
    "Danceability",
    "Energy",
    "Valence",
    "Tempo",
]

DETAIL_COLUMNS = [
    "Track URI",
    "Track Name",
    "Album Name",
    "Artist Name(s)",
    "Release Date",
    "Release Year",
    "Popularity",
    "Explicit",
    "Genres",
    "Duration (ms)",
    "Danceability",
    "Energy",
    "Loudness",
    "Speechiness",
    "Acousticness",
    "Instrumentalness",
    "Liveness",
    "Valence",
    "Tempo",
    "Time Signature",
    "Key",
    "Mode",
]

FEATURE_COLUMNS = [
    "Danceability",
    "Energy",
    "Valence",
    "Tempo",
    "Liveness",
    "Acousticness",
    "Speechiness",
    "Instrumentalness",
    "Loudness",
    "Duration (ms)",
    "Popularity",
]

RECOMMEND_COLUMNS = SEARCH_COLUMNS + ["Duration (ms)", "similarity"]

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False


def _normalize_text(value: pd.Series) -> pd.Series:
    return (
        value.fillna("")
        .str.lower()
        .str.replace(r"[^a-z0-9]+", " ", regex=True)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
    )


def _ensure_dataset() -> None:
    if not DATA_FILE.exists():
        env_hint = os.environ.get("SPOTIFY_DATA_PATH")
        hint = (
            f"Dataset not found at {DATA_FILE}. "
            "Set SPOTIFY_DATA_PATH to the SQLite database location."
        )
        if env_hint:
            hint += f" (current SPOTIFY_DATA_PATH={env_hint})"
        raise FileNotFoundError(hint)


def _connect() -> sqlite3.Connection:
    _ensure_dataset()
    conn = sqlite3.connect(DATA_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def _split_genres(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [genre.strip() for genre in raw.split(",") if genre.strip()]


def _row_to_dict(row: sqlite3.Row) -> dict:
    record = dict(row)
    record["Genres"] = _split_genres(record.get("Genres"))
    return record


@lru_cache(maxsize=1)
def _dataset_summary() -> dict[str, object]:
    totals = {
        "total_rows": 0,
        "unique_tracks": 0,
        "unique_artists": 0,
        "average_popularity": None,
        "average_danceability": None,
        "average_energy": None,
        "release_year_range": {"min": None, "max": None},
    }
    artist_counter: Counter[str] = Counter()
    genre_counter: Counter[str] = Counter()
    yearly_counter: Counter[int] = Counter()

    pop_sum = 0.0
    pop_count = 0
    dance_sum = 0.0
    dance_count = 0
    energy_sum = 0.0
    energy_count = 0

    seen_tracks = set()
    seen_artists = set()

    with _connect() as conn:
        cursor = conn.execute(
            """
            SELECT
                "Track URI",
                "Artist Name(s)",
                "Genres",
                "Release Year",
                "Popularity",
                "Danceability",
                "Energy"
            FROM tracks
            """
        )
        while True:
            rows = cursor.fetchmany(10000)
            if not rows:
                break
            for row in rows:
                totals["total_rows"] += 1
                track_uri = row["Track URI"]
                artist = row["Artist Name(s)"] or ""

                if track_uri not in seen_tracks:
                    seen_tracks.add(track_uri)
                if artist:
                    artist_counter[artist] += 1
                    if artist not in seen_artists:
                        seen_artists.add(artist)

                if row["Popularity"] is not None:
                    pop_sum += row["Popularity"]
                    pop_count += 1
                if row["Danceability"] is not None:
                    dance_sum += row["Danceability"]
                    dance_count += 1
                if row["Energy"] is not None:
                    energy_sum += row["Energy"]
                    energy_count += 1

                if row["Release Year"] is not None:
                    year = int(row["Release Year"])
                    yearly_counter[year] += 1

                genres = row["Genres"] or ""
                for genre in genres.split(","):
                    genre = genre.strip()
                    if genre:
                        genre_counter[genre] += 1

    totals["unique_tracks"] = len(seen_tracks)
    totals["unique_artists"] = len(seen_artists)
    if pop_count:
        totals["average_popularity"] = round(pop_sum / pop_count, 2)
    if dance_count:
        totals["average_danceability"] = round(dance_sum / dance_count, 2)
    if energy_count:
        totals["average_energy"] = round(energy_sum / energy_count, 2)
    if yearly_counter:
        totals["release_year_range"]["min"] = min(yearly_counter)
        totals["release_year_range"]["max"] = max(yearly_counter)

    def _top(counter: Counter[str], limit: int) -> list[dict]:
        return [
            {"name": name, "count": count}
            for name, count in counter.most_common(limit)
        ]

    top_tracks = []
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT "Track URI", "Track Name", "Artist Name(s)", "Popularity"
            FROM tracks
            WHERE "Popularity" IS NOT NULL
            ORDER BY "Popularity" DESC
            LIMIT 10
            """
        ).fetchall()
        top_tracks = [dict(row) for row in rows]

    yearly_release_counts = [
        {"year": year, "count": count}
        for year, count in sorted(yearly_counter.items())
    ]

    return {
        "totals": totals,
        "top_artists": _top(artist_counter, 10),
        "top_genres": _top(genre_counter, 15),
        "yearly_release_counts": yearly_release_counts,
        "top_tracks": top_tracks,
    }


@lru_cache(maxsize=1)
def _has_search_text_column() -> bool:
    with _connect() as conn:
        columns = conn.execute("PRAGMA table_info(tracks)").fetchall()
    return any(col[1] == "search_text" for col in columns)


def _search_songs(query: str, limit: int = 25) -> list[dict]:
    normalized = query.strip().lower()
    if len(normalized) < 2:
        return []

    tokens = [token for token in normalized.split() if token]
    if not tokens:
        return []

    if _has_search_text_column():
        column_expr = "search_text"
    else:
        column_expr = (
            "LOWER(COALESCE(""Track Name"", '')) || ' ' || "
            "LOWER(COALESCE(""Artist Name(s)"", '')) || ' ' || "
            "LOWER(COALESCE(""Album Name"", ''))"
        )

    like_clauses = " AND ".join(f"{column_expr} LIKE ?" for _ in tokens)
    params = [f"%{token}%" for token in tokens]

    with _connect() as conn:
        records = conn.execute(
            f"""
            SELECT
                "Track URI",
                "Track Name",
                "Artist Name(s)",
                "Album Name",
                "Release Date",
                "Release Year",
                "Popularity",
                "Genres",
                "Danceability",
                "Energy",
                "Valence",
                "Tempo"
            FROM tracks
            WHERE {like_clauses}
            ORDER BY "Popularity" DESC
            LIMIT ?
            """,
            (*params, limit),
        ).fetchall()

    return [_row_to_dict(row) for row in records]


def _song_detail(uri: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT * FROM tracks WHERE "Track URI" = ?
            """,
            (uri,),
        ).fetchone()
    return _row_to_dict(row) if row else None


def _fetch_tracks_by_uris(uris: list[str]) -> list[dict]:
    if not uris:
        return []
    placeholders = ",".join("?" for _ in uris)
    order_clause = "CASE " + " ".join(
        f'WHEN "Track URI" = ? THEN {index}' for index, _ in enumerate(uris)
    ) + " END"
    params = [*uris, *uris]
    with _connect() as conn:
        rows = conn.execute(
            f"""
            SELECT *
            FROM tracks
            WHERE "Track URI" IN ({placeholders})
            ORDER BY {order_clause}
            """,
            params,
        ).fetchall()
    return [_row_to_dict(row) for row in rows]

def _feature_data():
    with _connect() as conn:
        df = pd.read_sql_query(
            """
            SELECT
                "Track URI",
                "Genres",
                "Popularity",
                "Danceability",
                "Energy",
                "Valence",
                "Tempo",
                "Liveness",
                "Acousticness",
                "Speechiness",
                "Instrumentalness",
                "Loudness",
                "Duration (ms)"
            FROM tracks
            """,
            conn,
        )

    features = df[FEATURE_COLUMNS].astype("float32").fillna(0.0)
    normalized = (features - features.mean()).div(features.std().replace(0, 1)).fillna(0.0)
    uri_to_index = {uri: idx for idx, uri in enumerate(df["Track URI"])}
    genre_sets = [frozenset(_split_genres(genres)) for genres in df["Genres"]]

    return {
        "uris": df["Track URI"].tolist(),
        "uri_to_index": uri_to_index,
        "normalized": normalized.to_numpy(dtype="float32"),
        "genre_sets": genre_sets,
        "popularity": df["Popularity"].fillna(0.0).to_numpy(dtype="float32"),
    }


@lru_cache(maxsize=1)
def _feature_cache():
    return _feature_data()


def _serialize_records(records: list[dict], columns: list[str]) -> list[dict]:
    result = []
    for record in records:
        filtered = {col: record.get(col) for col in columns if col in record}
        result.append(filtered)
    return result


def _recommend_tracks(uris: list[str], limit: int = 20) -> list[dict]:
    if not uris:
        return []

    data = _feature_cache()
    uri_to_index = data["uri_to_index"]
    seed_indices = [uri_to_index.get(uri) for uri in uris if uri_to_index.get(uri) is not None]
    if not seed_indices:
        return []

    normalized = data["normalized"]
    centroid = normalized[seed_indices].mean(axis=0)
    deltas = normalized - centroid
    distances = np.sqrt((deltas ** 2).sum(axis=1))
    for idx in seed_indices:
        distances[idx] = np.inf

    candidate_pool_size = min(max(limit * 6, 60), len(distances))
    candidate_indices = np.argpartition(distances, candidate_pool_size - 1)[:candidate_pool_size]

    feature_similarity = 1.0 / (1.0 + distances[candidate_indices])

    seed_genres = set().union(*(data["genre_sets"][idx] for idx in seed_indices))
    genre_similarity = []
    for idx in candidate_indices:
        candidate_genres = data["genre_sets"][idx]
        if not seed_genres or not candidate_genres:
            genre_similarity.append(0.0)
            continue
        intersection = len(seed_genres & candidate_genres)
        union = len(seed_genres | candidate_genres)
        genre_similarity.append(intersection / union if union else 0.0)
    genre_similarity = np.array(genre_similarity, dtype="float32")

    seed_popularity = data["popularity"][seed_indices]
    pop_mean = seed_popularity.mean() if len(seed_popularity) else 0.0
    candidate_popularity = data["popularity"][candidate_indices]
    pop_similarity = 1 - (np.abs(candidate_popularity - pop_mean) / 100.0)
    pop_similarity = np.clip(pop_similarity, 0.0, 1.0)

    combined = feature_similarity * 0.6 + genre_similarity * 0.3 + pop_similarity * 0.1
    top_order = np.argsort(-combined)[:limit]
    top_indices = candidate_indices[top_order]
    top_scores = combined[top_order]
    uris_ordered = [data["uris"][idx] for idx in top_indices]

    tracks = _fetch_tracks_by_uris(uris_ordered)
    score_map = dict(zip(uris_ordered, top_scores.round(4)))
    for track in tracks:
        track["similarity"] = float(score_map.get(track["Track URI"], 0.0))
    return tracks


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/search")
def search():
    query = request.args.get("q", "")
    results = _search_songs(query, limit=25)
    records = _serialize_records(results, SEARCH_COLUMNS)
    return jsonify(records)


@app.route("/suggest")
def suggest():
    query = request.args.get("q", "")
    results = _search_songs(query, limit=8)
    records = _serialize_records(
        results,
        ["Track URI", "Track Name", "Artist Name(s)", "Album Name", "Release Date"],
    )
    return jsonify(records)


@app.route("/song")
def song_detail():
    uri = request.args.get("uri", "").strip()
    if not uri:
        return jsonify({"error": "Missing track URI."}), 400

    record = _song_detail(uri)
    if not record:
        return jsonify({"error": "Track not found."}), 404
    filtered = _serialize_records([record], DETAIL_COLUMNS)[0]
    return jsonify(filtered)


@app.route("/stats")
def stats():
    return jsonify(_dataset_summary())


@app.route("/recommend", methods=["POST"])
def recommend():
    payload = request.get_json(silent=True) or {}
    uris = payload.get("uris") or []

    if isinstance(uris, str):
        uris = [uris]

    if not isinstance(uris, list):
        return jsonify({"error": "Expected 'uris' to be a list of track URIs."}), 400

    cleaned = [uri.strip() for uri in uris if isinstance(uri, str) and uri.strip()]
    if not cleaned:
        return jsonify({"error": "Provide at least one track URI."}), 400

    recommendations = _recommend_tracks(cleaned, limit=25)
    records = _serialize_records(recommendations, RECOMMEND_COLUMNS)
    return jsonify(records)


if __name__ == "__main__":
    app.run(debug=True)
