#!/usr/bin/env bash
set -eo pipefail

TARGET=/tmp/combined_spotify_tracks.csv

if [ ! -f "$TARGET" ]; then
  if [ -z "$DATA_PAT" ]; then
    echo "DATA_PAT environment variable not set" >&2
    exit 1
  fi
  curl -fSL \
    -H "Authorization: token $DATA_PAT" \
    -o "${TARGET}.xz" \
    "https://github.com/Klus3kk/private_data/releases/download/v0.2.5/combined_spotify_tracks.csv.xz"
  unxz -f "${TARGET}.xz"
fi

export SPOTIFY_DATA_PATH="$TARGET"
exec gunicorn app:app --bind 0.0.0.0:"${PORT:-8080}"
