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
import urllib.request

token = os.environ.get("DATA_PAT")
target = os.environ.get("TARGET_PATH")
api_url = "https://api.github.com/repos/Klus3kk/private_data/contents/combined_spotify_tracks.csv?ref=main"

if not token:
    print("DATA_PAT environment variable not set", file=sys.stderr)
    sys.exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

req = urllib.request.Request(api_url, headers=headers)
with urllib.request.urlopen(req) as resp:
    meta = json.load(resp)

download_url = meta.get("download_url")
if not download_url:
    download_url = meta.get("links", {}).get("download")

if download_url:
    dl_headers = {"Authorization": f"Bearer {token}"}
    req = urllib.request.Request(download_url, headers=dl_headers)
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
elif meta.get("encoding") == "base64" and meta.get("content"):
    data = base64.b64decode(meta["content"])
else:
    print("Unable to download dataset: no download URL available", file=sys.stderr)
    sys.exit(1)

with open(target, "wb") as fh:
    fh.write(data)
PY
fi

export SPOTIFY_DATA_PATH="$TARGET"
exec gunicorn app:app --bind 0.0.0.0:"${PORT:-8080}"
