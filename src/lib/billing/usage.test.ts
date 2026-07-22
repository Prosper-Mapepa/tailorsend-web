import assert from "node:assert/strict";
import {
  applyConsumption,
  buildUsageSummary,
  canConsume,
  resetMonthlyCounters,
  shouldResetMonthlyPeriod,
  type UsageAccountSnapshot,
} from "./usage-core";
import { FREE_LIMITS_STUDENT } from "./plans";

function baseAccount(
  overrides: Partial<UsageAccountSnapshot> = {},
): UsageAccountSnapshot {
  return {
    plan: "free",
    isStudent: true,
    creditBalance: 0,
    periodStart: new Date("2026-07-01T00:00:00Z"),
    tailorKitsUsed: 0,
    autofillKitsUsed: 0,
    planKitsUsed: 0,
    seasonKitsTotal: 0,
    seasonEndsAt: null,
    flexPausedUntil: null,
    ...overrides,
  };
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log("usage-core tests\n");

test("student free tailor limit blocks at 5", () => {
  const summary = buildUsageSummary(
    baseAccount({ tailorKitsUsed: FREE_LIMITS_STUDENT.tailorPerMonth }),
  );
  const d = canConsume(summary, "tailor", false);
  assert.equal(d.allowed, false);
});

test("student free tailor allows within limit", () => {
  const summary = buildUsageSummary(baseAccount({ tailorKitsUsed: 2 }));
  const d = canConsume(summary, "tailor", false);
  assert.equal(d.allowed, true);
  assert.equal(d.source, "free_monthly");
});

test("autofill uses separate free pool", () => {
  const summary = buildUsageSummary(
    baseAccount({
      tailorKitsUsed: FREE_LIMITS_STUDENT.tailorPerMonth,
      autofillKitsUsed: 0,
    }),
  );
  const d = canConsume(summary, "autofill", false);
  assert.equal(d.allowed, true);
  assert.equal(d.source, "free_monthly");
});

test("credits used when free exhausted", () => {
  const summary = buildUsageSummary(
    baseAccount({
      tailorKitsUsed: FREE_LIMITS_STUDENT.tailorPerMonth,
      creditBalance: 3,
    }),
  );
  const d = canConsume(summary, "tailor", false);
  assert.equal(d.allowed, true);
  assert.equal(d.source, "credits");
});

test("already charged skips consumption", () => {
  const summary = buildUsageSummary(
    baseAccount({ tailorKitsUsed: FREE_LIMITS_STUDENT.tailorPerMonth }),
  );
  const d = canConsume(summary, "tailor", true);
  assert.equal(d.allowed, true);
  assert.equal(d.source, "already_charged");
});

test("flex plan uses plan kits", () => {
  const summary = buildUsageSummary(
    baseAccount({ plan: "flex", planKitsUsed: 5 }),
  );
  const d = canConsume(summary, "tailor", false);
  assert.equal(d.allowed, true);
  assert.equal(d.source, "flex_plan");
});

test("flex exhausted falls back to credits", () => {
  const summary = buildUsageSummary(
    baseAccount({ plan: "flex", planKitsUsed: 25, creditBalance: 2 }),
  );
  const d = canConsume(summary, "autofill", false);
  assert.equal(d.allowed, true);
  assert.equal(d.source, "credits");
});

test("annual plan uses plan kits", () => {
  const summary = buildUsageSummary(
    baseAccount({ plan: "annual", planKitsUsed: 3 }),
  );
  const d = canConsume(summary, "tailor", false);
  assert.equal(d.allowed, true);
  assert.equal(d.source, "flex_plan");
  assert.equal(summary.planKitsRemaining, 22);
});

test("incorporate blocked on free without credits", () => {
  const summary = buildUsageSummary(baseAccount());
  const d = canConsume(summary, "incorporate", false);
  assert.equal(d.allowed, false);
});

test("monthly reset clears counters", () => {
  const old = baseAccount({
    periodStart: new Date("2026-06-01T00:00:00Z"),
    tailorKitsUsed: 5,
  });
  assert.equal(
    shouldResetMonthlyPeriod(old.periodStart, new Date("2026-07-15T00:00:00Z")),
    true,
  );
  const reset = resetMonthlyCounters(
    old,
    new Date("2026-07-15T00:00:00Z"),
  );
  assert.equal(reset.tailorKitsUsed, 0);
});

test("applyConsumption decrements credits", () => {
  const next = applyConsumption(baseAccount({ creditBalance: 5 }), "tailor", "credits");
  assert.equal(next.creditBalance, 4);
});

console.log("\nAll usage-core tests passed.");
