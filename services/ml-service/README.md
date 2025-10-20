# ML Service

This service encapsulates model training and inference APIs.

Planned components:
- Content and text embedding retrieval backed by pgvector + OpenSearch.
- Collaborative filtering models (implicit ALS / LightFM) with periodic retraining.
- Hybrid scoring, diversity re-rank (xQuAD), and online bandit blender endpoints.
- Feature logging for bandit feedback loops.

Implementation will use FastAPI with background workers orchestrated via Celery or Prefect (TBD).
