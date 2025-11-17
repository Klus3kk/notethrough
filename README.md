# Notethrough
Revolution awaits.

Stay tuned.

## Quick start

```bash
./scripts/dev-up.sh
```

The script performs the full local bootstrap:

- ensures `.env` exists (generated from `.env.example` on first run) and exports all required variables
- verifies Docker, uv, and npm are available
- launches Postgres, Redis, and OpenSearch through `docker compose`
- installs Python tooling with `uv` (including the `test` dependency group)
- starts the ML service (`uvicorn` via `uv run`), the FastAPI gateway, and the Next.js dashboard (all logs streamed with service prefixes)

Press `Ctrl+C` to shut everything down. Infrastructure containers remain running so subsequent starts are instant; run `docker compose stop` if you want a clean slate.

### Dataset import

If you want the SQLite dataset copied into Postgres automatically, set `AUTO_IMPORT_DATA=1` in `.env` before running `scripts/dev-up.sh`. You can also trigger the importer manually:

```bash
python services/api-gateway/scripts/import_sqlite.py --create-schema --truncate
```

### Tests & linting

```bash
uv pip install --group test  # once
pytest services/api-gateway/tests
(cd frontend && npm run lint)
```

## Tooling

## Tooling

- Python dependencies are managed with [`uv`](https://docs.astral.sh/uv/). Run `uv sync` from the repo root to create a local environment, or `uv pip install --system --project services/api-gateway` for service-specific installs.
- Each service has its own `pyproject.toml`; the root `pyproject.toml` defines the uv workspace.
- Legacy Flask prototype dependencies live under the optional `legacy-prototype` extra.

## Data Source Disclaimer
This project uses a privately stored dataset derived from Spotify user data (via Exportify and the Spotify Web API) for educational and portfolio demonstration purposes only.

The dataset itself is not redistributed, and no proprietary Spotify data is publicly exposed.
All analysis, embeddings, and visualizations shown are derived artifacts and are the author's own intellectual work.
