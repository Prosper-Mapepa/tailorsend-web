import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium, type Browser, type LaunchOptions } from "playwright";

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

const MAC_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  path.join(
    process.env.HOME ?? "",
    "Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ),
];

const LINUX_CHROMIUM_NAMES = [
  "chromium",
  "chromium-browser",
  "google-chrome-stable",
  "google-chrome",
];

function which(cmd: string): string | null {
  try {
    const out = execFileSync("sh", ["-c", `command -v ${cmd}`], {
      encoding: "utf8",
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

/**
 * Prefer a system Chromium/Chrome (Railway Nixpacks, Mac Chrome) so we don't
 * need `playwright install` during the image build.
 */
export function resolveChromiumExecutable(): string | undefined {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  for (const p of MAC_CHROME_PATHS) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }

  for (const name of LINUX_CHROMIUM_NAMES) {
    const found = which(name);
    if (found && fs.existsSync(found)) return found;
  }

  return undefined;
}

/** Headless Chromium for PDF / screenshots — system binary when available. */
export async function launchHeadlessChromium(
  extra: LaunchOptions = {},
): Promise<Browser> {
  if (!playwrightEnabled()) {
    throw new Error(PLAYWRIGHT_DISABLED_MESSAGE);
  }

  const executablePath = resolveChromiumExecutable();
  return chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    ...extra,
  });
}
