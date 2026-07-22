/** Runs pending SQL migrations + regenerates Prisma Client before the Node server starts. */
export async function register() {
  // Instrumentation can load in Edge and Node. Prisma migrate needs Node APIs only.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runDevMigrate } = await import("./instrumentation.node");
    await runDevMigrate();
  }
}
