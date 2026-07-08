import type { NormalizedJob, TargetRole } from "@/lib/types";

interface MatchInput {
  targetRoles: TargetRole[];
  skills: string[];
}

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "senior",
  "junior",
  "staff",
  "lead",
  "engineer",
  "developer",
  "manager",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 1);
}

/**
 * Heuristic 0-100 relevance score of a job vs. the user's targets.
 * Combines title overlap, skill/keyword hits, remote and location fit.
 */
export function scoreJob(job: NormalizedJob, input: MatchInput): number {
  const { targetRoles, skills } = input;
  if (targetRoles.length === 0 && skills.length === 0) return 0;

  const jobTitleTokens = new Set(tokens(job.title));
  const jobText = `${job.title} ${job.description}`.toLowerCase();

  let titleScore = 0;
  let locationBonus = 0;

  for (const role of targetRoles) {
    const roleTokens = tokens(role.title).filter((t) => !STOPWORDS.has(t));
    if (roleTokens.length) {
      const hits = roleTokens.filter((t) => jobTitleTokens.has(t)).length;
      titleScore = Math.max(titleScore, hits / roleTokens.length);
    }

    // Required keywords for this role appearing anywhere in the posting.
    const kw = role.keywords.map((k) => k.toLowerCase());
    if (kw.length) {
      const kwHits = kw.filter((k) => jobText.includes(k)).length;
      titleScore = Math.max(titleScore, 0.5 * titleScore + 0.5 * (kwHits / kw.length));
    }

    // Location / remote preference.
    if (role.remote && job.remote) locationBonus = Math.max(locationBonus, 1);
    for (const loc of role.locations) {
      if (loc && job.location.toLowerCase().includes(loc.toLowerCase())) {
        locationBonus = Math.max(locationBonus, 1);
      }
      if (loc.toLowerCase() === "remote" && job.remote) locationBonus = 1;
    }
  }

  // Skill coverage across the whole posting.
  const skillList = skills.map((s) => s.toLowerCase()).filter(Boolean);
  const skillHits = skillList.filter((s) => jobText.includes(s)).length;
  const skillScore = skillList.length ? skillHits / skillList.length : 0;

  // Weighted blend.
  const raw =
    0.55 * titleScore + 0.3 * skillScore + 0.15 * locationBonus;
  return Math.round(Math.min(1, raw) * 100);
}
