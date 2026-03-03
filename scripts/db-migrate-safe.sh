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

if [ -z "$DATABASE_URL_RAW" ]; then
  echo "❌ DATABASE_URL fehlt. Bitte in .env setzen (PostgreSQL)." >&2
  exit 1
fi

export DATABASE_URL="$DATABASE_URL_RAW"

if ! echo "$DATABASE_URL" | grep -qiE '^postgres(ql)?://'; then
  echo "❌ DATABASE_URL scheint keine PostgreSQL-URL zu sein." >&2
  echo "   DATABASE_URL=$DATABASE_URL" >&2
  exit 1
fi

npm run db:migrate:deploy
