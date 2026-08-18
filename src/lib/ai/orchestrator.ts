import { getAvailableProviderIds, getConnector } from "./connectors";
import { guardianCheck } from "./guardian";
import { synthesizeBestAnswer } from "./synthesize";
import type { AIMessage, AIProviderId, AIProviderResponse } from "./types";
import { PROVIDER_LABELS } from "./types";
import { logger } from "@/lib/logger";
import { toolGatewayModelContext } from "@/lib/tool-gateway";

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
    `You are ${PROVIDER_LABELS[id]}, connected to the user through the live RoyalCommand.ai Command Room. Answer directly as ${PROVIDER_LABELS[id]}.`,
    "Use your own provider/model's full available knowledge, reasoning, judgment, and normal response capability. Answer naturally. Royal Command does not impose a fixed answer format, length, wording, consensus, or style unless the user explicitly asks for one.",
    "Treat the complete current user order as the primary instruction.",
    "Give your own independent best answer. Do not wait for, imitate, coordinate with, harmonize with, or shorten your answer because of another AI's answer or timing.",
    "Return the best complete answer as soon as it is genuinely ready. Do not intentionally stop early, pad, delay, or reduce depth because you are running inside Royal Command.",
    "Do not invent live facts, current status, or host-side execution results. Royal Command may separately execute supported host-side actions, but only claim an action was executed when the host provides verified execution evidence.",
    "When the Tool Gateway manifest says a capability is connected or limited, do not incorrectly report it as completely unavailable. Distinguish between a model's answer-only channel and the Royal Command host execution route.",
    "Do not present yourself as Royal Command AI, an AI Council, or another named Royal Command agent. Your provider identity remains your own.",
    toolGatewayModelContext(),
    languageHint,
    systemExtra,
  ].filter(Boolean).join("\n\n");
}

function responseLanguageHint(_prompt: string, selectedLanguage?: string) {
  if (selectedLanguage) {
    return [
      `The customer's manually selected Command Room language is ${selectedLanguage}.`,
      `Respond in ${selectedLanguage}, regardless of the language used in the customer's question.`,
      "This selected language is authoritative and remains in force until the customer changes the language selector.",
      "Do not automatically switch reply language based on detecting Korean, English, or any other language in the prompt.",
      "Keep code, product names, proper nouns, URLs, and text the customer explicitly asks to preserve verbatim unchanged where appropriate.",
    ].join(" ");
  }

  return "No persistent response language was supplied. Respond in the same language as the user's current question.";
}

async function runProvider(
  id: AIProviderId,
  input: OrchestrateInput,
  languageHint: string,
): Promise<AIProviderResponse> {
  const connector = getConnector(id);
  const messages: AIMessage[] = [
    { role: "system", content: providerSystem(id, languageHint, input.systemExtra) },
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

  const languageHint = responseLanguageHint(input.prompt, input.language);
  logger.info("ai.orchestrate.start", { providers, promptLen: input.prompt.length, historyMessagesForwarded: 0 });

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
        "Each provider receives only the complete current user order for the current request, preventing stale earlier prompts from being merged into a new task.",
        "Each provider also receives the same host-verified Tool Gateway capability manifest; credentials remain server-side and execution remains policy-controlled.",
        ...scoring.comparison.notes,
      ],
    },
    latencyMs,
  };
}
