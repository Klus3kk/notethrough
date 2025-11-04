# Notethrough
Revolution awaits.

Stay tuned.

## Tooling

- Python dependencies are managed with [`uv`](https://docs.astral.sh/uv/). Run `uv sync` from the repo root to create a local environment, or `uv pip install --system --project services/api-gateway` for service-specific installs.
- Each service has its own `pyproject.toml`; the root `pyproject.toml` defines the uv workspace.
- Legacy Flask prototype dependencies live under the optional `legacy-prototype` extra.

## Data Source Disclaimer
This project uses a privately stored dataset derived from Spotify user data (via Exportify and the Spotify Web API) for educational and portfolio demonstration purposes only.

The dataset itself is not redistributed, and no proprietary Spotify data is publicly exposed.
All analysis, embeddings, and visualizations shown are derived artifacts and are the author's own intellectual work.
