#!/bin/bash
set -e

DBURL="${DATABASE_URL:-}"
LOCK_PROVIDER=""

if [ -f "prisma/migrations/migration_lock.toml" ]; then
  LOCK_PROVIDER=$(grep -E '^provider\s*=\s*"' prisma/migrations/migration_lock.toml | sed -E 's/^provider\s*=\s*"([^"]+)".*/\1/')
fi

if echo "$DBURL" | grep -q '^postgresql://\|^postgres://'; then
  if [ "$LOCK_PROVIDER" = "sqlite" ]; then
    npx prisma db push --accept-data-loss
    exit 0
  fi
fi

if npm run -s db:migrate; then
  exit 0
fi

if echo "$DBURL" | grep -q '^postgresql://\|^postgres://'; then
  npx prisma db push --accept-data-loss
  exit 0
fi

exit 1
