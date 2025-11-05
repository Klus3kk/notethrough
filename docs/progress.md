# Project Progress Log

## 2025-01-06

- Established the monorepo scaffold:
  - Added `frontend/`, `services/api-gateway/`, `services/ml-service/`, and `infra/` directories with README notes.
  - Seeded placeholder Dockerfiles for each service and introduced the first `docker-compose.yml` with Postgres+pgvector, Redis, OpenSearch, optional observability stack.
  - Added initial OpenTelemetry Collector and Prometheus configs under `infra/telemetry/`.
- Migrated the legacy FastAPI application into `services/api-gateway/app/` and updated the Dockerfile/compose settings to run the real app via Uvicorn.
- Synced documentation in `README.md` and `services/api-gateway/README.md` to reflect the new layout and local dev workflow.

## 2025-01-07

- Extended the ORM `Track` model to cover all columns present in the SQLite source (`Added At`, `Record Label`).
- Authored `services/api-gateway/scripts/import_sqlite.py` to stream the SQLite dataset into Postgres with batch upserts.
- Hardened the importer:
  - Normalised DSNs for sync SQLAlchemy usage.
  - Eventually replaced SQLAlchemy insert logic with a direct psycopg implementation to avoid async params and masked-password issues.
  - Added progress logging and CLI options (`--create-schema`, `--truncate`, `--reset`, `--batch-size`).
- Documented the import workflow in the API gateway README.
- Verified container Postgres credentials, reset the database volume, and successfully loaded the full dataset via the importer.

## 2025-01-08

- Adopted `uv` for Python dependency management:
  - Added workspace `pyproject.toml` and service-level configs, removed legacy `requirements.txt` files.
  - Updated Dockerfiles to install dependencies via `uv pip install`.
  - Refreshed `.gitignore` and README tooling notes to reflect the new workflow.
- Scaffolded the ML service FastAPI app with health and hybrid ranking placeholder endpoints and documented its roadmap.
- Implemented the first real hybrid ranking pipeline in the ML service: scores now come from track features in Postgres with deterministic content/collaborative/text components and epsilon-greedy exploration.
- Integrated the API gateway with the ML service:
  - Added an async HTTP client wrapper with graceful shutdown handling.
  - Updated the recommendations endpoint to call the ML hybrid ranking API with a centroid-based fallback.
  - Adjusted schemas to surface hybrid score components and refreshed configuration/env wiring.
- Added a Redis-backed statistics cache with graceful degradation and closedown hooks.
- Introduced pytest+httpx smoke tests for the API gateway (health + metadata routes) and captured them in the uv `test` dependency group.
- Bootstrapped the Next.js 14 frontend with Tailwind, bespoke UI primitives, and a dashboard layout matching the product mock (navigation, metric cards, matrix, and timeline).
- Added theme tokens (`styles/theme.ts`) and documented the frontend workflow in `frontend/README.md`.
- Ported search, typeahead, and recommendation flows to the new frontend with realtime API calls and seed blending UI.
- Added `scripts/dev-up.sh` and `.env.example` to provide a single-command developer bootstrap with dockerised infra and hot-reload services.

## Next Targets

- Use uv-managed environments to exercise API gateway endpoints against the imported dataset.
- Replace the ML placeholder scorer with real pgvector + collaborative filtering retrieval.
- Bootstrap the Next.js frontend (App Router + Tailwind + shadcn/ui) to replace the placeholder Docker command.
- Define a migrations strategy (Alembic or Prisma) and automate dataset ingestion in CI/local tooling.
