/**
 * Production (Railway) fills forms in a headless server browser — that cannot
 * open a window on the user's machine. Open the company apply URL in their
 * browser on the click gesture so they have a tab ready to paste into.
 *
 * Localhost headed auto-fill launches Google Chrome via Playwright instead.
 */

export function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

/** True when Start auto-fill should open the company page in the user's browser. */
export function shouldOpenApplyTabForUser(): boolean {
  return !isLocalDevHost();
}

/**
 * Open the apply page in a new tab. Must run synchronously from a click
 * handler (before await) so browsers do not block the popup.
 */
export function openCompanyApplyTab(url: string | null | undefined): Window | null {
  const href = url?.trim();
  if (!href || typeof window === "undefined") return null;
  try {
    return window.open(href, "_blank", "noopener,noreferrer");
  } catch {
    return null;
  }
}
