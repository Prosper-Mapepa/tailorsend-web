#!/bin/sh
# Railway web start: migrate then serve Next on 0.0.0.0:$PORT
set -eu

PORT="${PORT:-3000}"

echo "[railway-start] node=$(node -v) port=${PORT}"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[railway-start] ERROR: DATABASE_URL is not set" >&2
  exit 1
fi
echo "[railway-start] DATABASE_URL is set"

case "${BACKEND_URL:-}" in
  ""|http://localhost*|http://127.0.0.1*)
    if [ -n "${RAILWAY_ENVIRONMENT:-}" ]; then
      export BACKEND_URL="https://tailorsend-api-production.up.railway.app"
      echo "[railway-start] BACKEND_URL=${BACKEND_URL}"
    fi
    ;;
esac

echo "[railway-start] prisma migrate deploy..."
npx prisma migrate deploy

echo "[railway-start] next start --hostname 0.0.0.0 --port ${PORT}"
exec npx next start --hostname 0.0.0.0 --port "${PORT}"
