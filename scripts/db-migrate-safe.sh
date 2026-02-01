#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

DATABASE_URL_RAW="${DATABASE_URL:-}"

if [ -z "$DATABASE_URL_RAW" ] && [ -f "$PROJECT_DIR/.env" ]; then
  DATABASE_URL_RAW="$(grep -E '^DATABASE_URL=' "$PROJECT_DIR/.env" | head -n1 | sed 's/^DATABASE_URL=//')"
fi

DATABASE_URL_RAW="${DATABASE_URL_RAW//$'\n'/}"
DATABASE_URL_RAW="${DATABASE_URL_RAW//$'\r'/}"
DATABASE_URL_RAW="$(echo "$DATABASE_URL_RAW" | xargs)"

if [[ "$DATABASE_URL_RAW" == '"'*'"' ]] || [[ "$DATABASE_URL_RAW" == "'"*"'" ]]; then
  DATABASE_URL_RAW="${DATABASE_URL_RAW:1:${#DATABASE_URL_RAW}-2}"
fi

npm run db:push
