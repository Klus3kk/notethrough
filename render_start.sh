#!/usr/bin/env bash
set -eo pipefail

TARGET=/tmp/combined_spotify_tracks.csv

if [ ! -f "$TARGET" ]; then
  if [ -z "$DATA_PAT" ]; then
    echo "DATA_PAT environment variable not set" >&2
    exit 1
  fi

  RELEASE_TAG="v0.2.5"
  API_RELEASE_URL="https://api.github.com/repos/Klus3kk/private_data/releases/tags/${RELEASE_TAG}"

  ASSET_URL=$(
    curl -sSL \
      -H "Authorization: token $DATA_PAT" \
      -H "Accept: application/vnd.github+json" \
      "$API_RELEASE_URL" |
    python -c 'import sys, json; data=json.load(sys.stdin); assets=data.get("assets", []); 
if not assets: raise SystemExit("No assets in release"); 
print(assets[0]["url"])'
  )

  curl -fSL \
    -H "Authorization: token $DATA_PAT" \
    -H "Accept: application/octet-stream" \
    -o "${TARGET}.xz" \
    "$ASSET_URL"

  unxz -f "${TARGET}.xz"
fi

export SPOTIFY_DATA_PATH="$TARGET"
exec gunicorn app:app --bind 0.0.0.0:"${PORT:-8080}"
