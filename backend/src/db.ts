import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { config } from "./config.js";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createClient(): PrismaClient {
  const pool = globalForPrisma.pgPool ?? new Pool({ connectionString: config.databaseUrl });
  if (config.nodeEnv !== "production") {
    globalForPrisma.pgPool = pool;
  }
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: config.nodeEnv === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (config.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}
