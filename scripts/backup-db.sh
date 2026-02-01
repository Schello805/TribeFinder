#!/bin/bash

# Database Backup Script for TribeFinder
# Creates timestamped backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/tribefinder-backup-${TIMESTAMP}.tar.gz"
MAX_BACKUPS=10

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Load .env (DATABASE_URL, BACKUP_DIR, UPLOADS_DIR)
if [ -f ".env" ]; then
    set -a
    # shellcheck source=/dev/null
    source .env
    set +a

    if [ -n "${BACKUP_DIR:-}" ]; then
        BACKUP_FILE="${BACKUP_DIR}/tribefinder-backup-${TIMESTAMP}.tar.gz"
    fi
fi

# Create backup directory if it doesn't exist (after env override)
mkdir -p "$BACKUP_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
    echo "❌ DATABASE_URL is not set. Define it in .env or export it in the shell."
    exit 1
fi

# Prisma URLs often include ?schema=public which pg_dump rejects.
DATABASE_URL_CLI="$DATABASE_URL"
if command -v node >/dev/null 2>&1; then
    DATABASE_URL_CLI=$(DATABASE_URL="$DATABASE_URL" node -e 'try{const u=new URL(process.env.DATABASE_URL);u.searchParams.delete("schema");process.stdout.write(u.toString());}catch(e){process.stdout.write(process.env.DATABASE_URL||"");}' 2>/dev/null || echo "$DATABASE_URL")
else
    DATABASE_URL_CLI=$(echo "$DATABASE_URL" | sed -E 's/([?&])schema=[^&]+(&?)/\1/; s/[?&]$//')
fi

if ! command -v pg_dump >/dev/null 2>&1; then
    echo "❌ pg_dump not found. Please install postgresql-client."
    exit 1
fi

echo "📦 Creating Postgres dump..."

# Determine uploads directory (public/uploads is often a symlink)
UPLOADS_DIR="${UPLOADS_DIR:-./public/uploads}"
if [ -L "$UPLOADS_DIR" ]; then
    # resolve symlink target
    UPLOADS_DIR="$(readlink -f "$UPLOADS_DIR")"
fi

# Create tar.gz bundle
echo "🗜️  Creating tar.gz bundle (db + uploads)..."
TMP_ROOT=$(mktemp -d)
cleanup() {
    rm -rf "$TMP_ROOT" || true
}
trap cleanup EXIT

pg_dump --no-owner --no-privileges --format=p -f "$TMP_ROOT/db.sql" -d "$DATABASE_URL_CLI"

if [ -d "$UPLOADS_DIR" ]; then
    # -L dereferences any symlinks within uploads
    cp -aL "$UPLOADS_DIR" "$TMP_ROOT/uploads"
else
    mkdir -p "$TMP_ROOT/uploads"
fi

tar -czf "$BACKUP_FILE" -C "$TMP_ROOT" db.sql uploads

# Get backup size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✅ Backup created: $BACKUP_FILE ($SIZE)"

# Clean up old backups (keep only MAX_BACKUPS)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/tribefinder-backup-*.tar.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    echo "🧹 Cleaning up old backups (keeping $MAX_BACKUPS most recent)..."
    ls -1t "$BACKUP_DIR"/tribefinder-backup-*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
    echo "✅ Cleanup complete"
fi

echo "📊 Total backups: $(ls -1 "$BACKUP_DIR"/tribefinder-backup-*.tar.gz 2>/dev/null | wc -l)"
