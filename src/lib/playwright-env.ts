/** Server-side: Playwright/Chromium is not available on Netlify/AWS Lambda. */
export function playwrightEnabled(): boolean {
  if (process.env.PLAYWRIGHT_ENABLED === "false") return false;
  if (process.env.NETLIFY === "true") return false;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return false;
  return true;
}

export const PLAYWRIGHT_DISABLED_MESSAGE =
  "Automatic page capture is not available on this deployment. Upload a screenshot of the apply form instead.";

/** Client-side (inlined at build time via NEXT_PUBLIC_*). */
export function playwrightCaptureEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PLAYWRIGHT_ENABLED !== "false";
}
