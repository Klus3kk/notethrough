# Services

The services directory groups all backend workloads exposed by the platform.

- `api-gateway/`: Edge-facing FastAPI service that handles auth, metadata queries, and proxies heavy ML requests.
- `ml-service/`: Model-serving FastAPI app responsible for embedding lookup, collaborative filtering, and ranking orchestration.

Shared gRPC/OpenAPI contracts and utilities will live under `services/shared/` (to be created when needed).
