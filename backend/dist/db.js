import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { config } from "./config.js";
const globalForPrisma = globalThis;
function createClient() {
    const adapter = new PrismaBetterSqlite3({ url: config.databaseUrl });
    return new PrismaClient({
        adapter,
        log: config.nodeEnv === "development" ? ["warn", "error"] : ["error"],
    });
}
export const prisma = globalForPrisma.prisma ?? createClient();
if (config.nodeEnv !== "production") {
    globalForPrisma.prisma = prisma;
}
