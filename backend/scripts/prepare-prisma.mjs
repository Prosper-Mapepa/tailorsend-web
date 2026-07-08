import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const prismaDir = join(backendRoot, "prisma");
const dest = join(prismaDir, "schema.prisma");
const monorepoSchema = join(backendRoot, "..", "prisma", "schema.prisma");
const monorepoMigrations = join(backendRoot, "..", "prisma", "migrations");

mkdirSync(prismaDir, { recursive: true });

// Local dev: keep backend schema/migrations in sync with repo root. Railway only ships backend/.
if (existsSync(monorepoSchema)) {
  copyFileSync(monorepoSchema, dest);
}
if (existsSync(monorepoMigrations)) {
  cpSync(monorepoMigrations, join(prismaDir, "migrations"), { recursive: true });
}

if (!existsSync(dest)) {
  console.error(
    "[prepare-prisma] Missing backend/prisma/schema.prisma — commit a copy for deploy.",
  );
  process.exit(1);
}
