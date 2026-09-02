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
  assert.equal(headings[1], "PROJECTS");
  assert.match(headings[2], /^PROFESSIONAL EXPERIENCE \(\d\+ YEARS\)$/);
  assert.equal(headings[3], "TECHNICAL SKILLS");
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
  const headings = out
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => l.replace(/^##\s+/, "").replace(/\s*\([^)]*\)\s*$/, ""));
  assert.deepEqual(
    headings.filter((h) =>
      /SUMMARY|PROJECTS|EXPERIENCE|SKILLS|LEADERSHIP|EDUCATION/.test(h),
    ),
    [
      "PROFESSIONAL SUMMARY",
      "PROJECTS",
      "PROFESSIONAL EXPERIENCE",
      "TECHNICAL SKILLS",
      "LEADERSHIP & AFFILIATIONS",
      "EDUCATION",
    ],
  );
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
      website: "https://mapepallc.netlify.app",
    },
  );
  const head = out.split("##")[0];
  assert.match(head, /# PROSPER MAPEPA\nSecurity-focused Software Engineer\n/);
  assert.match(head, /\[GitHub\]\(https:\/\/github\.com\/prosper\)/);
  assert.match(head, /\[Portfolio\]\(https:\/\/mapepallc\.netlify\.app\)/);
  assert.doesNotMatch(head, /# PROSPER MAPEPA\n[^\n]*@/);
}

{
  const out = prepareResumeMarkdown(
    `# PROSPER MAPEPA
Cybersecurity Professional transitioning from Software Engineering
989-332-8050 | mapep1p@cmich.edu | [LinkedIn](https://www.linkedin.com/in/prosper-mapepa/) | Mount Pleasant, MI

## PROFESSIONAL SUMMARY
Builder.
`,
    [],
    {
      fullName: "PROSPER MAPEPA",
      email: "mapep1p@cmich.edu",
      phone: "989-332-8050",
      location: "Mount Pleasant, MI",
      linkedin: "https://www.linkedin.com/in/prosper-mapepa/",
    },
  );
  const head = out.split("##")[0];
  assert.match(head, /\[GitHub\]\(https:\/\/github\.com\/prospermapepa\)/);
  assert.match(head, /\[Portfolio\]\(https:\/\/mapepallc\.netlify\.app\)/);
}

{
  const html = mdToHtml(
    `# PROSPER MAPEPA
Security-focused Software Engineer
989-332-8050 | mapep@gmail.com | [LinkedIn](https://linkedin.com/in/prosper) | [GitHub](https://github.com/prosper) | [Portfolio](https://mapepallc.netlify.app) | Mount Pleasant, MI

## PROFESSIONAL SUMMARY
Builder.
`,
    { kind: "resume" },
  );
  assert.match(html, /<a href="https:\/\/github\.com\/prosper">GitHub<\/a>/);
  assert.match(
    html,
    /<a href="https:\/\/mapepallc\.netlify\.app">Portfolio<\/a>/,
  );
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
  const html = mdToHtml(
    `# PROSPER MAPEPA
Security-focused Software Engineer
989-332-8050 | mapep1p@cmich.edu | [LinkedIn](https://linkedin.com) | Open to relocate

August 28, 2026

Hiring Team
Acme

Dear Hiring Team,

I am writing about the role.

Sincerely,

Prosper Mapepa
`,
    { kind: "cover" },
  );
  assert.match(html, /<h1>PROSPER MAPEPA<\/h1>/);
  assert.match(html, /<p class="headline">Security-focused Software Engineer<\/p>/);
  assert.match(html, /<p class="contact-line">/);
  assert.match(html, /class="ci-icon"/);
  assert.match(html, /mapep1p@cmich.edu/);
  assert.match(html, /Open to relocate/);
  assert.match(html, /<p class="cl-salutation">Dear Hiring Team,<\/p>/);
}

{
  const messy = mdToHtml(
    `# PROSPER MAPEPA
Security-focused Software Engineer
Open to relocate | [LinkedIn](https://www.linkedin.com/in/prospermapepa) 989-332-8050 | mapep1p@cmich.edu | Mount Pleasant, MI | LinkedIn [https://www.linkedin.com/in/prospermapepa]

August 28, 2026

Hiring Team
Solace
Redwood City, CA

Dear Solace Security Team,

Hello.

Sincerely,

Prosper Mapepa
`,
    { kind: "cover" },
  );
  assert.match(messy, /<span class="contact-text">989-332-8050<\/span>/);
  assert.match(messy, /<a href="https:\/\/www\.linkedin\.com\/in\/prospermapepa">LinkedIn<\/a>/);
  assert.doesNotMatch(messy, /LinkedIn \[https/);
  assert.match(messy, /<div class="cl-letterhead">/);
  assert.match(messy, /<p class="cl-salutation">Dear Solace Security Team,<\/p>/);
  const phoneItem = messy.match(
    /<span class="contact-item">([\s\S]*?989-332-8050[\s\S]*?)<\/span><\/span>/,
  )?.[1] ?? "";
  assert.match(phoneItem, /M6\.6 10\.8/); // phone icon path
  assert.doesNotMatch(phoneItem, /M6\.94 6\.5/); // not LinkedIn icon
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
