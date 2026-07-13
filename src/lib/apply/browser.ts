import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext } from "playwright";
import {
  PLAYWRIGHT_DISABLED_MESSAGE,
  playwrightEnabled,
} from "@/lib/playwright-env";

const STEALTH_ARGS = ["--disable-blink-features=AutomationControlled"];

const MAC_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  path.join(
    process.env.HOME ?? "",
    "Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ),
];

function findSystemChrome(): string | null {
  for (const p of MAC_CHROME_PATHS) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export interface LaunchResult {
  browser: Browser;
  /** User's installed Google Chrome (not "Chrome for Testing"). */
  usedSystemChrome: boolean;
  browserName: string;
}

/**
 * Launch a browser for auto-fill. Headed mode requires installed Google Chrome —
 * we never open "Google Chrome for Testing" for real apply sessions.
 */
export async function launchAutofillBrowser(
  headless: boolean,
): Promise<LaunchResult> {
  if (!playwrightEnabled()) {
    throw new Error(PLAYWRIGHT_DISABLED_MESSAGE);
  }

  const launchOpts = {
    headless,
    ignoreDefaultArgs: ["--enable-automation"],
    args: STEALTH_ARGS,
  };

  const chromePath = findSystemChrome();
  const attempts: string[] = [];

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
  } else {
    attempts.push("Google Chrome not found in /Applications");
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

  if (!headless) {
    throw new Error(
      "Auto-fill needs Google Chrome installed on your Mac. " +
        "Install from https://www.google.com/chrome/ then try again. " +
        "(Safari and “Chrome for Testing” cannot be used for headed auto-fill.) " +
        `Details: ${attempts.join("; ")}`,
    );
  }

  // Headless screenshot preview only — bundled Chromium is OK here.
  const browser = await chromium.launch(launchOpts);
  return {
    browser,
    usedSystemChrome: false,
    browserName: "Chromium (preview only)",
  };
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
}

/** Get or create a browser session. Headed mode shares one Chrome instance. */
export async function acquireAutofillSession(
  headless: boolean,
): Promise<AutofillSession> {
  if (!headless && sharedHeadedSession?.browser.isConnected()) {
    return {
      browser: sharedHeadedSession.browser,
      context: sharedHeadedSession.context,
      browserName: "Google Chrome",
      reusedBrowser: true,
    };
  }

  const launched = await launchAutofillBrowser(headless);
  const context = await newAutofillContext(launched.browser);

  if (!headless) {
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
