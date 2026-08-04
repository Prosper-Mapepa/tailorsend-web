import { analyzeJobVisaLlm } from "@/lib/ai";
import {
  analyzeJobVisaHeuristic,
  hashJobContent,
  mergeVisaAnalysis,
  visaRiskFromAnalysis,
  type JobVisaAnalysis,
} from "@/lib/visa-analyze";
import { scoreJobVisa } from "@/lib/visa-score";
import type { CompanyVisaSignals } from "@/lib/visa-score";

/**
 * Full job visa analysis: heuristics always run; LLM merges when available.
 * Skip LLM when contentHash matches a prior analysis.
 */
export async function analyzeJobVisaFull(opts: {
  title: string;
  description: string;
  remote?: boolean;
  previous?: JobVisaAnalysis | null;
  useLlm?: boolean;
  company?: Partial<CompanyVisaSignals> | null;
}): Promise<{
  analysis: JobVisaAnalysis;
  visaScore: number;
  reasons: string[];
  visaRisk: ReturnType<typeof visaRiskFromAnalysis>;
}> {
  const hash = hashJobContent(opts.title, opts.description);
  if (opts.previous?.contentHash === hash && opts.previous.source) {
    const scored = scoreJobVisa(opts.previous, opts.company);
    return {
      analysis: opts.previous,
      visaScore: scored.score,
      reasons: scored.reasons,
      visaRisk: scored.risk,
    };
  }

  const heuristic = analyzeJobVisaHeuristic(
    opts.title,
    opts.description,
    opts.remote ?? false,
  );

  let analysis = heuristic;
  if (opts.useLlm !== false) {
    const llm = await analyzeJobVisaLlm(opts.title, opts.description);
    if (llm) {
      analysis = mergeVisaAnalysis(heuristic, {
        ...llm,
        contentHash: hash,
        analyzedAt: new Date().toISOString(),
        source: "llm",
      });
    }
  }

  const scored = scoreJobVisa(analysis, opts.company);
  return {
    analysis,
    visaScore: scored.score,
    reasons: scored.reasons,
    visaRisk: scored.risk,
  };
}
