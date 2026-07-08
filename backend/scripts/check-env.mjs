const required = ["DATABASE_URL", "SESSION_SECRET"];

let missing = false;
for (const name of required) {
  if (!process.env[name]?.trim()) {
    console.error(`[startup] Missing required env var: ${name}`);
    missing = true;
  }
}

if (missing) {
  console.error(
    "[startup] Set DATABASE_URL (Postgres reference) and SESSION_SECRET in Railway → tailorsend-api → Variables.",
  );
  process.exit(1);
}
