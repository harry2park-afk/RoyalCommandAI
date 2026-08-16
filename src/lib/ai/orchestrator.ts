import { getAvailableProviderIds, getConnector } from "./connectors";
import { guardianCheck } from "./guardian";
import { synthesizeBestAnswer } from "./synthesize";
import type { AIMessage, AIProviderId, AIProviderResponse } from "./types";
import { PROVIDER_LABELS } from "./types";
import { logger } from "@/lib/logger";

export interface OrchestrateInput {
  prompt: string;
  history?: AIMessage[];
  providers?: AIProviderId[];
  language?: string;
  systemExtra?: string;
}

export interface OrchestrateResult {
  blocked: boolean;
  blockReason?: string;
  escalation?: string;
  providers: AIProviderId[];
  responses: AIProviderResponse[];
  finalAnswer: string;
  comparison: {
    winners: string[];
    notes: string[];
    providerScores: Record<string, number>;
  };
  latencyMs: number;
}

function providerSystem(id: AIProviderId, languageHint: string, systemExtra?: string) {
  return [
    `You are ${PROVIDER_LABELS[id]}. Answer the user directly as ${PROVIDER_LABELS[id]}.`,
    "Do not identify yourself as Royal Command AI, an AI Council, a customer-support AI, Elizabeth, Kevin, Katie, a receptionist, or a development-team messenger.",
    "Do not invent actions or claim work was completed when it was not.",
    "Be clear, practical, and preserve the user's meaning.",
    languageHint,
    systemExtra,
  ].filter(Boolean).join("\n\n");
}

async function runProvider(
  id: AIProviderId,
  input: OrchestrateInput,
  languageHint: string,
): Promise<AIProviderResponse> {
  const connector = getConnector(id);
  const messages: AIMessage[] = [
    { role: "system", content: providerSystem(id, languageHint, input.systemExtra) },
    ...(input.history || []).slice(-12),
    { role: "user", content: input.prompt },
  ];

  try {
    return await connector.complete({ messages });
  } catch (error) {
    return {
      provider: id,
      model: "unknown",
      content: "",
      latencyMs: 0,
      error: error instanceof Error ? error.message : "connector failure",
    } satisfies AIProviderResponse;
  }
}

function directAnswer(responses: AIProviderResponse[]) {
  const successful = responses.filter((r) => !r.error && r.content.trim());
  if (!successful.length) return "No selected AI returned an answer.";
  if (successful.length === 1) return successful[0]!.content.trim();

  return successful
    .map((r) => `### ${PROVIDER_LABELS[r.provider]}\n${r.content.trim()}`)
    .join("\n\n");
}

export async function orchestrate(input: OrchestrateInput): Promise<OrchestrateResult> {
  const started = Date.now();
  const gate = guardianCheck(input.prompt);
  if (gate.blocked) {
    return {
      blocked: true,
      blockReason: gate.reason,
      escalation: gate.escalation,
      providers: [],
      responses: [],
      finalAnswer: `${gate.reason}\n\n${gate.escalation}`,
      comparison: { winners: [], notes: ["Compliance Guardian blocked"], providerScores: {} },
      latencyMs: Date.now() - started,
    };
  }

  const requested = input.providers?.length ? input.providers : getAvailableProviderIds();
  const available = new Set(getAvailableProviderIds());
  const providers = requested.filter((id) => available.has(id));

  if (!providers.length) {
    return {
      blocked: false,
      providers: [],
      responses: [],
      finalAnswer: "No selected AI is connected. Open at least one connected AI and try again.",
      comparison: { winners: [], notes: ["No connected selected provider"], providerScores: {} },
      latencyMs: Date.now() - started,
    };
  }

  const languageHint = input.language ? `Respond in language code/locale preference: ${input.language}.` : "";
  logger.info("ai.orchestrate.start", { providers, promptLen: input.prompt.length });

  const responses = await Promise.all(providers.map((id) => runProvider(id, input, languageHint)));
  const scoring = synthesizeBestAnswer(input.prompt, responses);
  const finalAnswer = directAnswer(responses);
  const latencyMs = Date.now() - started;

  logger.info("ai.orchestrate.done", {
    providers: providers.map((p) => PROVIDER_LABELS[p]),
    latencyMs,
    successful: responses.filter((r) => !r.error && r.content.trim()).length,
  });

  return {
    blocked: false,
    providers,
    responses,
    finalAnswer,
    comparison: {
      ...scoring.comparison,
      notes: [
        providers.length > 1
          ? `Direct answers shown separately from: ${providers.map((p) => PROVIDER_LABELS[p]).join(", ")}.`
          : `Direct answer from ${PROVIDER_LABELS[providers[0]!]} .`,
        ...scoring.comparison.notes,
      ],
    },
    latencyMs,
  };
}
