# ML Service

This service encapsulates model training and inference APIs.

## Current status
- FastAPI scaffold with `/` metadata, `/health` probe, and `/ranking/hybrid` ranking endpoint.
- Pydantic settings cover Postgres, Redis, and hybrid weights (`alpha`, `beta`, `gamma`).
- Ranking pipeline reads track features from Postgres, computes content/collaborative/text components, and applies ε-greedy exploration.
- Dockerfile installs dependencies via `uv` and exposes port `8081`; compose wiring passes shared service URLs.

## Next steps
- Replace heuristic components with pgvector embeddings + collaborative filtering outputs.
- Persist embeddings/model artifacts to `MODEL_REGISTRY_PATH` or an object store.
- Add background workers for retraining and bandit logging.
- Instrument endpoints with OpenTelemetry metrics/traces; expose Prometheus scrape target.
- Introduce contract/integration tests to validate API shape.

Planned components:
- Content and text embedding retrieval backed by pgvector + OpenSearch.
- Collaborative filtering models (implicit ALS / LightFM) with periodic retraining.
- Hybrid scoring, diversity re-rank (xQuAD), and online bandit blender endpoints.
- Feature logging for bandit feedback loops.

Implementation will use FastAPI with background workers orchestrated via Celery or Prefect (TBD).
