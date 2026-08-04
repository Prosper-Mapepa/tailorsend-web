/**
 * Stub importer for DOL LCA (H-1B) / future E-Verify public datasets.
 *
 * Usage (when you have a CSV):
 *   npx tsx --env-file=.env scripts/import-lca.ts path/to/lca.csv
 *
 * Until a file is provided, this script documents the expected flow and can
 * dry-run with --demo to show how Company.sponsorshipMeta is updated.
 *
 * CSV columns (flexible aliases):
 *   employer_name | EMP_NAME | company
 *   fiscal_year   | YEAR
 *   case_status   | STATUS  (optional; prefer Certified)
 *   visa_class    | VISA_CLASS (H-1B, etc.)
 */

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  mergeSponsorshipMeta,
  parseSponsorshipMeta,
  type SponsorshipMeta,
} from "../src/lib/sponsorship-meta";

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(
      /\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company|the)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function companySlug(name: string): string {
  const base =
    normalizeCompanyName(name).replace(/\s+/g, "-").replace(/^-|-$/g, "") ||
    "company";
  return base.slice(0, 80);
}

type Agg = {
  name: string;
  years: Set<number>;
  count: number;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function colIndex(header: string[], aliases: string[]): number {
  const lower = header.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  for (const a of aliases) {
    const i = lower.indexOf(a.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

async function loadAggregates(path: string): Promise<Map<string, Agg>> {
  const rl = createInterface({
    input: createReadStream(path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let header: string[] | null = null;
  let iName = -1;
  let iYear = -1;
  let iStatus = -1;
  let iVisa = -1;
  const map = new Map<string, Agg>();

  for await (const line of rl) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    if (!header) {
      header = cols;
      iName = colIndex(header, [
        "employer_name",
        "emp_name",
        "company",
        "employer",
      ]);
      iYear = colIndex(header, [
        "fiscal_year",
        "year",
        "fy",
        "decision_year",
      ]);
      iStatus = colIndex(header, ["case_status", "status"]);
      iVisa = colIndex(header, ["visa_class", "visa"]);
      if (iName < 0) {
        throw new Error(
          "CSV needs an employer name column (employer_name / EMP_NAME / company)",
        );
      }
      continue;
    }

    const name = cols[iName]?.trim();
    if (!name) continue;
    if (iStatus >= 0) {
      const st = (cols[iStatus] ?? "").toLowerCase();
      if (st && !st.includes("certif") && !st.includes("approv")) continue;
    }
    if (iVisa >= 0) {
      const v = (cols[iVisa] ?? "").toUpperCase();
      if (v && !v.includes("H-1B") && !v.includes("H1B")) continue;
    }
    const yearRaw = iYear >= 0 ? Number(cols[iYear]) : NaN;
    const year = Number.isFinite(yearRaw) ? yearRaw : new Date().getFullYear();
    const key = normalizeCompanyName(name);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.years.add(year);
      existing.count += 1;
    } else {
      map.set(key, { name, years: new Set([year]), count: 1 });
    }
  }

  return map;
}

async function applyAggregates(
  prisma: PrismaClient,
  map: Map<string, Agg>,
  dryRun: boolean,
) {
  let updated = 0;
  let created = 0;
  const now = new Date().toISOString();

  for (const [, agg] of map) {
    const normalized = normalizeCompanyName(agg.name);
    const slug = companySlug(agg.name);
    const patch: SponsorshipMeta = {
      h1bFilingYears: Array.from(agg.years).sort((a, b) => b - a),
      h1bFilingCount: agg.count,
      source: "dol-lca",
      lastSyncedAt: now,
    };

    let company = await prisma.company.findUnique({ where: { slug } });
    if (!company) {
      company = await prisma.company.findFirst({
        where: { normalizedName: normalized },
      });
    }

    if (!company) {
      if (dryRun) {
        console.log(`[dry-run] would create ${slug} (${agg.count} filings)`);
        created += 1;
        continue;
      }
      await prisma.company.create({
        data: {
          slug,
          name: agg.name,
          normalizedName: normalized,
          h1bSponsor: "yes",
          visaScore: 70,
          sponsorshipMeta: JSON.stringify(patch),
          aliases: JSON.stringify([normalized]),
        },
      });
      created += 1;
      continue;
    }

    const current = parseSponsorshipMeta(company.sponsorshipMeta);
    const merged = mergeSponsorshipMeta(current, patch);
    if (dryRun) {
      console.log(
        `[dry-run] would update ${company.slug} → h1b=yes, filings=${agg.count}`,
      );
      updated += 1;
      continue;
    }
    await prisma.company.update({
      where: { id: company.id },
      data: {
        h1bSponsor: "yes",
        sponsorshipMeta: JSON.stringify(merged),
        visaScore: Math.max(company.visaScore, 70),
      },
    });
    updated += 1;
  }

  return { updated, created };
}

async function main() {
  const args = process.argv.slice(2);
  const demo = args.includes("--demo");
  const dryRun = args.includes("--dry-run") || demo;
  const path = args.find((a) => !a.startsWith("--"));

  if (!path && !demo) {
    console.log(`F-1 Visa Engine — LCA import stub

No CSV provided. Company H-1B / Green Card / E-Verify stay Unknown until
you import a public dataset.

Examples:
  npx tsx --env-file=.env scripts/import-lca.ts ./data/lca-sample.csv
  npx tsx --env-file=.env scripts/import-lca.ts ./data/lca.csv --dry-run
  npx tsx scripts/import-lca.ts --demo

Expected effect per matched employer:
  - Company.h1bSponsor = "yes"
  - Company.sponsorshipMeta = { h1bFilingYears, h1bFilingCount, source, lastSyncedAt }
  - Never invent Yes from job-description silence alone
`);
    process.exit(0);
  }

  if (demo && !path) {
    console.log("Demo aggregates (not writing to DB):");
    const demoMap = new Map<string, Agg>([
      [
        "acme software",
        {
          name: "Acme Software Inc.",
          years: new Set([2023, 2024]),
          count: 12,
        },
      ],
    ]);
    for (const [k, v] of demoMap) {
      console.log(
        `  ${k} → ${v.count} filings in ${[...v.years].join(",")}; slug=${companySlug(v.name)}`,
      );
    }
    console.log("Pass a real CSV path to apply updates.");
    process.exit(0);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log(`Loading LCA CSV: ${path}`);
    const map = await loadAggregates(path!);
    console.log(`Aggregated ${map.size} employers`);
    const { updated, created } = await applyAggregates(prisma, map, dryRun);
    console.log(
      `${dryRun ? "Dry-run" : "Done"}: ${updated} updated, ${created} created`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
