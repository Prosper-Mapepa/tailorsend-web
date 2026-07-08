import path from "node:path";
import fs from "node:fs/promises";
import { type Browser, type BrowserContext, type Frame, type Page } from "playwright";
import { answerScreeningQuestion } from "@/lib/ai";
import type { FormAnswers } from "@/lib/types";
import { writeMarkdownPdf } from "@/lib/render-pdf";
import { autofillUrlWarning, detectAts } from "./detect";
import {
  detectBotWall,
  acquireAutofillSession,
  onSharedBrowserDisconnected,
} from "./browser";
import {
  discoverFields,
  discoverFileInputs,
  discoverValidationErrors,
  pickFormFrame,
  type DiscoveredField,
} from "./discover-fields";
import type { DocumentKind } from "@/lib/markdown";

const openBrowsers = new Set<Browser>();
const STORAGE = path.join(process.cwd(), "storage");
/** Remember which browser tab belongs to each application (headed sessions). */
const autofillTabByApplication = new Map<string, string>();
const MAX_PASSES = 8;
const MAX_AI_ANSWERS = 8;
/** Headed auto-fill runs this many full fill+verify cycles before returning. */
const HEADED_VERIFY_ROUNDS = 2;

/** `#29783` is invalid CSS; attribute selectors work for any id. */
function locatorByElementId(surface: Frame, elementId: string) {
  if (!elementId) return surface.locator("[id=__autofill_missing__]");
  const escaped = elementId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return surface.locator(`[id="${escaped}"]`).first();
}

function selectorByElementId(elementId: string): string {
  const escaped = elementId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `[id="${escaped}"]`;
}

export interface AutofillFieldResult {
  label: string;
  required: boolean;
  status: "filled" | "skipped" | "failed";
  value?: string;
}

export interface AutofillResult {
  ok: boolean;
  filledFields: string[];
  skippedFields: string[];
  fields: AutofillFieldResult[];
  requiredFilled: number;
  requiredTotal: number;
  optionalFilled: number;
  optionalTotal: number;
  passes: number;
  uploadedResume: boolean;
  screenshotPath: string;
  log: string[];
  platform: string;
  awaitingHumanSubmit: boolean;
  warning?: string;
  botWallDetected?: boolean;
  error?: string;
  /** Count of fields still showing "This field is required." */
  validationErrors?: number;
  /** True when no required-field validation errors remain on the form. */
  verified?: boolean;
  /** How many wizard steps auto-fill advanced through (Save & Continue, etc.). */
  stepsAdvanced?: number;
  /** True when the apply flow has multiple pages/steps. */
  multiStep?: boolean;
}

export interface AutofillJobContext {
  title: string;
  company: string;
  description?: string;
}

export interface AutofillProfileContext {
  fullName: string;
  baseResume: string;
  needsSponsorship: boolean;
  visaStatus: string;
  location: string;
  city: string;
  zipCode: string;
  currentCompany: string;
  gender: string;
  raceEthnicity: string;
  veteranStatus: string;
  disabilityStatus: string;
  hearAboutSource: string;
  usState: string;
  authorizedToWork: string;
  sponsorshipDetails: string;
}

const APPLY_BUTTON_SELECTOR = [
  "#apply_button",
  "a#apply_button",
  "button#apply_button",
  '[data-qa="btn-apply"]',
  'a:has-text("Apply on company site")',
  'button:has-text("Apply on company site")',
  'a:has-text("Apply now")',
  'button:has-text("Apply now")',
  'a:has-text("Apply for this job")',
  'button:has-text("Apply for this job")',
].join(", ");

const MIN_VISIBLE_FORM_FIELDS = 4;

const ADVANCE_BUTTON_SELECTORS = [
  'button:has-text("Save & Continue")',
  'button:has-text("Save and Continue")',
  'button:has-text("Save & continue")',
  'button:has-text("Save and continue")',
  'button:has-text("Continue")',
  'button:has-text("Next")',
  'a:has-text("Save & Continue")',
  'input[type="submit"][value*="Save" i][value*="Continue" i]',
  'input[type="submit"][value*="Continue" i]',
  'input[type="submit"][value*="Next" i]',
];

const FIELD_RULES: {
  key: keyof FormAnswers | "firstName" | "lastName" | "zipCode" | "currentCompany";
  re: RegExp;
}[] = [
  {
    key: "firstName",
    re: /preferred[\s_-]*first|first[\s_-]*name|given[\s_-]*name|^fname/i,
  },
  {
    key: "lastName",
    re: /preferred[\s_-]*(last|sur)|last[\s_-]*name|surname|family[\s_-]*name|^lname/i,
  },
  {
    key: "fullName",
    re: /full[\s_-]*name|^name$|your[\s_-]*name|legal[\s_-]*name/i,
  },
  { key: "email", re: /^(email|e-?mail)\b|email\s*\*|\bemail address/i },
  { key: "phone", re: /phone|mobile|tel(ephone)?/i },
  {
    key: "location",
    re: /location\s*\(city\)|candidate-location|^city\b|where.*based/i,
  },
  { key: "zipCode", re: /zip[\s_-]*code|postal[\s_-]*code|\bzip\b|\bpostal\b/i },
  { key: "currentCompany", re: /current[\s_-]*company|employer|company\s*name/i },
  { key: "linkedin", re: /linked[\s_-]*in/i },
  { key: "github", re: /git[\s_-]*hub/i },
  { key: "website", re: /website|portfolio|personal[\s_-]*site|url/i },
];

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function trackBrowser(browser: Browser) {
  if (openBrowsers.has(browser)) return;
  openBrowsers.add(browser);
  browser.on("disconnected", () => {
    openBrowsers.delete(browser);
    onSharedBrowserDisconnected(browser);
  });
}

async function dismissOpenMenus(page: Page): Promise<void> {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(120);
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(100);
}

async function fieldHasValidationError(
  surface: Frame,
  elementId: string,
): Promise<boolean> {
  if (!elementId) return false;
  return surface.evaluate((id) => {
    const block = document
      .getElementById(id)
      ?.closest(".field, .application-question, [data-field]");
    if (!block) return false;
    return Array.from(block.querySelectorAll("div, span, p")).some(
      (x) =>
        x.children.length === 0 &&
        /^this field is required\.?$/i.test((x.textContent || "").trim()),
    );
  }, elementId);
}

async function commitFieldChange(
  surface: Frame,
  locator: ReturnType<Frame["locator"]>,
): Promise<void> {
  await locator.blur().catch(() => {});
  await surface.page().keyboard.press("Tab").catch(() => {});
  await surface.page().waitForTimeout(200);
}

async function reactSelectDisplays(
  surface: Frame,
  elementId: string,
): Promise<string> {
  const input = locatorByElementId(surface, elementId);
  const control = input
    .locator('xpath=ancestor::div[contains(@class,"select__control")]')
    .first();
  if ((await control.count()) > 0) {
    return (await control.textContent())?.trim() ?? "";
  }
  const single = input
    .locator('xpath=ancestor::div[contains(@class,"select__container")]//div[contains(@class,"select__single-value")]')
    .first();
  if ((await single.count()) > 0) {
    return (await single.textContent())?.trim() ?? "";
  }
  return "";
}

function selectionMatches(displayed: string, answer: string): boolean {
  const d = displayed.toLowerCase();
  if (!d || /^select\.{3}$/i.test(d)) return false;
  return d.includes(answer.toLowerCase());
}

function locationForAutofill(
  answers: FormAnswers,
  profile: AutofillProfileContext,
): string {
  return (
    answers.location.trim() ||
    profile.location.trim() ||
    profile.city.trim()
  );
}

function parseLocationParts(location: string): {
  city: string;
  state: string;
  full: string;
} {
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    city: parts[0] ?? location.trim(),
    state: parts[1] ?? "",
    full: location.trim(),
  };
}

function valueForText(
  descriptor: string,
  answers: FormAnswers,
  profile: AutofillProfileContext,
): { key: string; value: string } | null {
  for (const rule of FIELD_RULES) {
    if (rule.re.test(descriptor)) {
      let value = "";
      if (rule.key === "firstName") value = answers.firstName;
      else if (rule.key === "lastName") value = answers.lastName;
      else if (rule.key === "zipCode") value = profile.zipCode;
      else if (rule.key === "currentCompany") value = profile.currentCompany;
      else if (rule.key === "location")
        value = locationForAutofill(answers, profile);
      else
        value = (answers as unknown as Record<string, string>)[rule.key] ?? "";
      if (value) return { key: rule.key, value };
    }
  }
  if (/cover[\s_-]*letter|why.*(you|interest)|message|tell us/i.test(descriptor)) {
    if (answers.coverLetter)
      return { key: "coverLetter", value: answers.coverLetter };
  }
  if (
    /list the type of support|sponsorship.*please|if you do require|type of support you may require/i.test(
      descriptor,
    )
  ) {
    if (profile.sponsorshipDetails) {
      return { key: "sponsorshipDetails", value: profile.sponsorshipDetails };
    }
  }
  return null;
}

function inferCountry(profile: AutofillProfileContext): string | null {
  const loc = profile.location.toLowerCase();
  const countries: [RegExp, string][] = [
    [/lebanon|beirut/, "Lebanon"],
    [/united states|usa|, us\b|u\.s\.|michigan|california|texas|new york|florida|washington|mount pleasant/, "United States"],
    [/united kingdom|england|london|, uk\b/, "United Kingdom"],
    [/canada|toronto|vancouver|ontario/, "Canada"],
    [/india|bangalore|mumbai|delhi/, "India"],
  ];
  for (const [re, name] of countries) {
    if (re.test(loc)) return name;
  }
  if (profile.visaStatus.toLowerCase().includes("f1")) return "United States";
  return null;
}

function heuristicChoice(descriptor: string, profile: AutofillProfileContext): string | null {
  const d = descriptor.toLowerCase();
  // Work eligibility before country — questions often contain the word "country"
  if (
    /eligible to work|authorized to work|legally authorized|work authorization|work in the country in which|job is posted/.test(
      d,
    ) &&
    !/sponsor|assistance to obtain|extend.*authorization/.test(d)
  ) {
    return profile.authorizedToWork || "Yes";
  }
  if (/\bcountry\b/i.test(descriptor) && !/eligible|authorized|job is posted/.test(d)) {
    return inferCountry(profile);
  }
  if (/hear about|how did you first hear|referral source/i.test(d)) {
    return profile.hearAboutSource || "LinkedIn";
  }
  if (/u\.?s\.?\s*state|state do you currently reside|what state/i.test(d)) {
    return profile.usState || null;
  }
  // Sponsorship / immigration support — driven by profile
  if (
    /immigration related support|immigration.*sponsorship|visa sponsor|require.*sponsor|need.*sponsorship|sponsorship from|employer sponsorship|assistance to obtain.*authorization|extend.*authorization/.test(
      d,
    )
  ) {
    if (profile.needsSponsorship) return "Yes";
    return "No";
  }
  // No — already employed by this company
  if (
    /currently.*(employee|contractor)|current employee|employee or contractor at|work here now/.test(
      d,
    )
  ) {
    return "No";
  }
  // No — previously employed by this company
  if (
    /previously worked|have you previously worked|former employee|worked at.*before|prior employment at/.test(
      d,
    )
  ) {
    return "No";
  }
  // Conditional follow-up — skip unless "previously worked" was Yes
  if (/previous employment type|if yes.*employment type/.test(d)) {
    return null;
  }
  if (/conflict of interest|related to.*employee/.test(d)) return "No";
  if (/felony|criminal|convicted|background check.*fail/.test(d)) return "No";
  if (/\bgender\b/i.test(descriptor) && !/transgender/.test(d)) {
    return profile.gender || "Decline to self-identify";
  }
  if (/race|ethnicity/.test(d)) {
    return profile.raceEthnicity || "Decline to self-identify";
  }
  if (/veteran/.test(d)) {
    return profile.veteranStatus || "I am not a protected veteran";
  }
  if (/disability/.test(d)) {
    return profile.disabilityStatus || "I don't wish to answer";
  }
  return null;
}

function optionMatchesHearAbout(optionLabel: string, answer: string): boolean {
  const o = optionLabel.toLowerCase().trim();
  const a = answer.toLowerCase().trim();
  if (!a || !o) return false;
  if (o.includes(a) || a.includes(o)) return true;
  const aliases: [string, string[]][] = [
    ["linkedin", ["linkedin"]],
    ["company website", ["career site", "company site", "dropbox career"]],
    ["referral", ["referral", "referred", "dropboxer"]],
    ["job board", ["indeed", "glassdoor", "builtin", "the muse"]],
    ["indeed", ["indeed"]],
    ["glassdoor", ["glassdoor"]],
    ["google search", ["google search", "google"]],
    ["university", ["in person", "career fair", "event"]],
  ];
  for (const [key, patterns] of aliases) {
    if (a.includes(key) || key.includes(a)) {
      if (patterns.some((p) => o.includes(p))) return true;
    }
  }
  return false;
}

async function fillCheckboxGroups(
  surface: Frame,
  fields: DiscoveredField[],
  profile: AutofillProfileContext,
  log: string[],
): Promise<AutofillFieldResult[]> {
  const results: AutofillFieldResult[] = [];
  const checkboxFields = fields.filter((f) => f.kind === "checkbox");
  if (checkboxFields.length === 0) return results;

  const groups = new Map<string, DiscoveredField[]>();
  for (const f of checkboxFields) {
    const key = (f.groupDescriptor || f.descriptor).slice(0, 160);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  for (const [groupDesc, items] of groups) {
    const answer = heuristicChoice(groupDesc, profile);
    const result: AutofillFieldResult = {
      label: groupDesc,
      required: items.some((i) => i.required),
      status: "skipped",
    };
    if (!answer) {
      results.push(result);
      continue;
    }

    let filled = 0;
    for (const item of items) {
      const opt = item.optionLabel || item.descriptor;
      if (!optionMatchesHearAbout(opt, answer)) continue;
      const loc = item.elementId
        ? locatorByElementId(surface, item.elementId)
        : surface.locator('input[type="checkbox"]').nth(item.checkboxIndex ?? 0);
      try {
        if ((await loc.count()) === 0) continue;
        if (!(await loc.isChecked().catch(() => false))) {
          await loc.check({ timeout: 3000 });
        }
        filled++;
      } catch (e) {
        log.push(`Checkbox "${opt.slice(0, 30)}": ${(e as Error).message}`);
      }
    }

    if (filled > 0) {
      result.status = "filled";
      result.value = answer;
      log.push(`Checkbox group: ${groupDesc.slice(0, 40)} → ${answer}`);
    } else if (result.required) {
      result.status = "failed";
    }
    results.push(result);
  }
  return results;
}

/** Fill a Greenhouse / react-select dropdown by field id. */
async function fillReactSelect(
  surface: Frame,
  elementId: string,
  answer: string,
  log: string[],
): Promise<boolean> {
  if (!elementId) return false;
  const page = surface.page();
  try {
    const input = locatorByElementId(surface, elementId);
    if ((await input.count()) === 0) return false;

    await dismissOpenMenus(page);
    await input.click({ force: true });
    await page.waitForTimeout(150);

    const isYesNo = answer === "Yes" || answer === "No";

    if (isYesNo) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        await dismissOpenMenus(page);
        await input.click({ force: true });
        await page.waitForTimeout(150);

        if (attempt === 1) {
          await page.keyboard.press("Space");
          await page.waitForTimeout(400);
          await page.keyboard.type(answer, { delay: 25 });
          await page.waitForTimeout(200);
          await page.keyboard.press("Enter");
        } else {
          // Arrow-key fallback when phone-country widget stole focus
          await page.keyboard.press("ArrowDown");
          await page.waitForTimeout(300);
          if (answer === "No") await page.keyboard.press("ArrowDown");
          await page.waitForTimeout(100);
          await page.keyboard.press("Enter");
        }

        await page.waitForTimeout(300);
        await page.keyboard.press("Tab");
        await page.waitForTimeout(200);

        if (!(await fieldHasValidationError(surface, elementId))) return true;
      }

      log.push(`Select "${elementId}" validation error after keyboard fill`);
      return false;
    }

    // Country / location-style react-select: type to filter, then pick.
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    await page.keyboard.type(answer, { delay: 25 });
    await page.waitForTimeout(500);

    const city = answer.split(",")[0]?.trim() ?? answer;
    const option = surface
      .locator(
        '.select__menu:visible [role="option"], .select__menu:visible .select__option',
      )
      .filter({ hasText: new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })
      .first();

    if ((await option.count()) > 0) {
      await option.click({ force: true, timeout: 3000 });
    } else {
      await page.keyboard.press("Enter");
    }

    await page.waitForTimeout(300);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    return !(await fieldHasValidationError(surface, elementId));
  } catch (e) {
    log.push(`Select "${elementId}": ${(e as Error).message}`);
    return false;
  }
}

async function fillYesNoCombobox(
  surface: Frame,
  elementId: string,
  answer: string,
  log: string[],
): Promise<boolean> {
  return fillReactSelect(surface, elementId, answer, log);
}

async function fillComboboxInput(
  surface: Frame,
  locator: ReturnType<Frame["locator"]>,
  value: string,
  log: string[],
  elementId = "",
): Promise<boolean> {
  try {
    const page = surface.page();
    const isLocation =
      elementId === "candidate-location" ||
      (value.includes(",") && value.split(",").length >= 2);
    const loc = parseLocationParts(value);
    const typeValue = isLocation ? loc.city : value;

    await dismissOpenMenus(page);
    await locator.click({ timeout: 3000 }).catch(() => locator.focus());
    await page.waitForTimeout(150);
    await page.keyboard.press("Meta+a").catch(() => page.keyboard.press("Control+a"));
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(100);
    await page.keyboard.type(typeValue, { delay: 30 });
    await page.waitForTimeout(700);

    const optionSelector =
      '.select__menu:visible [role="option"], .select__menu:visible .select__option, [role="listbox"]:visible [role="option"]';

    let option = surface.locator(optionSelector);
    if (isLocation && loc.full) {
      const fullMatch = option.filter({
        hasText: new RegExp(
          loc.full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "i",
        ),
      });
      if ((await fullMatch.count()) > 0) {
        option = fullMatch;
      } else if (loc.state) {
        const stateMatch = option.filter({
          hasText: new RegExp(
            `${loc.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*${loc.state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
            "i",
          ),
        });
        if ((await stateMatch.count()) > 0) option = stateMatch;
      }
    } else {
      const city = typeValue.split(",")[0]?.trim() ?? typeValue;
      option = option.filter({
        hasText: new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      });
    }

    const pick = option.first();
    if ((await pick.count()) > 0) {
      await pick.click({ timeout: 3000 });
    } else {
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(150);
      await page.keyboard.press("Enter");
    }

    await page.waitForTimeout(300);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    if (elementId) {
      return !(await fieldHasValidationError(surface, elementId));
    }
    return true;
  } catch (e) {
    log.push(`Combobox fill: ${(e as Error).message}`);
    return false;
  }
}

async function selectDropdownOption(
  surface: Frame,
  descriptor: string,
  answer: string,
  selectIndex: number,
  elementId: string,
  log: string[],
): Promise<boolean> {
  if (elementId && (answer === "Yes" || answer === "No")) {
    const ok = await fillYesNoCombobox(surface, elementId, answer, log);
    if (ok) return true;
  }

  if (elementId) {
    const byId = locatorByElementId(surface, elementId);
    if ((await byId.count()) > 0) {
      const role = await byId.getAttribute("role").catch(() => null);
      if (role === "combobox") {
        if (answer === "Yes" || answer === "No") {
          return fillYesNoCombobox(surface, elementId, answer, log);
        }
        return fillComboboxInput(surface, byId, answer, log);
      }
    }
  }

  const selects = surface.locator("select");
  const count = await selects.count();
  if (selectIndex >= 0 && selectIndex < count) {
    const sel = selects.nth(selectIndex);
    try {
      await sel.selectOption({ label: answer });
      return true;
    } catch {
      try {
        await sel.selectOption({ value: answer });
        return true;
      } catch {
        /* try partial */
      }
    }
    const options = await sel.locator("option").allTextContents();
    const match = options.find(
      (o) =>
        o.trim().toLowerCase() === answer.toLowerCase() ||
        o.toLowerCase().includes(answer.toLowerCase()),
    );
    if (match) {
      await sel.selectOption({ label: match.trim() });
      return true;
    }
  }

  const labelRe = new RegExp(
    descriptor.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i",
  );
  const block = surface
    .locator(
      ".field, .application-question, [data-field], .question, div",
    )
    .filter({ hasText: labelRe })
    .first();

  const combo = block
    .locator('[role="combobox"], button[aria-haspopup], .select__control')
    .first();
  if ((await combo.count()) > 0) {
    try {
      const filled = await fillComboboxInput(surface, combo, answer, log);
      if (filled) return true;
    } catch (e) {
      log.push(`Combobox "${descriptor.slice(0, 40)}": ${(e as Error).message}`);
    }
  }

  return false;
}

function pdfDisplayName(fullName: string, kind: DocumentKind): string {
  const base = fullName.trim() || "Applicant";
  return kind === "resume" ? `${base} Resume.pdf` : `${base} Cover Letter.pdf`;
}

function classifyFileInput(descriptor: string): "resume" | "cover" | "unknown" {
  const d = descriptor.toLowerCase();
  if (/cover[\s_-]*letter|coverletter/.test(d)) return "cover";
  if (/resume|cv|résumé|curriculum/.test(d)) return "resume";
  return "unknown";
}

async function uploadPdfFile(
  surface: Frame,
  selector: string,
  markdown: string,
  fileName: string,
  kind: DocumentKind,
  log: string[],
): Promise<boolean> {
  const input = surface.locator(selector).first();
  if ((await input.count()) === 0) return false;

  const dir = path.join(STORAGE, "uploads");
  await ensureDir(dir);
  const safeName = fileName.replace(/[/\\?%*:|"<>]/g, "-");
  const tmpPath = path.join(dir, safeName);
  await writeMarkdownPdf(tmpPath, markdown, fileName.replace(/\.pdf$/i, ""), kind);
  const buffer = await fs.readFile(tmpPath);

  await input.setInputFiles({
    name: safeName,
    mimeType: "application/pdf",
    buffer,
  });
  log.push(`Attached ${safeName}`);
  return true;
}

async function uploadDocuments(
  page: Page,
  surface: Frame,
  answers: FormAnswers,
  log: string[],
): Promise<AutofillFieldResult[]> {
  const results: AutofillFieldResult[] = [];
  const resumeName = pdfDisplayName(answers.fullName, "resume");
  const coverName = pdfDisplayName(answers.fullName, "cover");

  const targets: { kind: "resume" | "cover"; markdown: string; name: string }[] =
    [];
  if (answers.resumeText.trim()) {
    targets.push({
      kind: "resume",
      markdown: answers.resumeText,
      name: resumeName,
    });
  }
  if (answers.coverLetter.trim()) {
    targets.push({
      kind: "cover",
      markdown: answers.coverLetter,
      name: coverName,
    });
  }
  if (targets.length === 0) return results;

  const uploaded = { resume: false, cover: false };

  if (answers.resumeText.trim()) {
    const ghResume = await uploadPdfFile(
      surface,
      "#resume",
      answers.resumeText,
      resumeName,
      "resume",
      log,
    );
    if (ghResume) {
      uploaded.resume = true;
      results.push({
        label: "Resume / CV",
        required: true,
        status: "filled",
        value: resumeName,
      });
    }
  }

  if (answers.coverLetter.trim()) {
    const ghCover = await uploadPdfFile(
      surface,
      "#cover_letter",
      answers.coverLetter,
      coverName,
      "cover",
      log,
    );
    if (ghCover) {
      uploaded.cover = true;
      results.push({
        label: "Cover Letter",
        required: false,
        status: "filled",
        value: coverName,
      });
    }
  }

  if (uploaded.resume && uploaded.cover) return results;

  const fileInputs = await discoverFileInputs(page);

  for (const meta of fileInputs) {
    const kind = classifyFileInput(meta.descriptor || meta.elementId);
    if (kind === "resume" && uploaded.resume) continue;
    if (kind === "cover" && uploaded.cover) continue;

    const target =
      kind === "cover"
        ? targets.find((t) => t.kind === "cover")
        : kind === "resume"
          ? targets.find((t) => t.kind === "resume")
          : !uploaded.resume
            ? targets.find((t) => t.kind === "resume")
            : !uploaded.cover
              ? targets.find((t) => t.kind === "cover")
              : undefined;

    if (!target) continue;

    const selector = meta.elementId
      ? selectorByElementId(meta.elementId)
      : `input[type="file"] >> nth=${meta.index}`;
    const ok = await uploadPdfFile(
      surface,
      selector,
      target.markdown,
      target.name,
      target.kind,
      log,
    );
    if (!ok) continue;

    if (target.kind === "resume") uploaded.resume = true;
    if (target.kind === "cover") uploaded.cover = true;
    results.push({
      label: target.kind === "resume" ? "Resume / CV" : "Cover Letter",
      required: target.kind === "resume",
      status: "filled",
      value: target.name,
    });
  }

  return results;
}

function fieldLocator(
  surface: Frame,
  field: { elementId: string; textIndex: number },
  textLocators: ReturnType<Frame["locator"]>,
) {
  if (field.elementId) {
    return locatorByElementId(surface, field.elementId);
  }
  return textLocators.nth(field.textIndex);
}

async function fillTextField(
  surface: Frame,
  locator: ReturnType<Frame["locator"]>,
  value: string,
  elementId: string,
  log: string[],
): Promise<boolean> {
  const role = await locator.getAttribute("role").catch(() => null);
  if (role === "combobox" || elementId === "candidate-location") {
    return fillComboboxInput(surface, locator, value, log, elementId);
  }

  try {
    const page = surface.page();
    await dismissOpenMenus(page);
    await locator.click({ force: true });
    await locator.fill(value, { timeout: 4000 });
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    const current = await locator.inputValue().catch(() => "");
    if (!current.trim()) return false;
    if (elementId) {
      return !(await fieldHasValidationError(surface, elementId));
    }
    return true;
  } catch (e) {
    log.push(`Text fill: ${(e as Error).message}`);
    return false;
  }
}

async function waitForApplicationForm(page: Page, log: string[]): Promise<void> {
  for (let i = 0; i < 12; i++) {
    const fields = await discoverFields(page);
    const files = await discoverFileInputs(page);
    if (fields.length >= MIN_VISIBLE_FORM_FIELDS || files.length > 0) {
      log.push(`Form ready (${fields.length} fields, ${files.length} uploads).`);
      return;
    }
    await page.waitForTimeout(1000);
  }
  log.push("Form may still be loading — continuing anyway.");
}

async function countFillableControls(page: Page): Promise<number> {
  try {
    const fields = await discoverFields(page);
    const files = await discoverFileInputs(page);
    return fields.length + files.length * 3;
  } catch {
    return 0;
  }
}

async function pickFormPage(context: BrowserContext): Promise<Page> {
  const pages = context.pages().filter((p) => !p.isClosed());
  if (pages.length === 0) throw new Error("No browser tabs are open.");

  let best = pages[pages.length - 1];
  let bestScore = -1;
  for (const page of pages) {
    const score = await countFillableControls(page);
    if (score > bestScore) {
      bestScore = score;
      best = page;
    }
  }
  return best;
}

async function navigateToApplyForm(
  page: Page,
  context: BrowserContext,
  log: string[],
  continueSession = false,
  applicationId = "",
): Promise<Page> {
  if (continueSession) {
    log.push("Continue session — staying on current tab.");
    return page;
  }

  const existing = await discoverFields(page);
  const files = await discoverFileInputs(page);
  if (existing.length >= MIN_VISIBLE_FORM_FIELDS || files.length > 0) {
    log.push(`Application form already visible (${existing.length} fields).`);
    return page;
  }

  const applyButtons = page.locator(APPLY_BUTTON_SELECTOR);
  const count = await applyButtons.count().catch(() => 0);
  if (count === 0) return page;

  for (let i = 0; i < count; i++) {
    const applyButton = applyButtons.nth(i);
    const visible = await applyButton.isVisible().catch(() => false);
    if (!visible) continue;

    try {
      const popupPromise = context.waitForEvent("page", { timeout: 5000 });
      await applyButton.click({ timeout: 4000 });
      const popup = await popupPromise.catch(() => null);
      if (popup) {
        await popup.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
        log.push("Apply opened a new tab.");
        if (applicationId) autofillTabByApplication.set(applicationId, popup.url());
        return popup;
      }
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
      log.push("Clicked an Apply button.");
    } catch {
      /* form may already be visible */
    }
    break;
  }

  const picked = await pickFormPage(context);
  if (applicationId) autofillTabByApplication.set(applicationId, picked.url());
  return picked;
}

async function clickAdvance(page: Page, log: string[]): Promise<boolean> {
  for (const selector of ADVANCE_BUTTON_SELECTORS) {
    const btn = page.locator(selector).first();
    if ((await btn.count()) === 0) continue;
    try {
      const visible = await btn.isVisible();
      if (!visible) continue;
      await btn.click({ timeout: 4000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
      log.push(`Clicked advance: ${selector.match(/has-text\("([^"]+)"\)/)?.[1] ?? "next"}`);
      return true;
    } catch {
      /* try next selector */
    }
  }
  return false;
}

function fieldFillOrder(descriptor: string): number {
  const d = descriptor.toLowerCase();
  if (/\bcountry\b/.test(d)) return 0;
  if (/first[\s_-]*name|preferred[\s_-]*first/.test(d)) return 1;
  if (/last[\s_-]*name|surname|preferred[\s_-]*(last|sur)/.test(d)) return 2;
  if (/e-?mail/.test(d)) return 3;
  if (/location\s*\(city\)|candidate-location/.test(d)) return 4;
  if (/zip|postal/.test(d)) return 5;
  if (
    /eligible to work|immigration related|employee or contractor|previously worked|sponsorship|job is posted/.test(
      d,
    )
  ) {
    return 6;
  }
  if (/phone|mobile|tel/.test(d)) return 7;
  if (/resume|cv/.test(d)) return 8;
  if (/cover/.test(d)) return 9;
  return 10;
}

async function fillPass(
  page: Page,
  answers: FormAnswers,
  job: AutofillJobContext,
  profile: AutofillProfileContext,
  log: string[],
  resumeUploaded: { done: boolean },
): Promise<AutofillFieldResult[]> {
  const results: AutofillFieldResult[] = [];
  let aiCalls = 0;

  await page.bringToFront().catch(() => {});
  const surface = await pickFormFrame(page);

  if (!resumeUploaded.done) {
    const uploadResults = await uploadDocuments(page, surface, answers, log);
    results.push(...uploadResults);
    if (uploadResults.some((r) => r.label.includes("Resume") && r.status === "filled")) {
      resumeUploaded.done = true;
    }
  }

  const fields = await discoverFields(page);
  fields.sort(
    (a, b) => fieldFillOrder(a.descriptor) - fieldFillOrder(b.descriptor),
  );
  log.push(`Discovered ${fields.length} fields on ${surface.url()}.`);

  const checkboxResults = await fillCheckboxGroups(
    surface,
    fields,
    profile,
    log,
  );
  results.push(...checkboxResults);

  const textLocators = surface.locator(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([role="combobox"]), textarea',
  );

  for (const field of fields) {
    if (field.kind === "checkbox") continue;

    const label = field.descriptor || field.kind;
    const result: AutofillFieldResult = {
      label,
      required: field.required,
      status: "skipped",
    };

    if (field.kind === "select" || field.kind === "combobox") {
      const isScreening =
        /eligible to work|immigration related|employee or contractor|previously worked|sponsorship|job is posted/i.test(
          field.descriptor,
        );
      const textMatch = isScreening
        ? null
        : valueForText(field.descriptor, answers, profile);
      if (textMatch?.value) {
        const loc = field.elementId
          ? locatorByElementId(surface, field.elementId)
          : surface
              .locator('[role="combobox"], [aria-haspopup="listbox"]')
              .nth(field.selectIndex);
        const ok = await fillComboboxInput(
          surface,
          loc,
          textMatch.value,
          log,
          field.elementId,
        );
        if (ok) {
          result.status = "filled";
          result.value = textMatch.value.slice(0, 80);
          log.push(`Combobox text: ${label.slice(0, 40)}`);
        } else {
          result.status = "failed";
        }
        results.push(result);
        continue;
      }

      const choice =
        heuristicChoice(field.descriptor, profile) ??
        (field.required ? "No" : null);
      if (!choice) {
        results.push(result);
        continue;
      }
      const ok = await selectDropdownOption(
        surface,
        field.descriptor,
        choice,
        field.selectIndex,
        field.elementId,
        log,
      );
      if (ok) {
        result.status = "filled";
        result.value = choice;
        log.push(`Dropdown: ${label.slice(0, 50)} → ${choice}`);
      } else {
        result.status = "failed";
      }
      results.push(result);
      continue;
    }

    const match = valueForText(field.descriptor, answers, profile);
    let value = match?.value ?? "";

    if (!value && field.required && aiCalls < MAX_AI_ANSWERS) {
      try {
        value = await answerScreeningQuestion(
          field.descriptor,
          {
            fullName: answers.fullName,
            email: answers.email,
            phone: answers.phone,
            location: answers.location,
            summary: "",
            baseResume: profile.baseResume,
            skills: [],
          },
          {
            title: job.title,
            company: job.company,
            location: "",
            description: job.description ?? "",
          },
        );
        aiCalls++;
      } catch {
        /* skip AI failure */
      }
    }

    if (!value) {
      results.push(result);
      continue;
    }

    try {
      const loc = fieldLocator(surface, field, textLocators);
      const filled = await fillTextField(
        surface,
        loc,
        value,
        field.elementId,
        log,
      );
      if (filled) {
        result.status = "filled";
        result.value = value.slice(0, 80);
        log.push(`Text: ${label.slice(0, 40)}`);
      } else {
        result.status = "failed";
      }
    } catch (e) {
      result.status = "failed";
      log.push(`Text fail "${label.slice(0, 30)}": ${(e as Error).message}`);
    }
    results.push(result);
  }

  return results;
}

function mergeFieldResults(
  merged: Map<string, AutofillFieldResult>,
  passResults: AutofillFieldResult[],
) {
  for (const r of passResults) {
    const key = r.label.slice(0, 80);
    const existing = merged.get(key);
    if (!existing || r.status === "filled") {
      merged.set(key, r);
    }
  }
}

function summarizeFields(fields: AutofillFieldResult[]) {
  const required = fields.filter((f) => f.required);
  const optional = fields.filter((f) => !f.required);
  const requiredFilled = required.filter((f) => f.status === "filled").length;
  const optionalFilled = optional.filter((f) => f.status === "filled").length;
  return {
    requiredFilled,
    requiredTotal: required.length,
    optionalFilled,
    optionalTotal: optional.length,
  };
}

async function saveScreenshot(
  page: Page,
  applicationId: string,
  log: string[],
): Promise<string> {
  const shotDir = path.join(STORAGE, "screenshots");
  await ensureDir(shotDir);
  const screenshotPath = path.join(shotDir, `${applicationId}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  log.push("Saved review screenshot.");
  return screenshotPath;
}

export interface AutofillOptions {
  applicationId: string;
  applyUrl: string;
  answers: FormAnswers;
  job: AutofillJobContext;
  profile: AutofillProfileContext;
  headless?: boolean;
  /** Reuse the open apply tab instead of opening a new one (Continue Autofill). */
  continueSession?: boolean;
  resumeAlreadyUploaded?: boolean;
}

function emptyResult(
  platform: string,
  log: string[],
  overrides: Partial<AutofillResult> = {},
): AutofillResult {
  return {
    ok: false,
    filledFields: [],
    skippedFields: [],
    fields: [],
    requiredFilled: 0,
    requiredTotal: 0,
    optionalFilled: 0,
    optionalTotal: 0,
    passes: 0,
    uploadedResume: false,
    screenshotPath: "",
    log,
    platform,
    awaitingHumanSubmit: false,
    validationErrors: 0,
    verified: false,
    ...overrides,
  };
}

function normalizeApplyUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url.split("#")[0] ?? url;
  }
}

function jobIdFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const fromQuery =
      u.searchParams.get("id") ||
      u.searchParams.get("gh_jid") ||
      u.searchParams.get("jobId") ||
      "";
    if (fromQuery) return fromQuery;
    const pathMatch =
      u.pathname.match(/\/jobs\/(\d+)(?:\/|$)/i) ||
      u.pathname.match(/\/(\d{5,})(?:\/|$)/);
    return pathMatch?.[1] ?? "";
  } catch {
    return "";
  }
}

function sameApplicationSite(openUrl: string, targetUrl: string): boolean {
  if (!openUrl || openUrl === "about:blank") return false;
  try {
    const open = new URL(openUrl);
    const target = new URL(targetUrl);
    if (open.hostname !== target.hostname) return false;

    const openId = jobIdFromUrl(openUrl);
    const targetId = jobIdFromUrl(targetUrl);
    if (openId && targetId) return openId === targetId;

    const openPath = open.pathname.replace(/\/$/, "");
    const targetPath = target.pathname.replace(/\/$/, "");
    if (openPath === targetPath) return true;

    if (
      open.hostname.includes("dropbox.jobs") &&
      target.hostname.includes("dropbox.jobs")
    ) {
      return Boolean(openId && targetId && openId === targetId);
    }

    const normOpen = normalizeApplyUrl(openUrl);
    const normTarget = normalizeApplyUrl(targetUrl);
    return (
      normOpen === normTarget ||
      normOpen.includes(normTarget) ||
      normTarget.includes(normOpen)
    );
  } catch {
    return openUrl.includes(targetUrl) || targetUrl.includes(openUrl);
  }
}

async function findApplicationTab(
  context: BrowserContext,
  applyUrl: string,
  applicationId: string,
  log: string[],
  mode: "continue" | "reuse-only",
): Promise<Page | null> {
  const remembered = autofillTabByApplication.get(applicationId);
  if (remembered) {
    for (const p of context.pages()) {
      if (p.isClosed()) continue;
      if (
        p.url() === remembered ||
        sameApplicationSite(p.url(), remembered) ||
        sameApplicationSite(p.url(), applyUrl)
      ) {
        log.push("Reusing remembered application tab.");
        await p.bringToFront();
        return p;
      }
    }
  }

  if (mode === "reuse-only") {
    for (const p of context.pages()) {
      if (p.isClosed()) continue;
      if (sameApplicationSite(p.url(), applyUrl)) {
        log.push("Reusing tab matching this apply URL.");
        await p.bringToFront();
        return p;
      }
    }
    return null;
  }

  const targetId = jobIdFromUrl(applyUrl);
  let targetHost = "";
  try {
    targetHost = new URL(applyUrl).hostname;
  } catch {
    /* ignore */
  }

  for (const p of context.pages()) {
    if (p.isClosed()) continue;
    if (sameApplicationSite(p.url(), applyUrl)) {
      log.push("Continuing on matching application tab.");
      await p.bringToFront();
      return p;
    }
  }

  if (targetHost && targetId) {
    for (const p of context.pages()) {
      if (p.isClosed()) continue;
      try {
        const u = new URL(p.url());
        if (u.hostname === targetHost && jobIdFromUrl(p.url()) === targetId) {
          log.push("Continuing on tab with same job id.");
          await p.bringToFront();
          return p;
        }
      } catch {
        /* ignore */
      }
    }
  }

  let best: Page | null = null;
  let bestScore = -1;
  for (const p of context.pages()) {
    if (p.isClosed()) continue;
    try {
      if (targetHost && !new URL(p.url()).hostname.includes(targetHost.replace(/^www\./, ""))) {
        if (!p.url().includes(targetHost)) continue;
      }
      const score = await countFillableControls(p);
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    } catch {
      /* ignore */
    }
  }
  if (best) {
    log.push("Continuing on best open tab for this site.");
    await best.bringToFront();
    return best;
  }

  if (targetHost) {
    const onHost = context.pages().filter((p) => {
      if (p.isClosed()) return false;
      try {
        return new URL(p.url()).hostname === targetHost;
      } catch {
        return p.url().includes(targetHost);
      }
    });
    if (onHost.length > 0) {
      const pick = onHost[onHost.length - 1]!;
      log.push("Continuing on most recent site tab (no new tab opened).");
      await pick.bringToFront();
      return pick;
    }
  }

  return null;
}

/** Open the apply URL in a new tab, or reuse an existing tab in the shared browser. */
async function openApplyTab(
  context: BrowserContext,
  applyUrl: string,
  applicationId: string,
  log: string[],
  continueSession = false,
): Promise<Page> {
  if (continueSession) {
    const existing = await findApplicationTab(
      context,
      applyUrl,
      applicationId,
      log,
      "continue",
    );
    if (existing) return existing;
    throw new Error(
      "No open application tab found. Use “Auto-fill & open browser” first, then Continue Autofill on that tab.",
    );
  }

  const existing = await findApplicationTab(
    context,
    applyUrl,
    applicationId,
    log,
    "reuse-only",
  );
  if (existing) return existing;

  const page = await context.newPage();
  log.push("Opened new tab in auto-fill browser.");
  await page.goto(applyUrl, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  autofillTabByApplication.set(applicationId, page.url());
  return page;
}

async function runAutofillPasses(
  page: Page,
  context: BrowserContext,
  opts: AutofillOptions,
  merged: Map<string, AutofillFieldResult>,
  resumeUploaded: { done: boolean },
  log: string[],
): Promise<{ page: Page; passes: number; stepsAdvanced: number }> {
  let passes = 0;
  let stepsAdvanced = 0;
  let active = await navigateToApplyForm(
    page,
    context,
    log,
    opts.continueSession,
    opts.applicationId,
  );

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    passes = pass;
    log.push(`--- Autofill pass ${pass} ---`);
    await active.waitForTimeout(800);
    const passResults = await fillPass(
      active,
      opts.answers,
      opts.job,
      opts.profile,
      log,
      resumeUploaded,
    );
    mergeFieldResults(merged, passResults);

    const advanced = await clickAdvance(active, log);
    if (advanced) stepsAdvanced++;
    if (!advanced) break;
    if (!opts.continueSession) {
      active = await pickFormPage(context);
    }
    autofillTabByApplication.set(opts.applicationId, active.url());
  }

  return { page: active, passes, stepsAdvanced };
}

/** Re-attempt fields that still show validation errors before a full refill round. */
async function refillValidationErrors(
  page: Page,
  errors: { label: string; elementId: string; descriptor: string }[],
  answers: FormAnswers,
  profile: AutofillProfileContext,
  log: string[],
): Promise<void> {
  if (errors.length === 0) return;
  const surface = await pickFormFrame(page);
  log.push(`Retrying ${errors.length} field(s) with validation errors…`);

  for (const err of errors) {
    const textMatch = valueForText(err.descriptor, answers, profile);
    const choice =
      textMatch?.value ??
      heuristicChoice(err.descriptor, profile);
    if (!choice) continue;

    if (err.elementId) {
      const input = locatorByElementId(surface, err.elementId);
      if ((await input.count()) === 0) continue;
      const role = await input.getAttribute("role").catch(() => null);
      if (role === "combobox" || choice === "Yes" || choice === "No") {
        const ok = await fillReactSelect(surface, err.elementId, choice, log);
        if (ok) log.push(`Retry OK: ${err.label.slice(0, 50)} → ${choice}`);
        continue;
      }
      const ok = await fillTextField(surface, input, choice, err.elementId, log);
      if (ok) log.push(`Retry OK: ${err.label.slice(0, 50)}`);
    }
  }
}

export async function autofillApplication(
  opts: AutofillOptions,
): Promise<AutofillResult> {
  const log: string[] = [];
  const platform = detectAts(opts.applyUrl);
  const headless = opts.headless ?? false;
  const urlWarning = autofillUrlWarning(opts.applyUrl);

  let browser: Browser | null = null;
  try {
    log.push(`Detected ATS platform: ${platform}`);
    if (urlWarning) log.push(`Note: ${urlWarning}`);

    const session = await acquireAutofillSession(headless);
    browser = session.browser;
    log.push(
      session.reusedBrowser
        ? `Reusing open ${session.browserName} (new tab).`
        : `Opened ${session.browserName}.`,
    );

    if (!headless) trackBrowser(browser);

    let page = await openApplyTab(
      session.context,
      opts.applyUrl,
      opts.applicationId,
      log,
      opts.continueSession,
    );
    if (!opts.continueSession) {
      await waitForApplicationForm(page, log);
    } else {
      await page.waitForTimeout(600);
    }

    const botWall = await detectBotWall(page);
    const merged = new Map<string, AutofillFieldResult>();
    const resumeUploaded = { done: opts.resumeAlreadyUploaded ?? false };
    let totalPasses = 0;
    let stepsAdvanced = 0;
    let validationErrors = 0;
    let verified = false;

    if (botWall) {
      log.push(
        "Bot-detection wall detected. Review the page manually or use View posting in your normal browser.",
      );
    } else {
      const verifyRounds = headless ? 1 : HEADED_VERIFY_ROUNDS;

      for (let round = 1; round <= verifyRounds; round++) {
        log.push(`=== Verification round ${round}/${verifyRounds} ===`);

        if (round > 1) {
          const pending = await discoverValidationErrors(page);
          await refillValidationErrors(
            page,
            pending,
            opts.answers,
            opts.profile,
            log,
          );
          await page.waitForTimeout(800);
        }

        const { page: activePage, passes, stepsAdvanced: advanced } =
          await runAutofillPasses(
          page,
          session.context,
          opts,
          merged,
          resumeUploaded,
          log,
        );
        page = activePage;
        totalPasses += passes;
        stepsAdvanced += advanced;

        const errors = await discoverValidationErrors(page);
        validationErrors = errors.length;
        if (validationErrors === 0) {
          verified = true;
          log.push("Form validation passed — no required-field errors.");
          break;
        }

        log.push(
          `${validationErrors} field(s) still show required: ${errors
            .map((e) => e.label.slice(0, 45))
            .join("; ")}`,
        );

        if (round < verifyRounds) {
          log.push("Running another fill round to clear validation errors…");
          await page.waitForTimeout(1200);
        }
      }

      if (!verified && validationErrors > 0) {
        log.push(
          "Some fields may still need manual review after auto-fill.",
        );
      }
    }

    const fields = Array.from(merged.values());
    const summary = summarizeFields(fields);
    const filledFields = fields
      .filter((f) => f.status === "filled")
      .map((f) => `${f.label.slice(0, 40)} → ${f.value?.slice(0, 30) ?? "filled"}`);
    const skippedFields = fields
      .filter((f) => f.status !== "filled")
      .map((f) => f.label);

    const activePage = page;
    autofillTabByApplication.set(opts.applicationId, activePage.url());
    const screenshotPath = await saveScreenshot(
      activePage,
      opts.applicationId,
      log,
    );

    const ok =
      !botWall &&
      verified &&
      (summary.requiredFilled > 0 ||
        resumeUploaded.done ||
        filledFields.length > 0);

    const multiStep = stepsAdvanced > 0 || totalPasses > 1;

    if (headless) {
      await browser.close();
      return {
        ok,
        filledFields,
        skippedFields,
        fields,
        ...summary,
        passes: totalPasses,
        stepsAdvanced,
        multiStep,
        uploadedResume: resumeUploaded.done,
        screenshotPath,
        log,
        platform,
        awaitingHumanSubmit: false,
        warning: urlWarning ?? undefined,
        botWallDetected: botWall,
        validationErrors,
        verified,
        error: botWall
          ? "Bot-detection wall blocked this page."
          : !verified && validationErrors > 0
            ? `${validationErrors} required field(s) still need attention.`
            : undefined,
      };
    }

    log.push(
      "Browser left open. Review every field, then click Submit yourself.",
    );

    return {
      ok,
      filledFields,
      skippedFields,
      fields,
      ...summary,
      passes: totalPasses,
      stepsAdvanced,
      multiStep,
      uploadedResume: resumeUploaded.done,
      screenshotPath,
      log,
      platform,
      awaitingHumanSubmit: true,
      warning: urlWarning ?? undefined,
      botWallDetected: botWall,
      validationErrors,
      verified,
      error:
        !verified && validationErrors > 0
          ? `${validationErrors} required field(s) still need attention.`
          : undefined,
    };
  } catch (err) {
    if (browser && headless) await browser.close().catch(() => {});
    return emptyResult(platform, log, {
      error: (err as Error).message,
    });
  }
}
