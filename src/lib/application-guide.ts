export type GuideStepId = "resume" | "cover" | "edge" | "apply" | "status";

export const GUIDE_STEP_ORDER: GuideStepId[] = [
  "resume",
  "cover",
  "edge",
  "apply",
  "status",
];

export interface GuideContext {
  manualApply: boolean;
  hasEdge: boolean;
  edgeBuildCount: number;
  edgeIncorporated: boolean;
  autofillComplete: boolean;
  formFieldsCount: number;
  statusSubmitted: boolean;
  multiStepApply: boolean;
  autofillInProgress: boolean;
}

export interface GuideStepMeta {
  id: GuideStepId;
  number: number;
  title: string;
  prompt: string;
  nextLabel: string;
  skipLabel?: string;
  canSkip?: boolean;
}

export function stepIndex(id: GuideStepId): number {
  return GUIDE_STEP_ORDER.indexOf(id);
}

export function nextStepId(current: GuideStepId): GuideStepId | null {
  const i = stepIndex(current);
  return i < GUIDE_STEP_ORDER.length - 1 ? GUIDE_STEP_ORDER[i + 1]! : null;
}

export function getStepMeta(id: GuideStepId, ctx: GuideContext): GuideStepMeta {
  const number = stepIndex(id) + 1;
  switch (id) {
    case "resume":
      return {
        id,
        number,
        title: "Review tailored resume",
        prompt: "Skim the ATS score, edit the resume if needed, then continue.",
        nextLabel: "Cover letter →",
      };
    case "cover":
      return {
        id,
        number,
        title: "Review cover letter",
        prompt: "Tweak tone and highlights, save if you edit, then continue.",
        nextLabel: "Your edge →",
      };
    case "edge":
      return {
        id,
        number,
        title: "Add your edge",
        prompt: ctx.edgeIncorporated
          ? "Talking points added — review Resume/Cover steps, then apply."
          : ctx.edgeBuildCount
            ? "Pick talking points to add, or skip for now."
            : ctx.hasEdge
              ? "Read company research below, then continue to apply."
              : "Research loading — skip if you want to apply now.",
        nextLabel: "Apply →",
        skipLabel: "Skip",
        canSkip: true,
      };
    case "apply":
      return {
        id,
        number,
        title: ctx.manualApply
          ? "Prepare your application"
          : ctx.multiStepApply
            ? "Apply (multi-step form)"
            : "Auto-fill application",
        prompt: ctx.manualApply
          ? "Copy answers below, then apply on the company site."
          : ctx.autofillComplete
            ? "Autofill done — review in the browser, submit yourself, then update status."
            : ctx.autofillInProgress
              ? "Filling the form… use Continue Autofill if it pauses."
              : ctx.multiStepApply
                ? "Use Auto-fill & open browser. Continue Autofill if more steps remain."
                : "Use Auto-fill & open browser, or copy answers from the form below.",
        nextLabel: "Update status →",
      };
    case "status":
      return {
        id,
        number,
        title: "Update status",
        prompt: ctx.statusSubmitted
          ? "You’re set — update again when interviews progress."
          : "After you submit in the browser, mark this as submitted.",
        nextLabel: "Done",
      };
  }
}
