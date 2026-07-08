import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const prismaDir = join(backendRoot, "prisma");
const dest = join(prismaDir, "schema.prisma");
const monorepoSchema = join(backendRoot, "..", "prisma", "schema.prisma");

mkdirSync(prismaDir, { recursive: true });

// Local dev: keep backend schema in sync with repo root. Railway only ships backend/.
if (existsSync(monorepoSchema)) {
  copyFileSync(monorepoSchema, dest);
} else if (!existsSync(dest)) {
  console.error(
    "[prepare-prisma] Missing backend/prisma/schema.prisma — commit a copy for deploy.",
  );
  process.exit(1);
}
