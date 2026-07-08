import type { FormFieldResponse } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  email: "Email",
  phone: "Phone",
  textarea: "Long answer",
  select: "Dropdown",
  checkbox: "Yes / no",
  radio: "Choice",
  file: "File upload",
  url: "Link",
  other: "Field",
};

export function fieldTypeLabel(fieldType: string): string {
  return TYPE_LABELS[fieldType.toLowerCase()] ?? fieldType;
}

/** Whether this field expects a file upload (resume or cover letter). */
export function fileFieldKind(
  field: FormFieldResponse,
): "resume" | "cover" | null {
  const label = field.label.toLowerCase();
  const answer = field.answer.toLowerCase();
  const type = field.fieldType.toLowerCase();

  const isCover =
    /cover\s*letter/.test(label) ||
    (/cover/.test(label) && /letter|upload|attach|file/.test(label)) ||
    (/cover letter/.test(answer) && /upload|pdf|tailorsend/.test(answer));

  const isResume =
    /resume|résumé|curriculum vitae|\bcv\b/.test(label) ||
    (/upload|attach|file/.test(label) && /resume|cv/.test(label)) ||
    (/resume/.test(answer) && /upload|pdf|tailorsend/.test(answer));

  if (type === "file") {
    if (isCover && !isResume) return "cover";
    if (isResume) return "resume";
    return "resume";
  }

  if (isCover) return "cover";
  if (isResume && /upload|attach|file|pdf/.test(label + " " + answer)) {
    return "resume";
  }

  return null;
}

export function isCopyableField(field: FormFieldResponse): boolean {
  return fileFieldKind(field) === null;
}
