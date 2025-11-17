# Transition Plan: FastAPI + Next.js + Postgres

This document tracks the migration steps from the legacy Flask/SQLite application to the new architecture.

## Phase 1 – Backend foundation

- [x] Scaffold FastAPI project (`backend/` directory)
- [x] Define SQLAlchemy models and Pydantic schemas
- [x] Implement core routes (`/search`, `/suggest`, `/song`, `/stats`, `/recommend`)
- [x] Connect to Postgres (local dev via Docker Compose)
- [x] Integrate Redis caching placeholder
- [x] Create automated tests for the API (pytest + httpx)

## Phase 2 – Frontend separation

- [x] Bootstrap Next.js frontend that consumes the API
- [x] Port existing UI functionality (search, detail modal, recommendations, dataset insights)
- [x] Add environment-specific configuration for API base URL

## Phase 3 – Data & AI enhancements

- [x] Build ingestion job from CSV → Postgres 
- [ ] Generate embeddings + vector store for semantic search
- [ ] Expose LLM-powered Q&A/recommendation explanations (RAG pipeline)
- [ ] Add background workers (Celery or RQ) if needed for heavy tasks

## Phase 4 – DevOps & polish

- [x] Containerize services (Dockerfiles + docker-compose for dev)
- [ ] Set up GitHub Actions (lint, tests, build, deploy)
- [ ] Provision infrastructure (Render/Fly/managed K8s)
- [ ] Instrument logging/metrics/dashboards
- [ ] Document deployment & operations runbook

Tracking progress here keeps the main repository files focused while giving a quick overview of what’s done vs. pending.

## Phase 5 – Differentiator experiences

### 1. Blend Personal + Global Trends

**Goal:** After a Spotify OAuth handshake, fetch the user’s listening history and overlay their stats against the global dataset: energy/danceability percentiles, release year distributions, genre mix, etc. Provide a “guest” mode using the public dataset so non-Spotify users still see insights.

**Needs:**
- Spotify OAuth callback + token storage (short-lived + refresh) scoped to `user-library-read`, `playlist-read-private`, `user-top-read`.
- Ingestion workers that mirror user-specific tracks/playlists into Postgres (namespaced per `user_id`).
- Comparison API (`/users/{id}/stats/compare`) returning global percentile breakdowns.
- Frontend dashboard widgets that toggle between “global” and “me vs global”, and explanatory copy.

### 2. Discovery Journeys

**Goal:** Transform recommendations into interactive “quests”. Starting from one seed, traverse similar artists, label mates, or influencer graphs and render branches so the user explores contextually instead of scrolling tables.

**Needs:**
- Graph model in Postgres/Redis (e.g., artist influence edges, label relationships, co-listen stats) plus traversal endpoint (`/journeys?seed=...`).
- ML service update: return neighbor metadata per track (similar artists, shared playlists, etc.).
- Frontend component showing a branching graph (radial tree/force layout), + “follow this branch” interactions to enqueue seeds or open Spotify.

### 3. Story Mode Analytics

**Goal:** Auto-generate narrative summaries: “You’re top 10% for ‘70s soul” or “Weekends jump 20 BPM”. Optional shareable cards for social.

**Needs:**
- Template-driven narration engine fed by stats comparisons and heuristics.
- API endpoint returning a list of stories, each with headline, body, supporting metrics, and optional image payload.
- Frontend “Stories” carousel with download/share actions.

### Implementation outlook

1. Finish Phase 3 work (vector search + RAG explanations) so the recommendation engine exposes embeddings + labeled components.
2. Land OAuth + per-user ingestion so personal stats exist.
3. Layer the differentiator features above the shared data model, exposing the new endpoints + UI experiences.

Each bullet above should be broken into concrete tickets once we size the backend/fronted effort per feature.

### Delivered to date

- Rebuilt the frontend studio shell with the experience-driven navigation, universal recommender, and anonymous track explorer.
- Added Spotify OAuth login/callback endpoints plus a Next.js callback route that stores tokens locally.
- Delivered the Spotify-connected recommender workflow (connect, seed input, recommendations) and the initial Spotify checker analytics panel.
