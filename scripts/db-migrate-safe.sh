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

MIGRATION_LOCK_FILE="$PROJECT_DIR/prisma/migrations/migration_lock.toml"
LOCK_PROVIDER=""
if [ -f "$MIGRATION_LOCK_FILE" ]; then
  LOCK_PROVIDER="$(grep -E '^provider\s*=\s*"' "$MIGRATION_LOCK_FILE" | head -n1 | sed -E 's/^provider\s*=\s*"([^"]+)".*/\1/')"
fi

IS_SQLITE_URL=0
if [[ "$DATABASE_URL_RAW" == file:* ]]; then
  IS_SQLITE_URL=1
fi

if [ -n "$LOCK_PROVIDER" ] && [ "$LOCK_PROVIDER" = "sqlite" ] && [ "$IS_SQLITE_URL" -ne 1 ]; then
  echo "Prisma provider switch detected (migration_lock.toml=sqlite, DATABASE_URL!=file:). Using db push." >&2
  npm run db:push -- --accept-data-loss
  exit 0
fi

npm run db:migrate
