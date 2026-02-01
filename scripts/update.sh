#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: Missing required command: $1" >&2
    exit 1
  }
}

die() {
  echo "ERROR: $1" >&2
  exit 1
}

confirm() {
  local prompt="$1"
  local answer
  read -r -p "$prompt" answer || true
  [[ "$answer" == "YES" ]]
}

require_cmd git

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  die "Not inside a git repository."
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" == "HEAD" ]]; then
  die "You are in detached HEAD state. Checkout a branch before updating."
fi

if [[ -n "$(git status --porcelain)" ]]; then
  die "Working tree not clean. Commit or stash changes before running update." 
fi

REMOTE="origin"

echo "== Preflight =="
if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  die "Remote '$REMOTE' not configured."
fi

echo "Fetching remote..."
git fetch "$REMOTE" --prune

TARGET_REF="$REMOTE/$BRANCH"
if ! git rev-parse --verify "$TARGET_REF" >/dev/null 2>&1; then
  die "Target ref '$TARGET_REF' not found."
fi

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "$TARGET_REF")"

if [[ "$LOCAL_SHA" == "$REMOTE_SHA" ]]; then
  echo "Already up-to-date ($BRANCH)."
  exit 0
fi

echo "== Native update mode =="
require_cmd npm

echo
echo "Consequences if you proceed:"
echo "- Will create a DB backup via 'npm run db:backup' (if configured)"
echo "- Will 'git pull --ff-only' on branch '$BRANCH'"
echo "- Will run: npm ci, npm run db:migrate, npm run build"
echo "- Will attempt to restart systemd service 'tribefinder' (best-effort)"
echo

if ! confirm "Proceed with LIVE native update? Type YES to continue: "; then
  echo "Cancelled. No live changes applied."
  exit 0
fi

echo "Creating DB backup (best-effort)..."
npm run -s db:backup || echo "WARNING: DB backup failed (continuing)."

echo "Pulling latest code..."
git pull --ff-only

echo "Installing dependencies..."
npm ci

echo "Running Prisma migrations..."
npm run -s db:migrate

echo "Building app..."
npm run -s build

echo "Restarting service (best-effort)..."
if command -v systemctl >/dev/null 2>&1; then
  if systemctl --no-pager status tribefinder >/dev/null 2>&1; then
    (sudo systemctl restart tribefinder && sudo systemctl --no-pager status tribefinder) || \
      echo "WARNING: Could not restart systemd service. If you don't have sudo, run: sudo systemctl restart tribefinder"
  else
    echo "NOTE: systemd service 'tribefinder' not found (skipping restart)."
  fi
else
  echo "NOTE: systemctl not found (skipping restart)."
fi

echo
echo "Native update finished."
