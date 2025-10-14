#!/usr/bin/env bash
set -eo pipefail

TARGET=/tmp/combined_spotify_tracks.csv
DATA_REPO_DIR=/tmp/private_data_repo

if [ ! -f "$TARGET" ]; then
  if [ -z "$DATA_PAT" ]; then
    echo "DATA_PAT environment variable not set" >&2
    exit 1
  fi
  rm -rf "$DATA_REPO_DIR"
  git clone --depth=1 "https://x-access-token:$DATA_PAT@github.com/Klus3kk/private_data.git" "$DATA_REPO_DIR"
  cp "$DATA_REPO_DIR/combined_spotify_tracks.csv" "$TARGET"
fi

export SPOTIFY_DATA_PATH="$TARGET"
exec gunicorn app:app --bind 0.0.0.0:"${PORT:-8080}"
