import { AI_PROVIDER_IDS, PROVIDER_LABELS, type AIProviderId } from "./types";

export type SynthesisSourceResponse = {
  provider: string;
  content: string;
  latencyMs?: number;
  error?: string;
};

export type ValidatedSynthesisRequest = {
  roomId: string;
  originalPrompt: string;
  language: string;
  synthesizer: AIProviderId;
  responses: Array<{ provider: AIProviderId; content: string; latencyMs?: number }>;
};

const PROVIDER_SET = new Set<string>(AI_PROVIDER_IDS);

export function validateSynthesisRequest(input: unknown): ValidatedSynthesisRequest {
  if (!input || typeof input !== "object") throw new Error("Invalid synthesis request.");
  const body = input as Record<string, unknown>;
  const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";
  const originalPrompt = typeof body.originalPrompt === "string" ? body.originalPrompt.trim() : "";
  const language = typeof body.language === "string" && body.language.trim() ? body.language.trim() : "ko";
  const synthesizer = typeof body.synthesizer === "string" ? body.synthesizer.trim() : "";
  const rawResponses = Array.isArray(body.responses) ? body.responses : [];

  if (!roomId) throw new Error("Room ID is required.");
  if (!originalPrompt) throw new Error("Original order is required.");
  if (!PROVIDER_SET.has(synthesizer)) throw new Error("Unknown synthesis AI.");
  if (rawResponses.length > AI_PROVIDER_IDS.length) throw new Error("Too many source responses.");

  const seen = new Set<string>();
  const responses: ValidatedSynthesisRequest["responses"] = [];
  for (const raw of rawResponses) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const provider = typeof item.provider === "string" ? item.provider.trim() : "";
    const content = typeof item.content === "string" ? item.content.trim() : "";
    const error = typeof item.error === "string" ? item.error.trim() : "";
    if (!PROVIDER_SET.has(provider) || error || content.length < 2) continue;
    if (seen.has(provider)) throw new Error(`Duplicate source AI: ${provider}`);
    seen.add(provider);
    responses.push({
      provider: provider as AIProviderId,
      content: content.slice(0, 30000),
      ...(typeof item.latencyMs === "number" && Number.isFinite(item.latencyMs) ? { latencyMs: item.latencyMs } : {}),
    });
  }

  if (responses.length < 2) throw new Error("At least two complete AI answers are required for synthesis.");

  return {
    roomId,
    originalPrompt: originalPrompt.slice(0, 12000),
    language,
    synthesizer: synthesizer as AIProviderId,
    responses,
  };
}

export function buildSynthesisPrompt(input: ValidatedSynthesisRequest): string {
  const sourceText = input.responses
    .map((item, index) => [
      `SOURCE ${index + 1} — ${PROVIDER_LABELS[item.provider]} (${item.provider})`,
      item.content,
    ].join("\n"))
    .join("\n\n---\n\n");

  return [
    "ROYAL COMMAND — INDEPENDENT SYNTHESIS TASK",
    "You are the user-selected synthesis AI. Do not simply choose the longest answer or declare one model the winner.",
    "Evaluate the supplied answers on their actual reasoning and evidence. Acknowledge when a point cannot be reliably judged.",
    "Do not invent facts, tool results, citations, commits, tests, or consensus that are not present in the supplied answers.",
    "Preserve material minority opinions when they expose a real risk or uncertainty.",
    "",
    `ORIGINAL USER ORDER:\n${input.originalPrompt}`,
    "",
    "REQUIRED SYNTHESIS:",
    "1. Identify the useful contribution or strength of each AI answer.",
    "2. Identify weaknesses, unsupported claims, or limits of each answer.",
    "3. State which points are difficult or impossible to evaluate from the supplied material.",
    "4. Identify agreements and genuine conflicts between the answers.",
    "5. Identify missing information or verification still required.",
    "6. Resolve conflicts only when the supplied reasoning/evidence supports doing so; otherwise preserve the uncertainty.",
    "7. Produce one improved final answer to the ORIGINAL USER ORDER by combining the strongest supported parts.",
    "8. Briefly explain why the final conclusion was chosen.",
    "",
    `Answer in ${input.language === "ko" ? "Korean" : input.language === "en" ? "English" : input.language}.`,
    "",
    "SOURCE ANSWERS:",
    sourceText,
  ].join("\n");
}
