import assert from "node:assert/strict";
import {
  canonicalizeResumeHeadings,
  mdToHtml,
  normalizeResumeHeader,
  normalizeResumeMarkdown,
  prepareResumeMarkdown,
  reorderResumeSections,
  toSplitEntryLayout,
} from "./markdown";
import { restoreNarrativeFromBase } from "./resume-projects";

{
  const md = `# Name
phone | email

## WORK EXPERIENCE
**Acme** | Jan 2020 – Present
*Engineer* | Remote

## TECHNICAL SKILLS
**Languages:** TypeScript

## PROFESSIONAL SUMMARY
Builder.

## PROJECTS
**App** | 2024

## EDUCATION
**State University** | 2018 – 2022
***B.S. Computer Science***

## LEADERSHIP
- Club president
`;

  const ordered = reorderResumeSections(canonicalizeResumeHeadings(md));
  const headings = ordered
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => l.replace(/^##\s+/, ""));

  assert.equal(headings[0], "PROFESSIONAL SUMMARY");
  assert.equal(headings[1], "TECHNICAL SKILLS");
  assert.match(headings[2], /^PROFESSIONAL EXPERIENCE \(\d\+ YEARS\)$/);
  assert.equal(headings[3], "PROJECTS");
  assert.equal(headings[4], "LEADERSHIP & AFFILIATIONS");
  assert.equal(headings[5], "EDUCATION");
}

{
  const converted = toSplitEntryLayout(`## PROFESSIONAL EXPERIENCE (5+ YEARS)
**GrowthSense Ltd** | Jan 2023 – Dec 2024
*Application Security Engineer* | Remote
- Led secure coding
`);
  assert.match(
    converted,
    /\*\*Application Security Engineer\*\* \| \*\*GrowthSense Ltd\*\* \| Jan 2023 – Dec 2024 \| Remote/,
  );
  assert.doesNotMatch(converted, /^\*Application Security Engineer\*/m);
}

{
  const edu = toSplitEntryLayout(`## EDUCATION
**Central Michigan University** | 2025 – 2026
***MBA, Cybersecurity***
`);
  assert.match(
    edu,
    /\*\*MBA, Cybersecurity\*\* \| 2025 – 2026 \| Central Michigan University/,
  );
}

{
  const out = normalizeResumeMarkdown(`PROSPER MAPEPA
989-332-8050 | mapep1p@cmich.edu

SUMMARY
Security engineer with 5+ years.

CORE SECURITY COMPETENCIES
**Languages:** TypeScript, Python

PROFESSIONAL EXPERIENCE
**Central Michigan University** | May 2025 – Present
*Secure CRM Engineer* | Mount Pleasant, MI
- Strengthened CRM security

SECURITY ENGINEERING PROJECTS
**SAST/DAST CI/CD Security Pipeline**
- Implemented pipeline

LEADERSHIP & AFFILIATIONS
- President, Cybersecurity Club

EDUCATION
**Harare Institute of Technology** | 2015 – 2019
***B.Tech (Honors), Information Security & Assurance***
`);
  assert.match(out, /^# PROSPER MAPEPA/m);
  assert.match(out, /## PROFESSIONAL SUMMARY/);
  assert.match(out, /## TECHNICAL SKILLS/);
  assert.match(out, /## PROFESSIONAL EXPERIENCE \(\d\+ YEARS\)/);
  assert.match(out, /## PROJECTS/);
  assert.match(out, /## LEADERSHIP & AFFILIATIONS/);
  assert.match(out, /## EDUCATION/);
  assert.match(out, /\*\*Secure CRM Engineer\*\* \| \*\*Central Michigan University\*\*/);
  assert.doesNotMatch(out, /## Skills and Certifications/);
  assert.doesNotMatch(out, /## WORK EXPERIENCE/);
}

{
  const out = normalizeResumeMarkdown(`# Name
phone | email

## TECHNICAL SKILLS
**Application Security:** OWASP Top 10, SAST, DAST
**Languages:** JavaScript, TypeScript, Python
`);
  assert.match(out, /\*\*Application Security:\*\* OWASP Top 10, SAST, DAST/);
  assert.doesNotMatch(out, /:\*\* \*\*/);
  assert.match(out, /\*\*Languages:\*\* JavaScript, TypeScript, Python/);
}

{
  const out = normalizeResumeHeader(`# PROSPER MAPEPA
mapep@gmail.com
Security-focused Software Engineer
Mount Pleasant, MI • 989-332-8050 • mapep1p@cmich.edu • LinkedIn • GitHub

## PROFESSIONAL SUMMARY
Builder.
`);
  const lines = out.split("\n").filter((l) => l.trim());
  assert.equal(lines[0], "# PROSPER MAPEPA");
  assert.equal(lines[1], "Security-focused Software Engineer");
  assert.match(lines[2], /mapep@gmail\.com/);
  assert.match(lines[2], /989-332-8050/);
  assert.doesNotMatch(lines[1], /@/);
  assert.equal(lines[3], "## PROFESSIONAL SUMMARY");
}

{
  const out = prepareResumeMarkdown(
    `# PROSPER MAPEPA
mapep@gmail.com
Security-focused Software Engineer
Mount Pleasant, MI • 989-332-8050 • LinkedIn • GitHub

## PROFESSIONAL SUMMARY
Builder.
`,
    [],
    {
      fullName: "PROSPER MAPEPA",
      email: "mapep@gmail.com",
      phone: "989-332-8050",
      location: "Mount Pleasant, MI",
      linkedin: "https://linkedin.com/in/prosper",
      github: "https://github.com/prosper",
    },
  );
  const head = out.split("##")[0];
  assert.match(head, /# PROSPER MAPEPA\nSecurity-focused Software Engineer\n/);
  assert.doesNotMatch(head, /# PROSPER MAPEPA\n[^\n]*@/);
}

{
  const out = normalizeResumeMarkdown(`# Name
phone | email

## LEADERSHIP & AFFILIATIONS
- President, Cybersecurity Club (CMU) - Grew membership by 40%.
- Developer, American Nuclear Society (CMU Chapter) - Built internal tools.

## EDUCATION
**MBA, Cybersecurity** | 2025 – 2026 | Central Michigan University
`);
  assert.match(out, /\*\*President, Cybersecurity Club \(CMU\)\*\*/);
  assert.match(out, /\*\*Developer, American Nuclear Society \(CMU Chapter\)\*\*/);
}

{
  const flat =
    "# PROSPER MAPEPA Security-focused Software Engineer 989-332-8050 | mapep1p@cmich.edu | LinkedIn ## PROFESSIONAL SUMMARY Security-focused Software Engineer with 7+ years. ## TECHNICAL SKILLS **Languages:** Python ## PROFESSIONAL EXPERIENCE **Secure CRM Engineer** | Central Michigan University | May 2025 - Present";
  const html = mdToHtml(flat, { kind: "resume" });
  assert.match(html, /<h1>PROSPER MAPEPA<\/h1>/);
  assert.match(html, /<h2>PROFESSIONAL SUMMARY<\/h2>/);
  assert.match(html, /<h2>TECHNICAL SKILLS<\/h2>/);
  assert.match(html, /<p>Security-focused Software Engineer with 7\+ years\.<\/p>/);
}

{
  const formatted = normalizeResumeMarkdown(`# Name
phone | email

## PROJECTS
SAST/DAST CI/CD Security Pipeline
Implemented a security-first CI/CD pipeline using SonarQube, reducing critical vulnerabilities by 80%.
Technologies Used: SonarQube, OWASP ZAP
API Security Hardening + Pentesting
Engineered a hardened API with JWT and RBAC, cutting unauthorized access attempts by 40%.

## LEADERSHIP & AFFILIATIONS
President, Cybersecurity Club (CMU) — Grew membership by 40%, led hands-on labs.
LeaderShape Institute Graduate — Completed intensive leadership program.

## EDUCATION
**MBA, Cybersecurity** | Dec 2026 | Central Michigan University
`);
  assert.match(formatted, /\*\*SAST\/DAST CI\/CD Security Pipeline\*\*/);
  assert.match(formatted, /- Implemented a security-first CI\/CD pipeline/);
  assert.match(formatted, /- \*\*Technologies Used:\*\* SonarQube, OWASP ZAP/);
  assert.match(formatted, /\*\*API Security Hardening \+ Pentesting\*\*/);
  assert.match(formatted, /- Engineered a hardened API with JWT/);
  assert.match(formatted, /\*\*President, Cybersecurity Club \(CMU\)\*\* — Grew membership/);
  assert.match(formatted, /\*\*LeaderShape Institute Graduate\*\*/);
}

{
  const tailored = `# Name
phone | email

## PROJECTS
**SAST/DAST CI/CD Security Pipeline**
- **Technologies Used:** SonarQube, OWASP ZAP

## EDUCATION
**MBA, Cybersecurity** | Dec 2026 | CMU
`;
  const base = `# Name
phone | email

## PROJECTS
**SAST/DAST CI/CD Security Pipeline**
- Implemented a security-first CI/CD pipeline using SonarQube, reducing critical vulnerabilities by **80%**.
- **Technologies Used:** SonarQube, OWASP ZAP

## LEADERSHIP & AFFILIATIONS
- **President, Cybersecurity Club (CMU)** — Grew membership by **40%**.
- **LeaderShape Institute Graduate** — Completed intensive leadership program.

## EDUCATION
**MBA, Cybersecurity** | Dec 2026 | CMU
`;
  const restored = restoreNarrativeFromBase(tailored, base);
  assert.match(restored, /reducing critical vulnerabilities by \*\*80%\*\*/);
  assert.match(restored, /## LEADERSHIP & AFFILIATIONS/);
  assert.match(restored, /\*\*President, Cybersecurity Club \(CMU\)\*\*/);
}

console.log("markdown-format tests passed");
