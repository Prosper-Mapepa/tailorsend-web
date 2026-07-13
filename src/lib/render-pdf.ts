import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  documentHtml,
  type DocumentKind,
  prepareResumeMarkdown,
  type ResumeContact,
} from "@/lib/markdown";
import {
  PLAYWRIGHT_DISABLED_MESSAGE,
  playwrightEnabled,
} from "@/lib/playwright-env";
import type { Project } from "@/lib/types";

/** Render markdown to a PDF file on disk (for resume upload during autofill). */
export async function writeMarkdownPdf(
  filePath: string,
  markdown: string,
  title: string,
  kind: DocumentKind = "resume",
  projects: Project[] = [],
  contact?: ResumeContact,
): Promise<void> {
  if (!playwrightEnabled()) {
    throw new Error(PLAYWRIGHT_DISABLED_MESSAGE);
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const htmlMd =
    kind === "resume"
      ? prepareResumeMarkdown(markdown, projects, contact)
      : markdown;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(documentHtml(htmlMd, title, kind), {
      waitUntil: "networkidle",
    });
    await page.emulateMedia({ media: "screen" });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
    });
    await fs.writeFile(filePath, pdf);
  } finally {
    await browser.close();
  }
}
