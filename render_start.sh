#!/usr/bin/env bash
set -eo pipefail

DATA_URL="https://media.githubusercontent.com/media/Klus3kk/private_data/main/combined_spotify_tracks.csv"
TARGET=/tmp/combined_spotify_tracks.csv

if [ ! -f "$TARGET" ]; then
  curl -fSL \
    -H "Authorization: Bearer $DATA_PAT" \
    -o "$TARGET" \
    "$DATA_URL"
fi

export SPOTIFY_DATA_PATH="$TARGET"
exec gunicorn app:app --bind 0.0.0.0:"${PORT:-8080}"
