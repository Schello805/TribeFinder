#!/bin/bash

set -euo pipefail

BACKUP_ARG=${1:-}
if [ -z "$BACKUP_ARG" ]; then
  echo "Usage: $0 <backup-file.tar.gz>"
  echo "Example: $0 backups/tribefinder-backup-2026-01-20T12-00-00-000Z.tar.gz"
  exit 1
fi

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)

BACKUP_PATH="$BACKUP_ARG"
if [[ "$BACKUP_PATH" != /* ]]; then
  BACKUP_PATH="$ROOT_DIR/$BACKUP_PATH"
fi

if [ ! -f "$BACKUP_PATH" ]; then
  echo "❌ Backup file not found: $BACKUP_PATH"
  exit 1
fi

if [[ "$BACKUP_PATH" != *.tar.gz ]]; then
  echo "❌ Backup file must end with .tar.gz"
  exit 1
fi

ENV_FILE="$ROOT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is not set. Define it in $ENV_FILE or export it in the shell."
  exit 1
fi

if [[ "$DATABASE_URL" != file:* ]]; then
  echo "❌ This restore script currently supports SQLite only (DATABASE_URL must start with file:)."
  exit 1
fi

DB_REL=${DATABASE_URL#file:}
DB_REL=${DB_REL#//}

if [[ "$DB_REL" == /* ]]; then
  DB_PATH="$DB_REL"
else
  DB_PATH="$ROOT_DIR/$DB_REL"
fi

UPLOADS_DIR="$ROOT_DIR/public/uploads"

REL_DB=$(python3 - <<PY
import os
print(os.path.relpath("$DB_PATH", "$ROOT_DIR"))
PY
)

TMP_DIR=$(mktemp -d)
cleanup() {
  rm -rf "$TMP_DIR" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "⚠️  IMPORTANT: Stop your app/service manually before restoring."

echo "📦 Extracting backup: $BACKUP_PATH"
# Extract into temp dir
# (Backup was created relative to ROOT_DIR)
tar -xzf "$BACKUP_PATH" -C "$TMP_DIR"

EXTRACTED_DB="$TMP_DIR/$REL_DB"
EXTRACTED_UPLOADS="$TMP_DIR/public/uploads"

if [ ! -f "$EXTRACTED_DB" ]; then
  echo "❌ Backup does not contain expected DB file: $REL_DB"
  echo "   Expected: $EXTRACTED_DB"
  exit 1
fi

if [ ! -d "$EXTRACTED_UPLOADS" ]; then
  echo "❌ Backup does not contain expected uploads directory: public/uploads"
  echo "   Expected: $EXTRACTED_UPLOADS"
  exit 1
fi

STAMP=$(date +"%Y%m%d_%H%M%S")

# Restore DB
mkdir -p "$(dirname "$DB_PATH")"
if [ -f "$DB_PATH" ]; then
  echo "🧷 Saving current DB: ${DB_PATH}.previous-${STAMP}"
  mv "$DB_PATH" "${DB_PATH}.previous-${STAMP}"
fi

echo "🗄️  Restoring DB -> $DB_PATH"
mv "$EXTRACTED_DB" "$DB_PATH"

# Restore uploads
mkdir -p "$(dirname "$UPLOADS_DIR")"
if [ -d "$UPLOADS_DIR" ]; then
  echo "🧷 Saving current uploads: ${UPLOADS_DIR}.previous-${STAMP}"
  mv "$UPLOADS_DIR" "${UPLOADS_DIR}.previous-${STAMP}"
fi

echo "🖼️  Restoring uploads -> $UPLOADS_DIR"
mv "$EXTRACTED_UPLOADS" "$UPLOADS_DIR"

echo "✅ Restore completed."
echo "👉 Next steps:"
echo "   1) Start your app/service manually"
echo "   2) Open /admin/diagnostics and run the self-test"
