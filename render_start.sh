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
  export GIT_TERMINAL_PROMPT=0
  git clone --depth=1 "https://x-access-token:$DATA_PAT@github.com/Klus3kk/private_data.git" "$DATA_REPO_DIR"
  if command -v git-lfs >/dev/null 2>&1; then
    (cd "$DATA_REPO_DIR" && git lfs install --local && git lfs pull --include="combined_spotify_tracks.csv")
  else
    echo "Warning: git-lfs not found; attempting to download via HTTPS" >&2
    curl -fSL \
      -H "Authorization: token $DATA_PAT" \
      -H "Accept: application/vnd.github.v3.raw" \
      -o "$DATA_REPO_DIR/combined_spotify_tracks.csv" \
      "https://raw.githubusercontent.com/Klus3kk/private_data/main/combined_spotify_tracks.csv"
  fi
  cp "$DATA_REPO_DIR/combined_spotify_tracks.csv" "$TARGET"
  rm -rf "$DATA_REPO_DIR"
fi

export SPOTIFY_DATA_PATH="$TARGET"
exec gunicorn app:app --bind 0.0.0.0:"${PORT:-8080}"
