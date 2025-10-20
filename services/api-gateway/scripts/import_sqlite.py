"""Import tracks from the local SQLite dataset into Postgres."""
from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path
import sys
from typing import Dict, Iterator

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import make_url

SERVICE_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = SERVICE_ROOT.parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.config import get_settings  
from app.models import Base, Track  


DEFAULT_SQLITE_PATH = PROJECT_ROOT / "data" / "combined_spotify_tracks.sqlite"


def _normalize_postgres_url(url: str) -> str:
    """Strip async-specific query params so sync SQLAlchemy engines can connect."""
    sa_url = make_url(url)
    if sa_url.query:
        query = dict(sa_url.query)
        query.pop("async_fallback", None)
        sa_url = sa_url.set(query=query)
    return str(sa_url)


def _normalize_row(row: sqlite3.Row) -> Dict[str, object | None]:
    data: Dict[str, object | None] = {}
    keys = row.keys()

    for column in Track.__table__.columns:
        name = column.name
        value = row[name] if name in keys else None

        if value is None:
            data[name] = None
            continue

        if name in {"Release Year", "Time Signature", "Key", "Mode"}:
            try:
                data[name] = int(float(value))
            except (TypeError, ValueError):
                data[name] = None
        elif name == "Duration (ms)":
            try:
                data[name] = int(float(value))
            except (TypeError, ValueError):
                data[name] = None
        elif name == "Popularity":
            try:
                data[name] = float(value)
            except (TypeError, ValueError):
                data[name] = None
        elif name == "Explicit":
            try:
                data[name] = str(int(value))
            except (TypeError, ValueError):
                data[name] = str(value)
        else:
            data[name] = value

    return data


def _yield_batches(cursor: sqlite3.Cursor, batch_size: int) -> Iterator[list[Dict[str, object | None]]]:
    while True:
        rows = cursor.fetchmany(batch_size)
        if not rows:
            break
        yield [_normalize_row(row) for row in rows]


def import_tracks(sqlite_path: Path, postgres_url: str, batch_size: int, reset: bool, truncate: bool, create_schema: bool) -> int:
    if not sqlite_path.exists():
        raise FileNotFoundError(f"SQLite file not found: {sqlite_path}")

    sqlite_conn = sqlite3.connect(str(sqlite_path))
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.execute("SELECT * FROM tracks")

    engine = create_engine(_normalize_postgres_url(postgres_url))
    total_rows = 0

    with engine.begin() as connection:
        if reset:
            Track.__table__.drop(connection, checkfirst=True)

        if create_schema or reset:
            Base.metadata.create_all(connection, checkfirst=True)

        if truncate and not reset:
            connection.execute(Track.__table__.delete())

        for batch in _yield_batches(cursor, batch_size):
            if not batch:
                continue
            stmt = pg_insert(Track.__table__).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=["Track URI"],
                set_={
                    col.name: stmt.excluded[col.name]
                    for col in Track.__table__.columns
                    if col.name != "Track URI"
                },
            )
            connection.execute(stmt)
            total_rows += len(batch)
            if total_rows % 50000 == 0:
                print(f"Imported {total_rows} rows...")

    sqlite_conn.close()
    return total_rows


def parse_args() -> argparse.Namespace:
    settings = get_settings()

    parser = argparse.ArgumentParser(description="Import tracks from SQLite into Postgres")
    parser.add_argument(
        "--sqlite-path",
        type=Path,
        default=DEFAULT_SQLITE_PATH,
        help=f"Path to the SQLite database (default: {DEFAULT_SQLITE_PATH})",
    )
    parser.add_argument(
        "--postgres-url",
        default=settings.database_url,
        help="SQLAlchemy Postgres URL (defaults to Settings.database_url)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=5000,
        help="Number of rows per insert batch",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop and recreate the tracks table before importing",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Delete existing rows before importing (ignored if --reset)",
    )
    parser.add_argument(
        "--create-schema",
        action="store_true",
        help="Ensure tables exist before importing",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    total = import_tracks(
        sqlite_path=args.sqlite_path,
        postgres_url=args.postgres_url,
        batch_size=args.batch_size,
        reset=args.reset,
        truncate=args.truncate,
        create_schema=args.create_schema,
    )
    print(f"Imported {total} rows from {args.sqlite_path}")


if __name__ == "__main__":
    main()
