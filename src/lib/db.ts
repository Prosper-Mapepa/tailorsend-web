import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  prismaSchemaFp?: string;
};

function schemaFingerprint(): string {
  try {
    const schema = readFileSync(
      join(process.cwd(), "prisma/schema.prisma"),
      "utf8",
    );
    return createHash("md5").update(schema).digest("hex").slice(0, 12);
  } catch {
    return "unknown";
  }
}

function createPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }
  // Avoid slow IPv6 (`::1`) resolution when Postgres only listens on IPv4.
  const normalized = connectionString.replace(
    /@localhost(:|\/)/,
    "@127.0.0.1$1",
  );
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString: normalized,
      // Fail fast instead of hanging ~68s on a dead connection.
      connectionTimeoutMillis: 10_000,
      // Recycle idle connections so stale sockets (e.g. after sleep) are dropped.
      idleTimeoutMillis: 30_000,
      keepAlive: true,
      max: 10,
    });
  // Prevent an unhandled pool error (dead backend) from crashing the process.
  pool.on("error", (err) => {
    console.error("pg pool error (will recycle connection):", err.message);
  });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getPrisma(): PrismaClient {
  const fp = schemaFingerprint();
  if (globalForPrisma.prisma && globalForPrisma.prismaSchemaFp === fp) {
    return globalForPrisma.prisma;
  }
  const client = createPrisma();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaSchemaFp = fp;
  }
  return client;
}

// Lazy proxy so Next.js build can import this module without DATABASE_URL.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
