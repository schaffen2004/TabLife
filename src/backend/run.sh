#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! python3 -c "import fastapi, psycopg2, uvicorn" >/dev/null 2>&1; then
  echo "Missing backend dependencies."
  echo "Install them first with: python3 -m pip install -r src/backend/requirements.txt"
  exit 1
fi

python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
