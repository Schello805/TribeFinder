#!/bin/bash

# Database Backup Script for TribeFinder
# Creates timestamped backups of the SQLite database

set -e

# Configuration
BACKUP_DIR="./backups"
DB_FILE="./dev.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.db"
MAX_BACKUPS=10

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database file not found: $DB_FILE"
    exit 1
fi

# Create backup
echo "📦 Creating backup..."
cp "$DB_FILE" "$BACKUP_FILE"

# Compress backup
echo "🗜️  Compressing backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Get backup size
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo "✅ Backup created: $BACKUP_FILE ($SIZE)"

# Clean up old backups (keep only MAX_BACKUPS)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.db.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    echo "🧹 Cleaning up old backups (keeping $MAX_BACKUPS most recent)..."
    ls -1t "$BACKUP_DIR"/backup_*.db.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
    echo "✅ Cleanup complete"
fi

echo "📊 Total backups: $(ls -1 "$BACKUP_DIR"/backup_*.db.gz 2>/dev/null | wc -l)"
