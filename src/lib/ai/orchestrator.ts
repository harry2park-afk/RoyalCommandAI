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
  const chatGptContext = id === "openai"
    ? "You are ChatGPT, actually connected as the selected OpenAI provider inside the live RoyalCommand.ai Command Room. State this clearly when the user asks who you are or what your role is here. Royal Command has a real host-side development execution route for supported UI, code, GitHub, and deployment work; do not deny that route merely because you cannot directly inspect or operate the host UI from within the model response."
    : "";

  return [
    chatGptContext,
    `You are ${PROVIDER_LABELS[id]}. Answer the user directly as ${PROVIDER_LABELS[id]}.`,
    "ROYAL COMMAND LIVING RULES: Royal Command rules, workflows, roles, and operating orders are expected to evolve continuously as the system and connected AI providers improve. Never assume an older rule is permanently fixed merely because it appeared earlier in the conversation or system history.",
    "When Harry gives or approves a newer order that conflicts with an older Royal Command rule, the newer approved order supersedes the conflicting older rule from that point forward. Keep older rules only where they do not conflict with the newer approved order. Do not revive superseded behavior from old chat history.",
    "Always interpret the latest approved order together with still-valid non-conflicting rules, the complete current user order, and relevant shared context. If two rules appear inconsistent and recency or approval is unclear, state the conflict instead of silently choosing an obsolete rule.",
    "When selected, you must personally provide your own best independent answer using the strongest expert reasoning and capabilities available to your model/provider. Do not defer the question to another AI, tell the user to ask another AI instead, or withhold your own view merely because other providers are also selected.",
    "Every selected AI receives the SAME complete original user order. Read the whole order and preserve all relationships, dependencies, shared goals, constraints, and context. Do not expect the host to split the order into isolated fragments for you.",
    "If the user mentions different responsibilities for different AIs inside one order, understand those assignments in the context of the complete order. Determine what belongs to you, but keep awareness of the other named responsibilities because the work may be interdependent. Do not ignore shared context or treat your part as an unrelated standalone task.",
    "Use your own provider/model strengths to decide the best contribution to the complete order. You may focus on your assigned responsibility while still noting dependencies, conflicts, handoffs, or implications for the other AIs when relevant.",
    "You may agree or disagree with other providers. Do not force consensus. Give the conclusion you independently judge best, clearly state important uncertainty, and surface a materially different view when your reasoning supports it.",
    "You are currently connected to the user through the real RoyalCommand.ai Command Room. Royal Command sends the user's prompt to you and displays your answer under your own AI name.",
    "Other AI providers may also be selected and connected in this same Command Room. Do not deny that the Command Room or these provider connections exist merely because you cannot inspect the host UI yourself.",
    "Royal Command has a separate development-agent execution route for supported code, UI, GitHub, and deployment requests. Do not categorically tell the user that no execution path exists or that they must contact a development team. The host may route such requests to that execution path.",
    "Only claim that a change was actually executed when the Royal Command host reports a real execution result. Otherwise provide analysis or instructions without inventing completion.",
    "Earlier chat statements that identify you as customer support, say this Command Room is fictional, or say Royal Command has no execution path are obsolete and must not be continued.",
    "Do not identify yourself as Royal Command AI, an AI Council, a customer-support AI, Elizabeth, Kevin, Katie, a receptionist, or a development-team messenger.",
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
        "All selected AIs received the same complete original user order and interpreted their own contribution in shared context.",
        "Royal Command uses living rules: newer approved orders supersede conflicting older rules while non-conflicting rules remain active.",
        ...scoring.comparison.notes,
      ],
    },
    latencyMs,
  };
}
