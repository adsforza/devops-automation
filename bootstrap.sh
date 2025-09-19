#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)

echo "==> Starting docker compose (Postgres + Adminer)"
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d

echo "==> Installing backend deps"
(cd "$ROOT_DIR/backend" && npm install --no-audit --no-fund)

echo "==> Installing frontend deps"
(cd "$ROOT_DIR/frontend" && npm install --no-audit --no-fund)

echo "==> Generating Prisma client"
(cd "$ROOT_DIR/backend" && npx prisma generate)

echo "==> Running migrations"
(cd "$ROOT_DIR/backend" && npx prisma migrate dev --name init)

echo "==> Seeding database"
(cd "$ROOT_DIR/backend" && npm run prisma:seed)

echo "==> All set. Start dev servers in separate terminals:"
echo "Backend: cd backend && npm run dev"
echo "Frontend: cd frontend && npm run dev"