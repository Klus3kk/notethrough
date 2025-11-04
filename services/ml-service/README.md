# ML Service

This service encapsulates model training and inference APIs.

## Current status
- FastAPI scaffold with `/` metadata, `/health` probe, and `/ranking/hybrid` placeholder endpoint.
- Pydantic settings cover Postgres, Redis, and hybrid weights (`alpha`, `beta`, `gamma`).
- Deterministic mock scorer lives in `app/services/scoring.py` to unblock gateway integration.
- Dockerfile installs dependencies and exposes port `8081`; compose wiring passes shared service URLs.

## Next steps
- Replace mock scorer with real pgvector + CF retrieval pipelines.
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
