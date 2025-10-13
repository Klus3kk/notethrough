#!/usr/bin/env bash
set -eo pipefail

if [ ! -f /tmp/combined_spotify_tracks.csv ]; then
  curl -sSf -H "Authorization: token $DATA_PAT" \
    -L https://raw.githubusercontent.com/Klus3kk/private_data/main/combined_spotify_tracks.csv \
    -o /tmp/combined_spotify_tracks.csv
fi

export SPOTIFY_DATA_PATH=/tmp/combined_spotify_tracks.csv
exec gunicorn app:app --bind 0.0.0.0:$PORT
