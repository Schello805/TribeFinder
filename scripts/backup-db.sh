#!/bin/bash

# Database Backup Script for TribeFinder
# Creates timestamped backups of the SQLite database

set -e

# Configuration
BACKUP_DIR="./backups"
DB_FILE=""
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SNAPSHOT_DB="${BACKUP_DIR}/backup_${TIMESTAMP}.db"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"
MAX_BACKUPS=10

if [ -z "$DB_FILE" ] && [ -f ".env" ]; then
    DB_URL=$(grep -E '^DATABASE_URL=' .env | head -n 1 | cut -d= -f2- | tr -d '"\r')
    if [[ "$DB_URL" == file:* ]]; then
        DB_PATH="${DB_URL#file:}"
        if [[ "$DB_PATH" == /* ]]; then
            DB_FILE="$DB_PATH"
        else
            DB_FILE="$(pwd)/$DB_PATH"
        fi
    fi
fi

if [ -z "$DB_FILE" ]; then
    if [ -f "./prod.db" ]; then
        DB_FILE="./prod.db"
    else
        DB_FILE="./dev.db"
    fi
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database file not found: $DB_FILE"
    exit 1
fi

# Create a consistent SQLite snapshot (WAL-safe)
echo "📦 Creating DB snapshot..."
if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "❌ sqlite3 not found. Please install sqlite3 to create a consistent backup."
    exit 1
fi

# Use sqlite3 .backup to ensure WAL contents are included
sqlite3 "$DB_FILE" ".backup '$SNAPSHOT_DB'"

# Determine uploads directory (public/uploads is often a symlink)
UPLOADS_DIR="./public/uploads"
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

cp "$SNAPSHOT_DB" "$TMP_ROOT/db.sqlite"

if [ -d "$UPLOADS_DIR" ]; then
    # -L dereferences any symlinks within uploads
    cp -aL "$UPLOADS_DIR" "$TMP_ROOT/uploads"
else
    mkdir -p "$TMP_ROOT/uploads"
fi

tar -czf "$BACKUP_FILE" -C "$TMP_ROOT" db.sqlite uploads

# Optionally keep the raw snapshot DB alongside the tarball (small), but compress it to save space
gzip -f "$SNAPSHOT_DB"

# Get backup size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✅ Backup created: $BACKUP_FILE ($SIZE)"

# Clean up old backups (keep only MAX_BACKUPS)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    echo "🧹 Cleaning up old backups (keeping $MAX_BACKUPS most recent)..."
    ls -1t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
    echo "✅ Cleanup complete"
fi

echo "📊 Total backups: $(ls -1 "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | wc -l)"
