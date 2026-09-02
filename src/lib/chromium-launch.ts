import "server-only";

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium, type Browser, type LaunchOptions } from "playwright";
import {
  PLAYWRIGHT_DISABLED_MESSAGE,
  playwrightEnabled,
} from "@/lib/playwright-env";

const MAC_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const LINUX_CHROMIUM_PATHS = [
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chrome",
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

function exists(file: string): boolean {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

/**
 * Prefer a system Chromium/Chrome (Railway Nixpacks, Debian image, Mac Chrome)
 * so we don't need `playwright install` during the image build.
 */
export function resolveChromiumExecutable(): string | undefined {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
  if (fromEnv && exists(fromEnv)) return fromEnv;

  for (const p of MAC_CHROME_PATHS) {
    if (exists(p)) return p;
  }

  for (const p of LINUX_CHROMIUM_PATHS) {
    if (exists(p)) return p;
  }

  for (const name of LINUX_CHROMIUM_NAMES) {
    const found = which(name);
    if (found && exists(found)) return found;
  }

  return undefined;
}

function dockerLike(): boolean {
  return (
    exists("/.dockerenv") ||
    Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID)
  );
}

/** Headless Chromium for PDF / screenshots — system binary when available. */
export async function launchHeadlessChromium(
  extra: LaunchOptions = {},
): Promise<Browser> {
  if (!playwrightEnabled()) {
    throw new Error(PLAYWRIGHT_DISABLED_MESSAGE);
  }

  const executablePath = resolveChromiumExecutable();
  if (!executablePath) {
    throw new Error(
      "Chromium is not installed on this server. PDF download needs system Chromium (not Playwright’s bundled browser).",
    );
  }

  const { args: extraArgs = [], executablePath: _ignored, ...rest } = extra;
  return chromium.launch({
    ...rest,
    headless: true,
    executablePath,
    args: [
      ...(dockerLike()
        ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        : []),
      ...extraArgs,
    ],
  });
}
