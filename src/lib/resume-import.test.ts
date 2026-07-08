import assert from "node:assert/strict";
import {
  collectResumeUrls,
  enrichParsedResume,
  sanitizeProjectName,
} from "./resume-import";
import { getProjectLinks } from "./project-links";
import type { ParsedResume } from "./ai";

function emptyParsed(partial: Partial<ParsedResume> = {}): ParsedResume {
  return {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    website: "",
    summary: "",
    skills: [],
    workExperience: [],
    education: [],
    certifications: [],
    projects: [],
    ...partial,
  };
}

{
  const { name, mentionsAppStore, mentionsPlayStore } = sanitizeProjectName(
    "Attend-IQ | App Store | Play Store",
  );
  assert.equal(name, "Attend-IQ");
  assert.equal(mentionsAppStore, true);
  assert.equal(mentionsPlayStore, true);
}

{
  const { name } = sanitizeProjectName(
    "TalentHub Rebranded to VeriTalent | App Store | Play Store",
  );
  assert.equal(name, "TalentHub Rebranded to VeriTalent");
}

{
  const text = `
PROSPER MAPEPA
mapep1p@cmich.edu | 989-332-8050 | Mount Pleasant, MI
linkedin.com/in/prosper-mapepa | github.com/prospermapepa | https://mapepallc.netlify.app

PROJECTS
Attend-IQ | App Store | Play Store — (Dec 2025 – Jan 2026)
https://attend-iq.netlify.app
https://apps.apple.com/ca/app/attend-iq/id6756984192
https://play.google.com/store/apps/details?id=com.attendiq.app
`;

  const urls = collectResumeUrls(text);
  assert.ok(urls.some((u) => /linkedin\.com\/in\/prosper-mapepa/i.test(u)));
  assert.ok(urls.some((u) => /github\.com\/prospermapepa/i.test(u)));
  assert.ok(urls.some((u) => /mapepallc\.netlify\.app/i.test(u)));

  const enriched = enrichParsedResume(
    text,
    emptyParsed({
      fullName: "PROSPER MAPEPA",
      email: "mapep1p@cmich.edu",
      projects: [
        {
          name: "Attend-IQ | App Store | Play Store",
          role: "",
          description: "attendance platform",
          link: "https://App Store | Play Store",
          tech: [],
          startDate: "Dec 2025",
          endDate: "Jan 2026",
        },
      ],
    }),
  );

  assert.match(enriched.linkedin, /linkedin\.com\/in\/prosper-mapepa/i);
  assert.match(enriched.github, /github\.com\/prospermapepa/i);
  assert.match(enriched.website, /mapepallc\.netlify\.app/i);
  assert.equal(enriched.projects[0]?.name, "Attend-IQ");
  assert.match(
    getProjectLinks(enriched.projects[0]!).join(" "),
    /attend-iq\.netlify\.app/i,
  );
  assert.match(
    getProjectLinks(enriched.projects[0]!).join(" "),
    /apps\.apple\.com.*attend-iq/i,
  );
  assert.match(
    getProjectLinks(enriched.projects[0]!).join(" "),
    /play\.google\.com.*attendiq/i,
  );
}

console.log("resume-import tests passed");
