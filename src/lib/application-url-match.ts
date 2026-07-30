/** Score how well a page URL matches a stored job apply URL (0–100). */

function safeUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function hostKey(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function queryIds(url: URL): string[] {
  const keys = ["gh_jid", "gh_src", "jobId", "job_id", "requisitionId", "reqId"];
  const out: string[] = [];
  for (const k of keys) {
    const v = url.searchParams.get(k);
    if (v) out.push(v.toLowerCase());
  }
  return out;
}

function pathTokens(pathname: string): string[] {
  return pathname
    .toLowerCase()
    .split("/")
    .filter(
      (p) =>
        p &&
        !["jobs", "job", "apply", "application", "careers", "en", "us"].includes(
          p,
        ),
    );
}

/** Numeric / greenhouse-style ids embedded in path or query. */
function extractJobIds(url: URL): string[] {
  const ids = new Set<string>(queryIds(url));
  for (const part of url.pathname.split("/")) {
    if (/^\d{5,}$/.test(part)) ids.add(part);
    const m = part.match(/(\d{5,})/);
    if (m?.[1]) ids.add(m[1]);
  }
  return [...ids];
}

function companyHint(hostname: string): string {
  const h = hostKey(hostname)
    .replace(/\.greenhouse\.io$/i, "")
    .replace(/\.lever\.co$/i, "")
    .replace(/\.ashbyhq\.com$/i, "")
    .replace(/^boards\./i, "")
    .replace(/^jobs\./i, "")
    .replace(/^careers\./i, "")
    .replace(/^apply\./i, "");
  return h.split(".")[0] || h;
}

export function scoreApplicationUrlMatch(pageUrl: string, applyUrl: string): number {
  const page = safeUrl(pageUrl);
  const apply = safeUrl(applyUrl);
  if (!page || !apply) return 0;

  const ph = hostKey(page.hostname);
  const ah = hostKey(apply.hostname);
  if (!ph || !ah) return 0;

  const pageIds = extractJobIds(page);
  const applyIds = extractJobIds(apply);
  const idHit = pageIds.some((id) => applyIds.includes(id));

  // Strong cross-host match: same job id (e.g. careers.roblox.com vs boards.greenhouse.io)
  if (idHit && pageIds.length && applyIds.length) {
    let score = 70;
    if (ph === ah) score += 20;
    else if (companyHint(ph) && companyHint(ph) === companyHint(ah)) score += 15;
    if (page.pathname === apply.pathname && ph === ah) score += 10;
    return Math.min(100, score);
  }

  let score = 0;
  if (ph === ah) score += 40;
  else if (ph.endsWith(`.${ah}`) || ah.endsWith(`.${ph}`)) score += 25;
  else if (
    (ph.includes("greenhouse") && ah.includes("greenhouse")) ||
    (ph.includes("lever") && ah.includes("lever")) ||
    (ph.includes("ashby") && ah.includes("ashby"))
  ) {
    score += 20;
  } else if (companyHint(ph) && companyHint(ph) === companyHint(ah)) {
    score += 30;
  } else {
    return 0;
  }

  if (pageIds.length && applyIds.length && !idHit) {
    score = Math.min(score, 35);
  }

  const pageTok = new Set(pathTokens(page.pathname));
  const applyTok = pathTokens(apply.pathname);
  let hit = 0;
  for (const t of applyTok) {
    if (pageTok.has(t)) hit++;
  }
  if (applyTok.length) score += Math.round((hit / applyTok.length) * 25);

  if (page.pathname === apply.pathname && ph === ah) score += 15;

  return Math.min(100, score);
}
