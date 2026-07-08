import path from "node:path";
import fs from "node:fs/promises";
import {
  detectBotWall,
  launchAutofillBrowser,
  newAutofillContext,
} from "@/lib/apply/browser";

const STORAGE = path.join(process.cwd(), "storage");

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** Headless screenshot of the apply URL for manual-apply preview. */
export async function captureApplyPageScreenshot(opts: {
  applicationId: string;
  applyUrl: string;
}): Promise<{ screenshotPath: string; log: string[] }> {
  const log: string[] = [];
  const launched = await launchAutofillBrowser(true);
  const browser = launched.browser;

  try {
    log.push(`Opened ${launched.browserName} for page capture.`);
    const context = await newAutofillContext(browser);
    const page = await context.newPage();

    log.push(`Navigating to ${opts.applyUrl}`);
    await page.goto(opts.applyUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(2500);

    if (await detectBotWall(page)) {
      log.push("Bot-detection wall detected — screenshot may show a block page.");
    }

    const shotDir = path.join(STORAGE, "screenshots");
    await ensureDir(shotDir);
    const screenshotPath = path.join(shotDir, `${opts.applicationId}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    log.push("Saved apply page screenshot.");

    await context.close();
    return { screenshotPath, log };
  } finally {
    await browser.close();
  }
}
