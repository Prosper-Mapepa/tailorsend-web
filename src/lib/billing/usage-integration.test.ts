/**
 * Integration test for billing usage (requires Postgres).
 * Run: npm run test:billing
 */
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import {
  assertCanUse,
  consumeUsage,
  addCredits,
  getUsageSummary,
  UsageLimitError,
} from "./usage";

const TEST_EMAIL = "billing-test@university.edu";

async function ensureTestUser() {
  const existing = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: "Billing Test",
      passwordHash: "test-hash",
    },
  });
}

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

async function main() {
  console.log("billing integration tests\n");

  const user = await ensureTestUser();

  await prisma.usageAccount.deleteMany({ where: { userId: user.id } });
  await prisma.usageEvent.deleteMany({ where: { userId: user.id } });

  await test("creates student usage account", async () => {
    const summary = await getUsageSummary(user.id, TEST_EMAIL);
    assert.equal(summary.isStudent, true);
    assert.equal(summary.plan, "free");
    assert.equal(summary.limits.tailorPerMonth, 5);
  });

  await test("consumes free tailor kits", async () => {
    for (let i = 0; i < 5; i++) {
      await consumeUsage(user.id, TEST_EMAIL, "tailor");
    }
    const summary = await getUsageSummary(user.id, TEST_EMAIL);
    assert.equal(summary.tailorKitsUsed, 5);
  });

  await test("blocks tailor when free exhausted", async () => {
    await assert.rejects(
      () => assertCanUse(user.id, TEST_EMAIL, "tailor"),
      (e: unknown) => e instanceof UsageLimitError,
    );
  });

  await test("credits unlock tailor", async () => {
    await addCredits(user.id, TEST_EMAIL, 2, "pack_5");
    await consumeUsage(user.id, TEST_EMAIL, "tailor");
    const summary = await getUsageSummary(user.id, TEST_EMAIL);
    assert.equal(summary.creditBalance, 1);
  });

  await test("incorporate blocked without credits on free", async () => {
    await prisma.usageAccount.update({
      where: { userId: user.id },
      data: { creditBalance: 0 },
    });
    await assert.rejects(
      () => assertCanUse(user.id, TEST_EMAIL, "incorporate"),
      (e: unknown) => e instanceof UsageLimitError,
    );
  });

  const token = process.env.AUTH_TOKEN;
  if (token) {
    const base = process.env.API_BASE ?? "http://localhost:3000";
    await test("GET /api/billing/usage", async () => {
      const res = await fetch(`${base}/api/billing/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.usage);
      assert.ok(Array.isArray(data.packs));
    });
  } else {
    console.log("  ↷ skip API test (set AUTH_TOKEN to run)");
  }

  console.log("\nAll billing integration tests passed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
