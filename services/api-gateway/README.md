# API Gateway

This service exposes the public REST API for Notethrough. Responsibilities:
- Authenticate requests and enforce rate limits.
- Serve metadata and analytics from Postgres/Redis/OpenSearch.
- Proxy ML-heavy calls to the dedicated model service while applying hybrid ranking/blending.
- Emit telemetry (OpenTelemetry traces, Prometheus metrics) for downstream monitoring.

## Current status
- Source lives under `app/` (migrated from the former `backend/app` package).
- Dependencies managed via `uv` (`uv pip install --system --project .`).
- `Dockerfile` installs via `uv` and serves the API with Uvicorn on port 8000.
- `docker-compose.yml` binds this service to Postgres, Redis, OpenSearch, and the ML service (port 8081).
- Recommendation endpoint calls the ML service’s hybrid ranking API with a deterministic local fallback.

## Local development
- Use `uv sync` (repo root) or `uv pip install --system --project .` (service dir) to install deps.
- Run locally with `uvicorn app.main:app --reload`.
- Configure environment variables (see `app/config.py`) or create a `.env` file (`DATABASE_URL`, `ML_SERVICE_URL`, etc.).
- During migration the service still expects the Spotify dataset to be loaded into Postgres.

## Importing the dataset
- A helper script (`scripts/import_sqlite.py`) copies the local SQLite dump (`data/combined_spotify_tracks.sqlite`) into Postgres.
- Example usage: `python -m services.api_gateway.scripts.import_sqlite --create-schema --truncate`.
- Flags: `--reset` drops and recreates the table, `--truncate` wipes rows before upserting, `--batch-size` controls insert chunk size.
- The script defaults to the database URL defined via environment variables or `.env`.
