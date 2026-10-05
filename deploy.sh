#!/bin/bash
set -e

echo "=========================================="
echo "🚀 THER-INV - Native Auto-Deploy Script"
echo "=========================================="

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "📥 1. Pulling latest code changes from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "📦 2. Installing dependencies..."
if [ -f "package-lock.json" ]; then
  npm ci --prefer-offline || npm install
else
  npm install
fi

echo "🔨 3. Building Next.js application..."
npm run build

APP_PORT="${PORT:-3300}"
if [ -f ".env" ]; then
  ENV_PORT=$(grep -E '^PORT=' .env | cut -d '=' -f2 | tr -d '"\r ')
  if [ -n "$ENV_PORT" ]; then
    APP_PORT="$ENV_PORT"
  fi
fi

echo "🔄 4. Restarting application process on port $APP_PORT..."
if command -v pm2 &> /dev/null; then
  echo "Detected PM2 process manager..."
  if pm2 describe ther-inv &> /dev/null; then
    pm2 reload ther-inv || pm2 restart ther-inv
  else
    pm2 start ecosystem.config.cjs
  fi
  pm2 save || true
elif systemctl is-active --quiet ther-inv.service 2>/dev/null; then
  echo "Detected systemd ther-inv.service..."
  systemctl restart ther-inv.service
else
  echo "ℹ️ No active PM2 or systemd unit detected for ther-inv."
  echo "Please start the service using your server's process manager (PM2 or systemd)."
fi

echo "⏳ 5. Waiting for service to respond on port $APP_PORT..."
sleep 4

echo "🌱 6. Ensuring database seed initialized..."
curl -s -X POST "http://localhost:$APP_PORT/api/seed" || true

echo ""
echo "✅ Deployment finished successfully!"
echo "Access the application at: http://localhost:$APP_PORT (or via configured domain/reverse proxy)"
echo "=========================================="

