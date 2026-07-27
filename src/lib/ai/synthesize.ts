import type { AIProviderResponse } from "./types";
import { PROVIDER_LABELS } from "./types";

export interface SynthesisResult {
  finalAnswer: string;
  comparison: {
    winners: string[];
    notes: string[];
    providerScores: Record<string, number>;
  };
}

function scoreResponse(r: AIProviderResponse): number {
  if (r.error || !r.content.trim()) return 0;
  let score = 40;
  const len = r.content.trim().length;
  if (len > 120) score += 15;
  if (len > 400) score += 10;
  if (len > 900) score += 5;
  if (/^\s*[-*1.]/m.test(r.content)) score += 10;
  if (/because|therefore|however|예를|따라서|때문에/i.test(r.content)) score += 8;
  if (r.latencyMs < 2500) score += 5;
  if (r.latencyMs > 20000) score -= 5;
  return Math.min(100, score);
}

export function synthesizeBestAnswer(
  prompt: string,
  responses: AIProviderResponse[],
): SynthesisResult {
  const scored = responses.map((r) => ({
    r,
    score: scoreResponse(r),
  }));

  const successful = scored.filter((s) => s.score > 0);
  if (successful.length === 0) {
    return {
      finalAnswer:
        "All connected AI providers failed to respond. Please retry, check API keys, or continue in demo mode.",
      comparison: {
        winners: [],
        notes: responses.map(
          (r) => `${PROVIDER_LABELS[r.provider]}: ${r.error || "empty"}`,
        ),
        providerScores: Object.fromEntries(
          responses.map((r) => [r.provider, 0]),
        ),
      },
    };
  }

  successful.sort((a, b) => b.score - a.score);
  const best = successful[0]!;
  const runnerUp = successful[1];

  const notes = successful.map(
    (s) =>
      `${PROVIDER_LABELS[s.r.provider]} scored ${s.score}/100 (${s.r.latencyMs}ms${s.r.error ? `, error: ${s.r.error}` : ""})`,
  );

  const consensusHints = successful
    .slice(0, 3)
    .map((s) => s.r.content.split("\n").filter(Boolean).slice(0, 2).join(" "))
    .filter(Boolean);

  const finalAnswer = [
    best.r.content.trim(),
    "",
    "---",
    `RoyalCommand synthesis: primary answer from ${PROVIDER_LABELS[best.r.provider]} (score ${best.score}/100).`,
    runnerUp
      ? `Secondary signal considered from ${PROVIDER_LABELS[runnerUp.r.provider]} (score ${runnerUp.score}/100).`
      : "Only one successful provider response was available.",
    consensusHints.length > 1
      ? `Cross-model themes: ${consensusHints.map((h) => h.slice(0, 100)).join(" · ")}`
      : "",
    `User prompt retained for memory: "${prompt.slice(0, 120)}${prompt.length > 120 ? "…" : ""}"`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    finalAnswer,
    comparison: {
      winners: [best.r.provider, ...(runnerUp ? [runnerUp.r.provider] : [])],
      notes,
      providerScores: Object.fromEntries(
        scored.map((s) => [s.r.provider, s.score]),
      ),
    },
  };
}
