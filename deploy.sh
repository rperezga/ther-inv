#!/bin/bash
set -e

echo "=========================================="
echo "🚀 THER-INV - Auto Deploy Script (Hermes) "
echo "=========================================="

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "📥 1. Obteniendo últimos cambios de GitHub..."
git fetch origin main
git reset --hard origin/main

echo "📦 2. Reconstruyendo y actualizando contenedores..."
if command -v docker-compose &> /dev/null; then
    docker-compose down
    docker-compose up -d --build
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    docker compose down
    docker compose up -d --build
else
    echo "⚠️ Docker no encontrado. Intentando deploy nativo con Node.js y PM2..."
    npm ci
    npm run build
    pm2 restart ther-inv || pm2 start npm --name "ther-inv" -- start
fi

echo "⏳ 3. Esperando que los servicios inicien..."
sleep 5

echo "🌱 4. Verificando inicialización de datos base..."
curl -s -X POST http://localhost:3000/api/seed || true

echo "✅ 5. Deploy completado exitosamente!"
echo "Accede a la aplicación en: http://localhost:3000 o a través de la IP de tu servidor Kali."
echo "=========================================="
