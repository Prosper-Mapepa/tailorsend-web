/** Long-form letter date, e.g. "July 14, 2026". */
export function formatCoverLetterDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December";
const DATE_LINE = new RegExp(
  `^\\*\\*?(?:${MONTHS})\\*\\*?\\s+\\d{1,2},\\s+\\d{4}\\*?\\*?\\s*$`,
  "im",
);
const DATE_LINE_PLAIN = new RegExp(
  `^(?:${MONTHS})\\s+\\d{1,2},\\s+\\d{4}\\s*$`,
  "im",
);

/**
 * Ensure a cover letter has today's date in the standard letterhead slot
 * (after contact line, before "Hiring Team" / salutation).
 */
export function ensureCoverLetterDate(
  markdown: string,
  date: Date = new Date(),
): string {
  const text = markdown.replace(/\r\n/g, "\n").trim();
  if (!text) return text;

  const formatted = formatCoverLetterDate(date);

  if (DATE_LINE_PLAIN.test(text) || DATE_LINE.test(text)) {
    return text
      .replace(DATE_LINE, formatted)
      .replace(DATE_LINE_PLAIN, formatted);
  }

  // Insert after header: **Name** + contact line, before recipient / Dear.
  const lines = text.split("\n");
  const hiringIdx = lines.findIndex((l) =>
    /^(Hiring\s+Team|Dear\s+)/i.test(l.trim()),
  );
  if (hiringIdx > 0) {
    // Walk back past blank lines
    let insertAt = hiringIdx;
    while (insertAt > 0 && !lines[insertAt - 1]!.trim()) insertAt--;
    const before = lines.slice(0, insertAt);
    const after = lines.slice(insertAt);
    return [...before, "", formatted, "", ...after]
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Fallback: after first two non-empty lines (name + contact)
  let seen = 0;
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim()) {
      seen++;
      insertAt = i + 1;
      if (seen >= 2) break;
    }
  }
  const before = lines.slice(0, insertAt);
  const after = lines.slice(insertAt);
  return [...before, "", formatted, "", ...after]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
