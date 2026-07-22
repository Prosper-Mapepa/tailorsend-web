import assert from "node:assert/strict";
import {
  classifyBoardInput,
  mergeSearchBoards,
  resolveJobBoards,
} from "./job-boards";

assert.deepEqual(classifyBoardInput("https://boards.greenhouse.io/stripe"), {
  kind: "greenhouse",
  value: "stripe",
  defaultLabel: "Stripe",
});

assert.deepEqual(
  classifyBoardInput("https://job-boards.greenhouse.io/airbnb/jobs/123"),
  {
    kind: "greenhouse",
    value: "airbnb",
    defaultLabel: "Airbnb",
  },
);

assert.deepEqual(classifyBoardInput("https://jobs.lever.co/netflix"), {
  kind: "lever",
  value: "netflix",
  defaultLabel: "Netflix",
});

assert.equal(
  classifyBoardInput("https://careers.microsoft.com/us/en")?.kind,
  "company",
);
assert.equal(
  classifyBoardInput("https://careers.microsoft.com/us/en")?.value,
  "Microsoft",
);

assert.deepEqual(classifyBoardInput("Kaiser Permanente"), {
  kind: "company",
  value: "Kaiser Permanente",
  defaultLabel: "Kaiser Permanente",
});

const resolved = resolveJobBoards([
  { input: "https://boards.greenhouse.io/stripe", label: "Stripe" },
  { input: "https://jobs.lever.co/spotify", label: "" },
  { input: "Microsoft", label: "MSFT" },
]);
assert.deepEqual(resolved.greenhouse, ["stripe"]);
assert.deepEqual(resolved.lever, ["spotify"]);
assert.deepEqual(resolved.targetCompanies, ["Microsoft"]);

const merged = mergeSearchBoards({
  envGreenhouse: "figma",
  envLever: "netflix",
  envCompanies: "Amazon",
  userSites: [
    { input: "https://boards.greenhouse.io/stripe", label: "" },
    { input: "Apple", label: "" },
  ],
});
assert.ok(merged.greenhouse.includes("stripe"));
assert.ok(merged.greenhouse.includes("figma"));
assert.ok(merged.lever.includes("netflix"));
assert.ok(merged.targetCompanies.includes("Apple"));
assert.ok(merged.targetCompanies.includes("Amazon"));

console.log("job-boards.test.ts: ok");
