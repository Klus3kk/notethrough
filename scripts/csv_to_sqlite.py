#!/usr/bin/env python3
"""Convert the Spotify CSV dataset into a SQLite database.

Running this script will read the CSV file in chunks, write it to a SQLite
database, and add a few helpful indexes for fast lookups.

Usage:
    python scripts/csv_to_sqlite.py \
        --csv data/combined_spotify_tracks.csv \
        --sqlite data/combined_spotify_tracks.sqlite
"""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

import pandas as pd


DEFAULT_CSV = Path("data/combined_spotify_tracks.csv")
DEFAULT_SQLITE = Path("data/combined_spotify_tracks.sqlite")
TABLE_NAME = "tracks"
CHUNK_SIZE = 50_000


def convert(csv_path: Path, sqlite_path: Path, chunksize: int = CHUNK_SIZE) -> None:
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found at {csv_path}")

    if sqlite_path.exists():
        sqlite_path.unlink()

    sqlite_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(sqlite_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=OFF;")

    chunks = pd.read_csv(csv_path, chunksize=chunksize)
    total_rows = 0

    for chunk in chunks:
        chunk["search_text"] = (
            chunk["Track Name"].fillna("").str.lower()
            + " "
            + chunk["Artist Name(s)"].fillna("").str.lower()
            + " "
            + chunk["Album Name"].fillna("").str.lower()
        )
        chunk.to_sql(TABLE_NAME, conn, if_exists="append", index=False)
        total_rows += len(chunk)
        print(f"Inserted {total_rows:,} rows...", flush=True)

    conn.commit()
    conn.close()

    print("Creating indexes...", flush=True)
    conn = sqlite3.connect(sqlite_path)
    with conn:
        conn.execute(f'CREATE INDEX idx_tracks_uri ON "{TABLE_NAME}" ("Track URI");')
        conn.execute(f'CREATE INDEX idx_tracks_name ON "{TABLE_NAME}" ("Track Name");')
        conn.execute(
            f'CREATE INDEX idx_tracks_artist ON "{TABLE_NAME}" ("Artist Name(s)");'
        )
        conn.execute(
            f'CREATE INDEX idx_tracks_search ON "{TABLE_NAME}" ("search_text");'
        )
    conn.close()
    print(f"SQLite database written to {sqlite_path} ({total_rows:,} rows).")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV,
        help=f"Path to the source CSV (default: {DEFAULT_CSV})",
    )
    parser.add_argument(
        "--sqlite",
        type=Path,
        default=DEFAULT_SQLITE,
        help=f"Output SQLite database path (default: {DEFAULT_SQLITE})",
    )
    parser.add_argument(
        "--chunksize",
        type=int,
        default=CHUNK_SIZE,
        help=f"Number of rows per chunk when reading the CSV (default: {CHUNK_SIZE})",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    convert(args.csv, args.sqlite, args.chunksize)


if __name__ == "__main__":
    main()
