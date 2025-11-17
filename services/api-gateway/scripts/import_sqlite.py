"""Import tracks from the local SQLite dataset into Postgres."""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path
from typing import Dict, Iterator, Sequence, Tuple

import psycopg
from psycopg import sql
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import make_url
from sqlalchemy.schema import CreateTable

SERVICE_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = SERVICE_ROOT.parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.config import get_settings  # noqa: E402
from app.models import Track  # noqa: E402


DEFAULT_SQLITE_PATH = PROJECT_ROOT / "data" / "combined_spotify_tracks.sqlite"


def _normalize_postgres_url(url: str) -> str:
    """Strip async-specific query params so sync SQLAlchemy engines can connect."""
    sa_url = make_url(url)
    if sa_url.query:
        query = dict(sa_url.query)
        query.pop("async_fallback", None)
        sa_url = sa_url.set(query=query)
    return sa_url.render_as_string(hide_password=False)


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


def _prepare_schema(connection: psycopg.Connection, reset: bool, truncate: bool, create_schema: bool) -> None:
    with connection.cursor() as cur:
        if reset:
            cur.execute('DROP TABLE IF EXISTS "tracks" CASCADE')

        if create_schema or reset:
            ddl = str(CreateTable(Track.__table__).compile(dialect=postgresql.dialect()))
            cur.execute(ddl)
            for index in Track.__table__.indexes:
                cur.execute(str(index.compile(dialect=postgresql.dialect())))

        if truncate and not reset:
            cur.execute('TRUNCATE TABLE "tracks"')


def _build_insert_query() -> sql.Composed:
    columns = [column.name for column in Track.__table__.columns]
    identifiers = [sql.Identifier(column) for column in columns]
    placeholders = [sql.Placeholder()] * len(columns)
    assignments = [
        sql.SQL("{} = EXCLUDED.{}").format(sql.Identifier(column), sql.Identifier(column))
        for column in columns
        if column != "Track URI"
    ]

    return sql.SQL(
        "INSERT INTO {table} ({cols}) VALUES ({values}) "
        "ON CONFLICT ({pk}) DO UPDATE SET {updates}"
    ).format(
        table=sql.Identifier("tracks"),
        cols=sql.SQL(", ").join(identifiers),
        values=sql.SQL(", ").join(placeholders),
        pk=sql.Identifier("Track URI"),
        updates=sql.SQL(", ").join(assignments),
    )


def _rows_to_sequence(columns: Sequence[str], batch: Sequence[Dict[str, object | None]]) -> Sequence[Tuple[object | None, ...]]:
    return [tuple(row.get(column) for column in columns) for row in batch]


def import_tracks(sqlite_path: Path, postgres_url: str, batch_size: int, reset: bool, truncate: bool, create_schema: bool) -> int:
    if not sqlite_path.exists():
        raise FileNotFoundError(f"SQLite file not found: {sqlite_path}")

    sqlite_conn = sqlite3.connect(str(sqlite_path))
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.execute("SELECT * FROM tracks")
    total_rows = 0

    normalized_url = _normalize_postgres_url(postgres_url)
    psycopg_url = normalized_url.replace("+psycopg", "")
    display_url = make_url(normalized_url).set(password="***")
    print(f"Connecting to {display_url}")
    print(f"psycopg connection string: {psycopg_url!r}")
    columns = [column.name for column in Track.__table__.columns]
    insert_query = _build_insert_query()

    with psycopg.connect(psycopg_url) as connection:
        connection.autocommit = False
        _prepare_schema(connection, reset=reset, truncate=truncate, create_schema=create_schema)

        insert_sql = insert_query.as_string(connection)

        with connection.cursor() as cur:
            for batch in _yield_batches(cursor, batch_size):
                if not batch:
                    continue
                values = _rows_to_sequence(columns, batch)
                cur.executemany(insert_sql, values)
                total_rows += len(batch)
                if total_rows % 50000 == 0:
                    print(f"Imported {total_rows} rows...")

        connection.commit()

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
