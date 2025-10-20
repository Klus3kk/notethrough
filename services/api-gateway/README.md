# API Gateway

This service exposes the public REST API for Notethrough. Responsibilities:
- Authenticate requests and enforce rate limits.
- Serve metadata and analytics from Postgres/Redis/OpenSearch.
- Proxy ML-heavy calls to the dedicated model service while applying hybrid ranking/blending.
- Emit telemetry (OpenTelemetry traces, Prometheus metrics) for downstream monitoring.

Current status:
- The legacy FastAPI app lives in `backend/app`. It will be migrated into this directory as part of the next milestone.
- Dockerfile and application bootstrap will be added once the code is relocated.
