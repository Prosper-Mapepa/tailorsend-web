import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext } from "playwright";
import {
  PLAYWRIGHT_DISABLED_MESSAGE,
  playwrightEnabled,
} from "@/lib/playwright-env";
import {
  launchHeadlessChromium,
  resolveChromiumExecutable,
} from "@/lib/chromium-launch";

const STEALTH_ARGS = ["--disable-blink-features=AutomationControlled"];

const MAC_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  path.join(
    process.env.HOME ?? "",
    "Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ),
];

function findMacChrome(): string | null {
  for (const p of MAC_CHROME_PATHS) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** True when a visible Chrome window can open on this machine (local Mac). */
export function headedAutofillAvailable(): boolean {
  if (process.env.FORCE_HEADLESS_AUTOFILL === "1") return false;
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME) {
    return false;
  }
  return Boolean(findMacChrome());
}

export interface LaunchResult {
  browser: Browser;
  /** User's installed Google Chrome (not "Chrome for Testing"). */
  usedSystemChrome: boolean;
  browserName: string;
  /** Requested headed but fell back to headless (e.g. Railway). */
  headlessFallback?: boolean;
}

/**
 * Launch a browser for auto-fill.
 * Headed mode needs Google Chrome on the local Mac.
 * On Railway / remote Linux, falls back to system Chromium headless.
 */
export async function launchAutofillBrowser(
  headless: boolean,
): Promise<LaunchResult> {
  if (!playwrightEnabled()) {
    throw new Error(PLAYWRIGHT_DISABLED_MESSAGE);
  }

  const wantHeaded = !headless;
  const canHeaded = wantHeaded && headedAutofillAvailable();
  const effectiveHeadless = !canHeaded;

  const launchOpts = {
    headless: effectiveHeadless,
    ignoreDefaultArgs: ["--enable-automation"] as string[],
    args: STEALTH_ARGS,
  };

  const attempts: string[] = [];

  if (canHeaded) {
    const chromePath = findMacChrome();
    if (chromePath) {
      try {
        const browser = await chromium.launch({
          ...launchOpts,
          executablePath: chromePath,
        });
        return {
          browser,
          usedSystemChrome: true,
          browserName: "Google Chrome",
        };
      } catch (err) {
        attempts.push(`executablePath: ${(err as Error).message}`);
      }
    }

    try {
      const browser = await chromium.launch({
        ...launchOpts,
        channel: "chrome",
      });
      return {
        browser,
        usedSystemChrome: true,
        browserName: "Google Chrome",
      };
    } catch (err) {
      attempts.push(`channel chrome: ${(err as Error).message}`);
    }

    throw new Error(
      "Auto-fill needs Google Chrome installed on your Mac. " +
        "Install from https://www.google.com/chrome/ then try again. " +
        "(Safari and “Chrome for Testing” cannot be used for headed auto-fill.) " +
        `Details: ${attempts.join("; ")}`,
    );
  }

  // Remote / production (Railway): headless system Chromium.
  try {
    const browser = await launchHeadlessChromium(launchOpts);
    const exe = resolveChromiumExecutable();
    return {
      browser,
      usedSystemChrome: Boolean(exe),
      browserName: wantHeaded
        ? "Chromium (headless — no local Chrome window on this server)"
        : "Chromium (headless)",
      headlessFallback: wantHeaded,
    };
  } catch (err) {
    throw new Error(
      "Could not start Chromium for auto-fill on this server. " +
        "PDF/autofill needs system Chromium (Railway Nixpacks) or run TailorSend locally with Google Chrome. " +
        `Details: ${(err as Error).message}`,
    );
  }
}

export async function newAutofillContext(
  browser: Browser,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
    // esbuild/tsx injects __name() into functions passed to page.evaluate().
    (globalThis as unknown as { __name?: (t: unknown) => unknown }).__name = (
      t,
    ) => t;
  });

  return context;
}

/** Headed auto-fill reuses one Chrome window; each job opens a new tab. */
let sharedHeadedSession: {
  browser: Browser;
  context: BrowserContext;
} | null = null;

export interface AutofillSession {
  browser: Browser;
  context: BrowserContext;
  browserName: string;
  reusedBrowser: boolean;
  headlessFallback?: boolean;
}

/** Get or create a browser session. Headed mode shares one Chrome instance. */
export async function acquireAutofillSession(
  headless: boolean,
): Promise<AutofillSession> {
  const useShared = !headless && headedAutofillAvailable();
  if (useShared && sharedHeadedSession?.browser.isConnected()) {
    return {
      browser: sharedHeadedSession.browser,
      context: sharedHeadedSession.context,
      browserName: "Google Chrome",
      reusedBrowser: true,
    };
  }

  const launched = await launchAutofillBrowser(headless);
  const context = await newAutofillContext(launched.browser);

  if (!launched.headlessFallback && !headless) {
    sharedHeadedSession = {
      browser: launched.browser,
      context,
    };
  }

  return {
    browser: launched.browser,
    context,
    browserName: launched.browserName,
    reusedBrowser: false,
    headlessFallback: launched.headlessFallback,
  };
}

/** Close headed session when browser is disconnected externally. */
export function onSharedBrowserDisconnected(browser: Browser) {
  if (sharedHeadedSession?.browser === browser) {
    sharedHeadedSession = null;
  }
}

/** Detect common bot-wall pages (Appcast, PerimeterX, etc.). */
export async function detectBotWall(page: {
  locator: (s: string) => { innerText: (o?: object) => Promise<string> };
}): Promise<boolean> {
  const text = await page
    .locator("body")
    .innerText({ timeout: 3000 })
    .catch(() => "");
  return /access is temporarily restricted|unusual activity from your device|automated \(bot\) activity|verify you are human/i.test(
    text,
  );
}
