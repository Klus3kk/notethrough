#!/usr/bin/env bash
set -eo pipefail

TARGET=/tmp/combined_spotify_tracks.csv

if [ ! -f "$TARGET" ]; then
  if [ -z "$DATA_PAT" ]; then
    echo "DATA_PAT environment variable not set" >&2
    exit 1
  fi
  export TARGET_PATH="$TARGET"
  python <<'PY'
import base64
import json
import os
import sys
from pathlib import Path
from urllib.request import Request, urlopen

token = os.environ.get("DATA_PAT")
target = Path(os.environ.get("TARGET_PATH", "/tmp/combined_spotify_tracks.csv"))
api_url = "https://api.github.com/repos/Klus3kk/private_data/contents/combined_spotify_tracks.csv?ref=main"

if not token:
    print("DATA_PAT environment variable not set", file=sys.stderr)
    sys.exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

req = Request(api_url, headers=headers)
with urlopen(req) as resp:
    meta = json.load(resp)

download_url = meta.get("download_url")
if download_url:
    req = Request(download_url, headers={"Authorization": f"Bearer {token}"})
    with urlopen(req) as resp:
        data = resp.read()
elif meta.get("encoding") == "base64" and meta.get("content"):
    data = base64.b64decode(meta["content"])
else:
    print("Unable to download dataset", file=sys.stderr)
    sys.exit(1)

target.write_bytes(data)
PY
fi

export SPOTIFY_DATA_PATH="$TARGET"
exec gunicorn app:app --bind 0.0.0.0:"${PORT:-8080}"
