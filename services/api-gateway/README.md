# API Gateway

This service exposes the public REST API for Notethrough. Responsibilities:
- Authenticate requests and enforce rate limits.
- Serve metadata and analytics from Postgres/Redis/OpenSearch.
- Proxy ML-heavy calls to the dedicated model service while applying hybrid ranking/blending.
- Emit telemetry (OpenTelemetry traces, Prometheus metrics) for downstream monitoring.

## Current status
- Source lives under `app/` (migrated from the former `backend/app` package).
- `Dockerfile` installs dependencies from `requirements.txt` and serves via Uvicorn on port 8000.
- `docker-compose.yml` binds this service to Postgres, Redis, OpenSearch, and the future ML service.

## Local development
- Poetry/uv toolchain not yet configured—use a virtualenv and install `requirements.txt`.
- Run locally with `uvicorn app.main:app --reload`.
- Configure environment variables (see `app/config.py`) or create a `.env` file.
- During migration the service still expects the Spotify dataset to be loaded into Postgres.
