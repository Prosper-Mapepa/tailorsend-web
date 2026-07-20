#!/usr/bin/env bash
# Railway web start: migrate then serve Next on 0.0.0.0:$PORT
set -euo pipefail

PORT="${PORT:-3000}"

echo "[railway-start] node=$(node -v) port=${PORT}"
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[railway-start] ERROR: DATABASE_URL is not set" >&2
  exit 1
fi
echo "[railway-start] DATABASE_URL is set"

echo "[railway-start] prisma migrate deploy..."
npx prisma migrate deploy

echo "[railway-start] next start --hostname 0.0.0.0 --port ${PORT}"
exec npx next start --hostname 0.0.0.0 --port "${PORT}"
