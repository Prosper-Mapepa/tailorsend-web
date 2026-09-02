set -e

APP_NAME="tailorsend"
VERSION="SECURE"

# Postgres must be up so the app container can reach it on the host.
docker compose up -d postgres

# BUILD THE DOCKER IMAGE: Cleanup old container/build images
docker rm -f "$APP_NAME" "${APP_NAME}-auth-proxy" jobs 2>/dev/null || true
docker build -t "$APP_NAME:$VERSION" .
# One scan only — a second scout copies the image to $TMPDIR again and fills the disk.
docker scout cves "$APP_NAME:$VERSION" --only-severity critical,high --output ./vulns.report --exit-code
docker scout sbom --output "$APP_NAME.sbom" "$APP_NAME:$VERSION"


# TEST THE CONTAINER: Next listens on 3000; map host 80 → container 3000.
# localhost inside the container is not your Mac — use host.docker.internal.
RUN_ARGS=(
  -d
  -p 80:3000
  --name "$APP_NAME"
  --add-host=host.docker.internal:host-gateway
)
if [ -f .env ]; then
  RUN_ARGS+=(--env-file .env)
fi
# Override after --env-file: inside the container, localhost is not your Mac.
# Host maps Postgres at 5433 (see docker-compose.yml).
RUN_ARGS+=(-e DATABASE_URL="postgresql://postgres:Letmein%4099x%21@host.docker.internal:5433/tailorsend")

docker run "${RUN_ARGS[@]}" "$APP_NAME:$VERSION"

# Next was built to proxy /api/auth → http://localhost:4000. In the container that
# is not the backend on your Mac. Share the app's network and forward 4000 out.
docker run -d \
  --name "${APP_NAME}-auth-proxy" \
  --network "container:$APP_NAME" \
  alpine/socat \
  TCP-LISTEN:4000,fork,reuseaddr TCP-CONNECT:host.docker.internal:4000
