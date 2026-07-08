import type { Page } from "playwright";

export interface DiscoveredField {
  id: string;
  kind: "text" | "textarea" | "select" | "combobox" | "checkbox";
  descriptor: string;
  required: boolean;
  textIndex: number;
  selectIndex: number;
  elementId: string;
  groupDescriptor?: string;
  optionLabel?: string;
  checkboxIndex?: number;
}

/**
 * Browser-side field discovery. Kept as a string so bundlers never inject
 * __name / other helpers that break inside page.evaluate().
 */
const DISCOVER_FIELDS_SCRIPT = `(() => {
  function isVisible(el) {
    if (el.getAttribute("type") === "hidden") return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function descriptorFor(el) {
    const parts = [];
    const id = el.getAttribute("id");
    if (id) {
      const label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      if (label && label.textContent) parts.push(label.textContent);
    }
    const parentLabel = el.closest("label");
    if (parentLabel && parentLabel.textContent) parts.push(parentLabel.textContent);
    const field = el.closest(
      ".field, .application-question, [data-field], .question, li",
    );
    if (field) {
      const legend = field.querySelector("legend, label, h3, h4, .label");
      if (legend && legend.textContent) parts.push(legend.textContent);
    }
    for (const attr of ["name", "id", "placeholder", "aria-label"]) {
      const v = el.getAttribute(attr);
      if (v) parts.push(v);
    }
    return parts.join(" ").replace(/\\s+/g, " ").trim();
  }

  function isRequired(el) {
    if (el.hasAttribute("required")) return true;
    if (el.getAttribute("aria-required") === "true") return true;
    const field = el.closest(".field, .application-question, [data-field]");
    if (field && field.textContent && field.textContent.includes("*")) return true;
    return false;
  }

  const fields = [];
  let textIndex = 0;
  let selectIndex = 0;
  let checkboxIndex = 0;

  const inputs = Array.from(
    document.querySelectorAll("input, textarea, select"),
  );
  for (const el of inputs) {
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute("type") || tag).toLowerCase();
    if (["hidden", "submit", "button", "radio", "file"].includes(type)) {
      continue;
    }
    if (!isVisible(el)) continue;
    if (el.getAttribute("role") === "combobox") continue;

    const descriptor = descriptorFor(el);
    if (!descriptor && !el.id) continue;
    const required = isRequired(el);
    const elementId = el.id || "";
    const id = tag + "-" + descriptor.slice(0, 40) + "-" + fields.length;

    if (type === "checkbox") {
      const fieldset = el.closest("fieldset");
      const groupLegend =
        fieldset?.querySelector("legend")?.textContent?.trim() || "";
      const labelEl = elementId
        ? document.querySelector('label[for="' + CSS.escape(elementId) + '"]')
        : el.closest("label");
      let optionText = (labelEl?.textContent || "").trim();
      if (groupLegend && optionText.startsWith(groupLegend)) {
        optionText = optionText.slice(groupLegend.length).trim();
      }
      const groupRequired =
        required ||
        Boolean(
          fieldset &&
            fieldset.textContent &&
            fieldset.textContent.includes("*"),
        );
      fields.push({
        id: "chk-" + fields.length,
        kind: "checkbox",
        descriptor: groupLegend
          ? groupLegend + " " + optionText
          : descriptor,
        groupDescriptor: groupLegend || descriptor,
        optionLabel: optionText,
        required: groupRequired,
        textIndex: -1,
        selectIndex: -1,
        elementId,
        checkboxIndex: checkboxIndex++,
      });
      continue;
    }

    if (tag === "select") {
      fields.push({
        id,
        kind: "select",
        descriptor,
        required,
        textIndex: -1,
        selectIndex: selectIndex++,
        elementId,
      });
    } else {
      fields.push({
        id,
        kind: tag === "textarea" ? "textarea" : "text",
        descriptor,
        required,
        textIndex: textIndex++,
        selectIndex: -1,
        elementId,
      });
    }
  }

  const combos = Array.from(
    document.querySelectorAll('[role="combobox"], [aria-haspopup="listbox"]'),
  );
  for (const el of combos) {
    if (el.tagName.toLowerCase() === "select") continue;
    if (!isVisible(el)) continue;
    const descriptor = descriptorFor(el);
    fields.push({
      id: "combo-" + descriptor.slice(0, 40) + "-" + fields.length,
      kind: "combobox",
      descriptor,
      required: isRequired(el),
      textIndex: -1,
      selectIndex: selectIndex++,
      elementId: el.id || "",
    });
  }

  return fields;
})()`;

const DISCOVER_FILE_INPUTS_SCRIPT = `(() => {
  function descriptorFor(el) {
    const parts = [];
    const id = el.id;
    if (id) parts.push(id);
    const field = el.closest(
      ".field, .application-question, [data-field], .question, .attachment, li",
    );
    if (field) {
      const legend = field.querySelector("legend, label, h3, h4, .label");
      if (legend && legend.textContent) parts.push(legend.textContent);
      parts.push(field.textContent || "");
    }
    return parts.join(" ").replace(/\\s+/g, " ").trim();
  }

  return Array.from(document.querySelectorAll('input[type="file"]')).map((el, index) => ({
    index,
    elementId: el.id || "",
    descriptor: descriptorFor(el),
    accept: el.getAttribute("accept") || "",
  }));
})()`;

const FRAME_SCORE_SCRIPT = `(() => {
  const fields = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select',
  ).length;
  const files = document.querySelectorAll('input[type="file"]').length;
  return fields + files * 3;
})()`;

/** Discover fillable fields on the active document (and embedded iframes). */
export async function discoverFields(page: Page): Promise<DiscoveredField[]> {
  const frames = page.frames();
  let best: DiscoveredField[] = [];
  for (const frame of frames) {
    try {
      const fields = (await frame.evaluate(
        DISCOVER_FIELDS_SCRIPT,
      )) as DiscoveredField[];
      if (fields.length > best.length) best = fields;
    } catch {
      /* cross-origin iframe */
    }
  }
  return best;
}

/** Return the frame that contains the most fillable fields. */
export async function pickFormFrame(page: Page) {
  const frames = page.frames();
  let best = page.mainFrame();
  let bestCount = -1;
  for (const frame of frames) {
    try {
      const score = (await frame.evaluate(FRAME_SCORE_SCRIPT)) as number;
      if (score > bestCount) {
        bestCount = score;
        best = frame;
      }
    } catch {
      /* ignore */
    }
  }
  return best;
}

export interface ValidationErrorField {
  label: string;
  elementId: string;
  descriptor: string;
}

const VALIDATION_ERRORS_SCRIPT = `(() => {
  const errors = [];
  const blocks = document.querySelectorAll(
    ".field, .application-question, [data-field], .question",
  );
  for (const block of blocks) {
    let hasError = false;
    const leaves = block.querySelectorAll("div, span, p, li");
    for (const el of leaves) {
      if (el.children.length > 0) continue;
      if (/^this field is required\\.?$/i.test((el.textContent || "").trim())) {
        hasError = true;
        break;
      }
    }
    if (!hasError) continue;
    const input = block.querySelector(
      'input:not([type="hidden"]), textarea, select',
    );
    const label =
      block.querySelector("label, legend, h3, h4")?.textContent?.trim() || "";
    const id = input ? input.id || "" : "";
    errors.push({
      label: label.slice(0, 120),
      elementId: id,
      descriptor: (label + " " + id).trim(),
    });
  }
  return errors;
})()`;

/** Fields that still show Greenhouse "This field is required." after fill. */
export async function discoverValidationErrors(
  page: Page,
): Promise<ValidationErrorField[]> {
  const frames = page.frames();
  let best: ValidationErrorField[] = [];
  for (const frame of frames) {
    try {
      const errors = (await frame.evaluate(
        VALIDATION_ERRORS_SCRIPT,
      )) as ValidationErrorField[];
      if (errors.length > best.length) best = errors;
    } catch {
      /* cross-origin iframe */
    }
  }
  return best;
}

export interface DiscoveredFileInput {
  index: number;
  elementId: string;
  descriptor: string;
  accept: string;
}

export async function discoverFileInputs(page: Page): Promise<DiscoveredFileInput[]> {
  const frames = page.frames();
  let best: DiscoveredFileInput[] = [];
  for (const frame of frames) {
    try {
      const files = (await frame.evaluate(
        DISCOVER_FILE_INPUTS_SCRIPT,
      )) as DiscoveredFileInput[];
      if (files.length > best.length) best = files;
    } catch {
      /* cross-origin iframe */
    }
  }
  return best;
}
