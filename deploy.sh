#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="/tmp/ther-inv-deploy.lock"

# Ensure Node/npm/pm2 paths are present in cron non-interactive environment
export PATH="/home/roger/.nvm/versions/node/$(ls /home/roger/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Concurrency protection with flock
exec 200>"$LOCK_FILE"
flock -n 200 || {
  echo "⚠️ Deploy already in progress. Exiting."
  exit 0
}

cd "$APP_DIR"

# 1. Fetch latest commits without destroying local files
git fetch origin main --quiet

LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse origin/main)

# If already up to date, exit quietly
if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
  exit 0
fi

echo "=========================================="
echo "🚀 THER-INV - Updating: $LOCAL_HASH -> $REMOTE_HASH"
echo "=========================================="

# Fast-forward merge (preserves non-tracked files like .alfredo-credentials)
git merge --ff-only origin/main

# 2. Dependencies
if [ -f "package-lock.json" ]; then
  npm ci --prefer-offline --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

# 3. Production Build
echo "🔨 Building Next.js..."
npm run build

# 4. Graceful Reload via PM2 or systemd
if command -v pm2 &> /dev/null; then
  if pm2 describe ther-inv &> /dev/null; then
    echo "🔄 Reloading ther-inv process..."
    pm2 reload ther-inv || pm2 restart ther-inv
  else
    echo "▶️ Starting ther-inv with ecosystem.config.cjs..."
    pm2 start ecosystem.config.cjs
  fi
elif systemctl is-active --quiet ther-inv.service 2>/dev/null; then
  systemctl restart ther-inv.service
fi

echo "✅ THER-INV deploy completed at $(date)"

