#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_EXAMPLE="$ROOT_DIR/.env.example"
ENV_FILE="$ROOT_DIR/.env"
LOG_DIR="$ROOT_DIR/.devlogs"
UV_CACHE_DIR="$ROOT_DIR/.uv-cache"
mkdir -p "$LOG_DIR"
mkdir -p "$UV_CACHE_DIR"

if [ ! -f "$ENV_EXAMPLE" ]; then
  cat <<'TEMPLATE' > "$ENV_EXAMPLE"
DATABASE_URL=postgresql+psycopg://notethrough:notethrough@localhost:5432/notethrough?async_fallback=true
REDIS_URL=redis://localhost:6379/0
ML_SERVICE_URL=http://localhost:8081
NEXT_PUBLIC_API_URL=http://localhost:8000
SPOTIFY_DATA_PATH=data/combined_spotify_tracks.sqlite
AUTO_IMPORT_DATA=0
TEMPLATE
fi

if [ ! -f "$ENV_FILE" ]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "[dev] Created .env from template (.env.example)."
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

unset VIRTUAL_ENV 2>/dev/null || true

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[dev] Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd uv
require_cmd npm

USE_DOCKER=true
if command -v docker >/dev/null 2>&1; then
  if ! docker_info_output=$(docker info 2>&1); then
    if printf '%s' "$docker_info_output" | grep -qi "permission denied"; then
      echo "[dev] Warning: Docker available but current user lacks permission. Skipping container startup." >&2
      USE_DOCKER=false
    else
      echo "[dev] Warning: Docker daemon unavailable. Skipping container startup." >&2
      USE_DOCKER=false
    fi
  fi
else
  echo "[dev] Docker not found on PATH. Skipping container startup." >&2
  USE_DOCKER=false
fi

cleanup() {
  echo "\n[dev] Shutting down dev processes..." >&2
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  wait "${PIDS[@]:-}" 2>/dev/null || true
  echo "[dev] App processes stopped. Infrastructure containers remain running." >&2
}
trap cleanup EXIT INT TERM

PIDS=()

# Ensure service environments exist (no network install if lockfile present)
echo "[dev] Ensuring Python tooling via uv"
UV_CACHE_DIR="$UV_CACHE_DIR" uv run --project services/api-gateway --help >/dev/null 2>&1 || true
UV_CACHE_DIR="$UV_CACHE_DIR" uv run --project services/ml-service --help >/dev/null 2>&1 || true

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
if [ "$USE_DOCKER" = true ]; then
  echo "[dev] Starting infrastructure containers"
  docker compose up -d postgres redis opensearch >/dev/null
  POSTGRES_HOST="localhost"
else
  echo "[dev] Skipping docker compose; ensure DATABASE_URL/REDIS_URL point at reachable services." >&2
fi

if [ "${AUTO_IMPORT_DATA:-0}" = "1" ]; then
  echo "[dev] Importing dataset into Postgres"
  uv run --project services/api-gateway python services/api-gateway/scripts/import_sqlite.py --create-schema --postgres-url "$DATABASE_URL" || true
fi

start_service() {
  local name="$1"; shift
  local workdir="$1"; shift
  (
    cd "$workdir"
    "$@"
  ) | sed -u "s/^/[${name}] /" &
  PIDS+=("$!")
}

start_service "ml-service" "$ROOT_DIR/services/ml-service" env UV_CACHE_DIR="$UV_CACHE_DIR" uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8081
start_service "api-gateway" "$ROOT_DIR/services/api-gateway" env UV_CACHE_DIR="$UV_CACHE_DIR" uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo "[dev] Installing frontend dependencies"
  (cd "$ROOT_DIR/frontend" && npm install >/dev/null)
fi
start_service "frontend" "$ROOT_DIR/frontend" bash -lc "NEXT_PUBLIC_API_URL='${NEXT_PUBLIC_API_URL:-http://localhost:8000}' npm run dev"

echo "[dev] Development environment is live"
echo "[dev] Frontend:       http://localhost:3000"
echo "[dev] API Gateway:    http://localhost:8000"
echo "[dev] ML Service:     http://localhost:8081"
echo "[dev] Press Ctrl+C to exit"

wait "${PIDS[@]:-}" 2>/dev/null || true
