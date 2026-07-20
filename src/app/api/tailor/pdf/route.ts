import { chromium } from "playwright";
import {
  documentHtml,
  type DocumentKind,
  prepareResumeMarkdown,
} from "@/lib/markdown";
import { ensureCoverLetterDate } from "@/lib/cover-letter";
import { requireAuthUser, isAuthUser } from "@/lib/auth";
import { getProfile, profileResumeContact } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Render Markdown (resume or cover letter) to a clean PDF using headless
// Chromium. Unlike the browser's print dialog, this produces NO page
// header/footer (no date, document title, URL, or page numbers).
export async function POST(req: Request) {
  const auth = await requireAuthUser();
  if (!isAuthUser(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const markdown = typeof body.markdown === "string" ? body.markdown : "";
  const title = typeof body.title === "string" ? body.title : "Document";
  const filename =
    typeof body.filename === "string" && body.filename
      ? body.filename
      : "document.pdf";
  const kind: DocumentKind =
    body.kind === "cover" || body.kind === "resume" ? body.kind : "auto";

  if (!markdown.trim()) {
    return Response.json({ error: "Nothing to render." }, { status: 400 });
  }

  let browser;
  try {
    let htmlMd = markdown;
    const isResume =
      kind === "resume" ||
      (kind === "auto" && !/dear\s+/i.test(markdown.toLowerCase()));
    if (isResume) {
      const profile = await getProfile(auth.id);
      htmlMd = prepareResumeMarkdown(
        htmlMd,
        profile.projects,
        profileResumeContact(profile),
      );
    } else if (kind === "cover" || /dear\s+/i.test(markdown)) {
      htmlMd = ensureCoverLetterDate(htmlMd);
    }

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(documentHtml(htmlMd, title, kind), {
      waitUntil: "networkidle",
    });
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => {
      document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
        let href = a.getAttribute("href") ?? "";
        if (
          href &&
          !/^https?:\/\//i.test(href) &&
          !/^mailto:/i.test(href)
        ) {
          href = `https://${href.replace(/^\/+/, "")}`;
          a.setAttribute("href", href);
        }
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      });
    });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return Response.json(
      {
        error:
          (err as Error).message ||
          "Failed to render PDF. Ensure Chromium is installed (npm run browser:install).",
      },
      { status: 500 },
    );
  } finally {
    await browser?.close();
  }
}
