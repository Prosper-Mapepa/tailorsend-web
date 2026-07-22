/** Node-only: pending SQL migrations + Prisma Client regenerate for local development. */
export async function runDevMigrate() {
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.SKIP_DEV_MIGRATE === "1") return;

  const { execSync } = await import("node:child_process");
  const opts = { stdio: "inherit" as const, cwd: process.cwd() };

  try {
    execSync("npx prisma migrate deploy", opts);
    execSync("npx prisma generate", opts);
  } catch (err) {
    console.warn(
      "[instrumentation] Could not auto-migrate (is Postgres up?). Run: npm run db:up && npm run db:migrate",
    );
    console.warn(err);
  }
}
