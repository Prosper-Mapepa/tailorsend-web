import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const prismaDir = join(backendRoot, "prisma");

mkdirSync(prismaDir, { recursive: true });
copyFileSync(
  join(backendRoot, "..", "prisma", "schema.prisma"),
  join(prismaDir, "schema.prisma"),
);
