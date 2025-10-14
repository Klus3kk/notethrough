from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request
import os

BASE_DIR = Path(__file__).resolve().parent

def _resolve_data_file() -> Path:
    configured_path = os.environ.get("SPOTIFY_DATA_PATH")
    if configured_path:
        candidate = Path(configured_path)
        if not candidate.is_absolute():
            candidate = (BASE_DIR / candidate).resolve()
        return candidate
    return BASE_DIR / "data" / "combined_spotify_tracks.csv"

DATA_FILE = _resolve_data_file()
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


def _load_dataset() -> pd.DataFrame:
    if not DATA_FILE.exists():
        env_hint = os.environ.get("SPOTIFY_DATA_PATH")
        hint = (
            f"Dataset not found at {DATA_FILE}. "
            "Set the SPOTIFY_DATA_PATH environment variable to the dataset location."
        )
        if env_hint:
            hint += f" (Current SPOTIFY_DATA_PATH={env_hint})"
        raise FileNotFoundError(hint)

    desired_columns = set(DATA_COLUMNS)
    
    df = pd.read_csv(
        DATA_FILE,
        usecols=lambda column: column in desired_columns,
        dtype="string",
    )

    if missing := [column for column in DATA_COLUMNS if column not in df.column]:
        for column in missing:
            df[column] = pd.Series(pd.NA, index=df.index, dtype="string")
            df = df.loc[:, DATA_COLUMNS]

    for column, target_dtype in NUMERIC_COLUMNS.items():
        if column not in df.columns:
            continue
        df[column] = pd.to_numeric(df[column], errors="coerce")
        if target_dtype == "Int64":
            df[column] = df[column].astype("Int64")
        else:
            df[column] = df[column].astype(float)

    for column in BOOL_COLUMNS:
        if column not in df.columns:
            continue
        df[column] = (
            df[column]
            .astype("string")
            .str.lower()
            .map({"true": True, "false": False})
            .fillna(False)
        )

    release_datetime = pd.to_datetime(df["Release Date"], errors="coerce")
    df["Release Year"] = release_datetime.dt.year.astype("Int64")
    df["Release Date"] = release_datetime.dt.strftime("%Y-%m-%d")
    df["Release Date"] = df["Release Date"].fillna("").replace("NaT", "")
    df["Release Date"] = df["Release Date"].astype("string")

    def _split_genres(raw: str | pd.NA) -> list[str]:
        if raw is None or pd.isna(raw):
            return []
        cleaned = str(raw).strip().strip('"')
        if not cleaned:
            return []
        return [genre.strip() for genre in cleaned.split(",") if genre.strip()]

    df["Genres"] = df["Genres"].apply(_split_genres)

    df["search_text"] = (
        _normalize_text(df["Track Name"])
        + " "
        + _normalize_text(df["Artist Name(s)"])
        + " "
        + _normalize_text(df["Album Name"])
    ).str.replace(r"\s+", " ", regex=True).str.strip()

    return df


SONGS_DF = _load_dataset()

FEATURE_MATRIX = (
    SONGS_DF.loc[:, FEATURE_COLUMNS]
    .apply(pd.to_numeric, errors="coerce")
    .fillna(0.0)
    .astype(float)
)

FEATURE_MEAN = FEATURE_MATRIX.mean()
FEATURE_STD = FEATURE_MATRIX.std(ddof=0).replace(0, 1.0)
FEATURE_NORMALIZED = (FEATURE_MATRIX - FEATURE_MEAN) / FEATURE_STD

GENRE_SETS = SONGS_DF["Genres"].apply(lambda genres: frozenset(genres))


def _compute_dataset_summary(df: pd.DataFrame) -> dict[str, object]:
    totals = {
        "total_rows": int(len(df)),
        "unique_tracks": int(df["Track URI"].nunique()) if "Track URI" in df.columns else int(len(df)),
        "unique_artists": int(df["Artist Name(s)"].nunique()),
        "average_popularity": round(float(df["Popularity"].dropna().mean()), 2)
        if "Popularity" in df.columns
        else None,
        "average_danceability": round(float(df["Danceability"].dropna().mean()), 2)
        if "Danceability" in df.columns
        else None,
        "average_energy": round(float(df["Energy"].dropna().mean()), 2)
        if "Energy" in df.columns
        else None,
    }

    year_series = df["Release Year"].dropna().astype(int)
    if not year_series.empty:
        totals["release_year_range"] = {
            "min": int(year_series.min()),
            "max": int(year_series.max()),
        }
    else:
        totals["release_year_range"] = None

    artist_counter: Counter[str] = Counter()
    for raw in df["Artist Name(s)"]:
        if not raw:
            continue
        for artist in str(raw).split(","):
            name = artist.strip()
            if name:
                artist_counter[name] += 1

    top_artists = [
        {"name": name, "count": count} for name, count in artist_counter.most_common(10)
    ]

    genre_counter: Counter[str] = Counter()
    for genres in df["Genres"]:
        genre_counter.update(genres)

    top_genres = [
        {"name": name, "count": count} for name, count in genre_counter.most_common(15)
    ]

    if "Popularity" in df.columns:
        top_tracks_df = (
            df.sort_values("Popularity", ascending=False)
            .loc[:, ["Track URI", "Track Name", "Artist Name(s)", "Popularity"]]
            .head(10)
        )
        top_tracks = top_tracks_df.to_dict(orient="records")
    else:
        top_tracks = []

    yearly_counts = (
        year_series.value_counts()
        .sort_index()
        .rename_axis("year")
        .reset_index(name="count")
        .to_dict(orient="records")
    )

    return {
        "totals": totals,
        "top_artists": top_artists,
        "top_genres": top_genres,
        "yearly_release_counts": yearly_counts,
        "top_tracks": top_tracks,
    }


DATA_SUMMARY = _compute_dataset_summary(SONGS_DF)


def _search_songs(query: str, limit: int = 25) -> pd.DataFrame:
    normalized = query.strip().lower()
    if len(normalized) < 2:
        return SONGS_DF.iloc[0:0]

    tokens = [re.escape(token) for token in normalized.split() if token]
    if not tokens:
        return SONGS_DF.iloc[0:0]

    mask = SONGS_DF["search_text"].str.contains(tokens[0], na=False)
    for token in tokens[1:]:
        mask &= SONGS_DF["search_text"].str.contains(token, na=False)

    return SONGS_DF.loc[mask].head(limit)


def _recommend_tracks(uris: list[str], limit: int = 20) -> pd.DataFrame:
    if not uris:
        return SONGS_DF.iloc[0:0]

    mask = SONGS_DF["Track URI"].isin(uris)
    if not mask.any():
        return SONGS_DF.iloc[0:0]

    centroid = FEATURE_NORMALIZED.loc[mask].mean(axis=0)
    deltas = FEATURE_NORMALIZED - centroid
    distances = deltas.pow(2).sum(axis=1).pow(0.5)
    distances.loc[mask] = np.inf

    candidate_pool = max(limit * 6, 60)
    candidates = distances.nsmallest(candidate_pool)
    candidates = candidates[np.isfinite(candidates)]
    if candidates.empty:
        return SONGS_DF.iloc[0:0]

    seed_genre_sets = list(GENRE_SETS.loc[mask])
    seed_genres = set().union(*seed_genre_sets) if seed_genre_sets else set()
    genre_similarity = {}
    for idx in candidates.index:
        candidate_genres = GENRE_SETS.loc[idx]
        if not seed_genres or not candidate_genres:
            genre_similarity[idx] = 0.0
            continue
        intersection = len(seed_genres & candidate_genres)
        union = len(seed_genres | candidate_genres)
        genre_similarity[idx] = intersection / union if union else 0.0

    feature_similarity = (1 / (1 + candidates)).clip(0, 1)

    seed_popularity = SONGS_DF.loc[mask, "Popularity"].dropna()
    if not seed_popularity.empty:
        pop_mean = seed_popularity.mean()
        candidate_popularity = SONGS_DF.loc[candidates.index, "Popularity"].fillna(pop_mean)
        pop_similarity = 1 - (candidate_popularity.sub(pop_mean).abs() / 100.0)
        pop_similarity = pop_similarity.clip(lower=0.0, upper=1.0)
    else:
        pop_similarity = pd.Series(0.0, index=candidates.index)

    genre_similarity_series = pd.Series(genre_similarity).reindex(candidates.index, fill_value=0.0)
    combined_similarity = (
        feature_similarity * 0.6
        + genre_similarity_series * 0.3
        + pop_similarity * 0.1
    )

    top_indices = combined_similarity.nlargest(limit).index
    result = SONGS_DF.loc[top_indices].copy()
    result["similarity"] = combined_similarity.loc[top_indices].round(4)
    return result


def _serialize_records(df: pd.DataFrame, columns: list[str]) -> list[dict]:
    available = [col for col in columns if col in df.columns]
    return df.loc[:, available].to_dict(orient="records")


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

    matches = SONGS_DF.loc[SONGS_DF["Track URI"] == uri]
    if matches.empty:
        return jsonify({"error": "Track not found."}), 404

    record = _serialize_records(matches, DETAIL_COLUMNS)[0]
    return jsonify(record)


@app.route("/stats")
def stats():
    return jsonify(DATA_SUMMARY)


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
    if recommendations.empty:
        return jsonify([])

    records = _serialize_records(recommendations, RECOMMEND_COLUMNS)
    return jsonify(records)


if __name__ == "__main__":
    app.run(debug=True)
