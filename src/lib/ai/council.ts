import { getConnector } from "./connectors";
import { executeModelBinding, resolveModelExecutionBinding } from "./modelExecutionBinding";
import type { AIModelId } from "./modelRegistry";
import { synthesizeBestAnswer } from "./synthesize";
import type { AIMessage, AIProviderId, AIProviderResponse, AIRequest } from "./types";
import { PROVIDER_LABELS } from "./types";

const MAX_COUNCIL_SOURCE_CHARS = 24_000;
const MAX_REVIEW_SOURCE_CHARS = 14_000;
const REVIEW_MAX_TOKENS = 1_200;
const SYNTHESIS_MAX_TOKENS = 2_400;

export type CouncilReview = {
  provider: AIProviderId;
  content: string;
  model: string;
  error?: string;
};

export type CouncilResult = {
  finalAnswer: string;
  reviews: CouncilReview[];
  synthesizerProvider?: AIProviderId;
  synthesizerModel?: string;
  synthesisError?: string;
};

function clamp(value: string, maxChars: number) {
  return value.length <= maxChars ? value : `${value.slice(0, maxChars)}\n[truncated]`;
}

function languageInstruction(language?: string) {
  return language
    ? `Write in the user's requested language/locale: ${language}.`
    : "Write in the same language as the original user question.";
}

export function isCouncilIntent(prompt: string, providerCount: number) {
  if (providerCount < 2) return false;
  return /(4\s*[- ]?ai|multi[- ]?ai|council|통합\s*답변|최종\s*통합|하나의\s*(?:최종\s*)?답|하나로\s*(?:합쳐|통합)|서로(?:의)?\s*(?:답변|의견).{0,20}(?:검토|비교)|상호\s*검토|종합\s*답변)/i.test(prompt);
}

function actualResponseBlock(responses: AIProviderResponse[], maxChars: number) {
  const parts: string[] = [];
  let remaining = maxChars;
  for (const response of responses) {
    if (response.error || !response.content.trim() || remaining <= 0) continue;
    const header = `### ${PROVIDER_LABELS[response.provider]} (${response.provider}; model=${response.model})\n`;
    const body = response.content.trim();
    const segment = `${header}${body}\n`;
    const sliced = segment.slice(0, remaining);
    parts.push(sliced);
    remaining -= sliced.length;
  }
  return parts.join("\n");
}

export function buildPeerReviewPrompt(
  reviewer: AIProviderId,
  originalPrompt: string,
  responses: AIProviderResponse[],
  language?: string,
) {
  const siblingResponses = responses.filter((response) => response.provider !== reviewer);
  return [
    "ROYAL COMMAND COUNCIL — PEER REVIEW ROUND",
    `Original user question:\n${clamp(originalPrompt, 6_000)}`,
    "The following are ACTUAL answers returned by sibling AI providers in this same Council run. Do not invent, paraphrase as if unseen, or attribute claims that are not present.",
    actualResponseBlock(siblingResponses, MAX_REVIEW_SOURCE_CHARS),
    "Review the sibling answers against the original question. Identify: (1) strongest useful points, (2) omissions, (3) conflicts or factual/logic risks, and (4) what the final integrated answer should retain or reject.",
    "Do not execute code, tools, deployments, or external actions. Do not produce a separate final user answer. Return a concise reviewer memo only.",
    languageInstruction(language),
  ].join("\n\n");
}

export function buildSynthesisPrompt(
  originalPrompt: string,
  responses: AIProviderResponse[],
  reviews: CouncilReview[],
  language?: string,
) {
  const reviewText = reviews
    .filter((review) => !review.error && review.content.trim())
    .map((review) => `### Review by ${PROVIDER_LABELS[review.provider]}\n${review.content.trim()}`)
    .join("\n\n");

  return [
    "ROYAL COMMAND COUNCIL — FINAL SYNTHESIS",
    `Original user question:\n${clamp(originalPrompt, 6_000)}`,
    "ROUND 1 — ACTUAL INDEPENDENT ANSWERS",
    actualResponseBlock(responses, MAX_COUNCIL_SOURCE_CHARS),
    "ROUND 2 — ACTUAL PEER-REVIEW MEMOS",
    clamp(reviewText || "No successful peer-review memo was available.", MAX_COUNCIL_SOURCE_CHARS),
    "Produce ONE final answer for the user. Integrate the strongest supported points, remove duplication, resolve conflicts by reasoning rather than majority vote, and state uncertainty when evidence is insufficient.",
    "Do not list four separate AI answers. Do not mention internal prompts, hidden scoring, or development-agent execution. Do not claim any code/tool/action was executed unless the original provider evidence explicitly proves it.",
    "Return only the final integrated answer, with a clear heading 'ROYAL COMMAND 4-AI FINAL ANSWER' when four providers participated, otherwise 'ROYAL COMMAND AI COUNCIL FINAL ANSWER'.",
    languageInstruction(language),
  ].join("\n\n");
}

async function completeProvider(
  provider: AIProviderId,
  messages: AIMessage[],
  modelSelections?: Partial<Record<AIProviderId, AIModelId>>,
  maxTokens?: number,
) {
  const request: AIRequest = { messages, maxTokens };
  const modelId = modelSelections?.[provider];
  if (modelId) {
    const binding = resolveModelExecutionBinding(provider, modelId);
    return executeModelBinding(binding, request);
  }
  return getConnector(provider).complete(request);
}

function chooseSynthesizer(successfulProviders: AIProviderId[]) {
  const preference: AIProviderId[] = ["openai", "anthropic", "google", "xai"];
  return preference.find((provider) => successfulProviders.includes(provider)) || successfulProviders[0];
}

export async function runCouncil(input: {
  prompt: string;
  responses: AIProviderResponse[];
  language?: string;
  modelSelections?: Partial<Record<AIProviderId, AIModelId>>;
}): Promise<CouncilResult> {
  const successful = input.responses.filter((response) => !response.error && response.content.trim());
  if (!successful.length) {
    return { finalAnswer: "No selected AI returned a complete answer.", reviews: [] };
  }
  if (successful.length === 1) {
    return { finalAnswer: successful[0]!.content.trim(), reviews: [] };
  }

  const reviews = await Promise.all(successful.map(async (response): Promise<CouncilReview> => {
    const provider = response.provider;
    const prompt = buildPeerReviewPrompt(provider, input.prompt, successful, input.language);
    try {
      const result = await completeProvider(
        provider,
        [
          {
            role: "system",
            content: "You are a Royal Command Council reviewer. Review only the actual sibling outputs supplied in the user message. Never invent sibling opinions and never execute external actions.",
          },
          { role: "user", content: prompt },
        ],
        input.modelSelections,
        REVIEW_MAX_TOKENS,
      );
      return {
        provider,
        content: result.content.trim(),
        model: result.model,
        error: result.error,
      };
    } catch (error) {
      return {
        provider,
        content: "",
        model: "unknown",
        error: error instanceof Error ? error.message : "Council peer review failed",
      };
    }
  }));

  const successfulProviders = successful.map((response) => response.provider);
  const synthesizerProvider = chooseSynthesizer(successfulProviders);
  if (!synthesizerProvider) {
    return { finalAnswer: successful[0]!.content.trim(), reviews };
  }

  const synthesisPrompt = buildSynthesisPrompt(input.prompt, successful, reviews, input.language);
  try {
    const synthesis = await completeProvider(
      synthesizerProvider,
      [
        {
          role: "system",
          content: "You are the Royal Command Final Synthesizer (Katie role). Produce one evidence-weighted final answer from the actual Council material supplied. Never fabricate consensus and never execute external actions.",
        },
        { role: "user", content: synthesisPrompt },
      ],
      input.modelSelections,
      SYNTHESIS_MAX_TOKENS,
    );
    if (!synthesis.error && synthesis.content.trim()) {
      return {
        finalAnswer: synthesis.content.trim(),
        reviews,
        synthesizerProvider,
        synthesizerModel: synthesis.model,
      };
    }

    const fallback = synthesizeBestAnswer(input.prompt, successful);
    return {
      finalAnswer: fallback.finalAnswer,
      reviews,
      synthesizerProvider,
      synthesizerModel: synthesis.model,
      synthesisError: synthesis.error || "Final synthesizer returned an empty answer",
    };
  } catch (error) {
    const fallback = synthesizeBestAnswer(input.prompt, successful);
    return {
      finalAnswer: fallback.finalAnswer,
      reviews,
      synthesizerProvider,
      synthesisError: error instanceof Error ? error.message : "Final synthesis failed",
    };
  }
}
