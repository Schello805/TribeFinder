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
require_cmd docker

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker-compose)
else
  die "Docker Compose not found (need 'docker compose' or 'docker-compose')."
fi

if [[ ! -f docker-compose.yml ]]; then
  die "docker-compose.yml not found in repo root."
fi

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

echo "Update available:"
echo "- Local : $LOCAL_SHA"
echo "- Remote: $REMOTE_SHA"

echo

echo "Files changed (summary):"
git diff --name-status "$LOCAL_SHA..$REMOTE_SHA" | sed 's/^/  /'

echo

WORKTREE_DIR=".update-worktree"
BACKUP_DIR="backups"
TEST_DB_REL="db/test-update.db"

DB_DIR_REL="db"
PROD_DB_REL="db/prod.db"

mkdir -p "$BACKUP_DIR"
mkdir -p "$DB_DIR_REL"

if [[ ! -f "$PROD_DB_REL" ]]; then
  echo "WARNING: Expected production DB not found at '$PROD_DB_REL'."
  echo "         Your docker-compose.yml uses DATABASE_URL=file:/app/db/prod.db and volume ./db:/app/db"
  echo "         If prod DB has a different name/location, adjust this script accordingly."
fi

if [[ -e "$WORKTREE_DIR" ]]; then
  die "Temp worktree dir '$WORKTREE_DIR' already exists. Remove it and retry."
fi

if ! git worktree list >/dev/null 2>&1; then
  die "git worktree not supported in this git version."
fi

echo "== Test run in temporary worktree =="

git worktree add --detach "$WORKTREE_DIR" "$REMOTE_SHA" >/dev/null

cleanup() {
  set +e
  if [[ -d "$WORKTREE_DIR" ]]; then
    git worktree remove -f "$WORKTREE_DIR" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ -f "$PROD_DB_REL" ]]; then
  mkdir -p "$WORKTREE_DIR/db"
  cp -f "$PROD_DB_REL" "$WORKTREE_DIR/$TEST_DB_REL"
else
  echo "Skipping DB copy for test run (no prod DB file found)."
fi

pushd "$WORKTREE_DIR" >/dev/null

echo "Building Docker image (new version)..."
"${DOCKER_COMPOSE[@]}" build --pull web

echo

echo "Running Prisma migrations against test DB copy..."
if [[ -f "$TEST_DB_REL" ]]; then
  "${DOCKER_COMPOSE[@]}" run --rm -e "DATABASE_URL=file:/app/db/test-update.db" web npx prisma migrate deploy
else
  echo "Skipping migration test (test DB missing)."
fi

popd >/dev/null

echo

echo "== Consequences if you proceed =="
echo "- Will STOP the running container(s) briefly"
echo "- Will create a DB backup under '$BACKUP_DIR/'"
echo "- Will 'git pull --ff-only' on branch '$BRANCH'"
echo "- Will rebuild and restart via Docker Compose"
echo

if ! confirm "Proceed with LIVE update? Type YES to continue: "; then
  echo "Cancelled. No live changes applied."
  exit 0
fi

echo "== LIVE update =="

TS="$(date +%F_%H-%M-%S)"

if [[ -f "$PROD_DB_REL" ]]; then
  echo "Stopping web container for consistent DB backup..."
  "${DOCKER_COMPOSE[@]}" stop web || true

  BACKUP_PATH="$BACKUP_DIR/prod.db.$TS"
  echo "Creating DB backup: $BACKUP_PATH"
  cp -f "$PROD_DB_REL" "$BACKUP_PATH"
fi

echo "Pulling latest code..."
git pull --ff-only

echo "Rebuilding + starting..."
"${DOCKER_COMPOSE[@]}" up -d --build

echo

echo "Update finished. Current status:"
"${DOCKER_COMPOSE[@]}" ps
