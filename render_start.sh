#!/usr/bin/env bash
set -eo pipefail

DATA_URL="https://api.github.com/repos/Klus3kk/private_data/contents/combined_spotify_tracks.csv?ref=main"
TARGET=/tmp/combined_spotify_tracks.csv

if [ ! -f "$TARGET" ]; then
  if [ -z "$DATA_PAT" ]; then
    echo "DATA_PAT environment variable not set" >&2
    exit 1
  fi
  curl -fSL \
    -H "Authorization: Bearer $DATA_PAT" \
    -H "Accept: application/vnd.github.raw" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -o "$TARGET" \
    "$DATA_URL"
fi

export SPOTIFY_DATA_PATH="$TARGET"
exec gunicorn app:app --bind 0.0.0.0:"${PORT:-8080}"
