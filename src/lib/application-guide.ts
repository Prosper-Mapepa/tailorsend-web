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
  tab?: "resume" | "cover" | "edge" | "form";
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
        tab: "resume",
        prompt:
          "Check the ATS keyword match above, then review and edit your tailored resume. Save when you're happy with it.",
        nextLabel: "Next: Cover letter →",
      };
    case "cover":
      return {
        id,
        number,
        title: "Review cover letter",
        tab: "cover",
        prompt:
          "Personalize your cover letter for this role. Tweak the tone and highlights, then save your changes.",
        nextLabel: "Next: Your edge →",
      };
    case "edge":
      return {
        id,
        number,
        title: "Add your edge",
        tab: "edge",
        prompt: ctx.edgeIncorporated
          ? "Ideas added to your resume and cover letter. Skim the Resume and Cover letter tabs, then continue to apply."
          : ctx.edgeBuildCount
            ? `Select talking points that set you apart, then click "Add to resume & cover letter". You can skip if you prefer.`
            : ctx.hasEdge
              ? "Read the company research below. When you're ready, continue to the application step."
              : "Company research is loading — you can skip and continue when ready.",
        nextLabel: "Next: Apply →",
        skipLabel: "Skip for now",
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
        tab: "form",
        prompt: ctx.manualApply
          ? "This job requires sign-in. Use Form responses to copy answers, then apply on the company site."
          : ctx.autofillComplete
            ? "Autofill finished all visible steps. Review every page in the browser, submit yourself, then update your status."
            : ctx.autofillInProgress
              ? "Auto-fill is stepping through the form. If it pauses on a step, click Continue Autofill in the panel below."
              : ctx.multiStepApply
                ? 'Click "Auto-fill & open browser". TailorSend fills each step (name, email, resume upload, etc.) and clicks Save & Continue. Use Continue Autofill if more steps remain.'
                : 'Click "Auto-fill & open browser" to fill the form. Copy any extra answers from Form responses.',
        nextLabel: "Next: Update status →",
      };
    case "status":
      return {
        id,
        number,
        title: "Update status",
        prompt: ctx.statusSubmitted
          ? "You're all set. Track interview updates here as your application progresses."
          : 'After submitting in the browser, mark this application as "submitted" (or another status).',
        nextLabel: "Done",
      };
  }
}
