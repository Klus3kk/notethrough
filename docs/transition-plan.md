# Transition Plan: FastAPI + Next.js + Postgres

This document tracks the migration steps from the legacy Flask/SQLite application to the new architecture.

## Phase 1 – Backend foundation

- [x] Scaffold FastAPI project (`backend/` directory)
- [x] Define SQLAlchemy models and Pydantic schemas
- [x] Implement core routes (`/search`, `/suggest`, `/song`, `/stats`, `/recommend`)
- [ ] Connect to Postgres (local dev via Docker Compose)
- [ ] Integrate Redis caching placeholder
- [ ] Create automated tests for the API (pytest + httpx)

## Phase 2 – Frontend separation

- [ ] Bootstrap Next.js frontend that consumes the API
- [ ] Port existing UI functionality (search, detail modal, recommendations, dataset insights)
- [ ] Add environment-specific configuration for API base URL

## Phase 3 – Data & AI enhancements

- [ ] Build ingestion job from CSV → Postgres 
- [ ] Generate embeddings + vector store for semantic search
- [ ] Expose LLM-powered Q&A/recommendation explanations (RAG pipeline)
- [ ] Add background workers (Celery or RQ) if needed for heavy tasks

## Phase 4 – DevOps & polish

- [ ] Containerize services (Dockerfiles + docker-compose for dev)
- [ ] Set up GitHub Actions (lint, tests, build, deploy)
- [ ] Provision infrastructure (Render/Fly/managed K8s)
- [ ] Instrument logging/metrics/dashboards
- [ ] Document deployment & operations runbook

Tracking progress here keeps the main repository files focused while giving a quick overview of what’s done vs. pending.
