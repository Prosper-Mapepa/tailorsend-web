// Fetch a job-posting URL and reduce its HTML to readable plain text.

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** Strip HTML markup to readable text, dropping scripts/styles/markup. */
export function htmlToText(html: string): string {
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Turn block-level boundaries into newlines so structure survives.
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ");

  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  for (const [entity, char] of Object.entries(ENTITIES)) {
    out = out.split(entity).join(char);
  }

  return out
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}

/**
 * Fetch a job URL and return its readable text content.
 * Throws a user-friendly error when the page can't be fetched or yields no
 * meaningful text (common for JS-heavy sites like LinkedIn/Workday).
 */
export async function fetchJobText(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
  } catch {
    throw new Error(
      "Couldn't reach that URL. Paste the job description text or upload screenshots instead.",
    );
  }
  if (!res.ok) {
    throw new Error(
      `Couldn't fetch that URL (HTTP ${res.status}). Many job sites block bots — paste the text or upload screenshots instead.`,
    );
  }
  const html = await res.text();
  const text = htmlToText(html);
  if (text.length < 200) {
    throw new Error(
      "That page didn't return readable text (it likely loads content with JavaScript). Paste the job description or upload screenshots instead.",
    );
  }
  return text;
}
