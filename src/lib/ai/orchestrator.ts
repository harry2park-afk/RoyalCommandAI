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

function responseLanguageHint(prompt: string, selectedLanguage?: string) {
  const userText = prompt.replace(/^\s*\d+-Time\s+\d{2}\.\d{2}\.\d{4}\s*\/\s*\d{6}\s*\/[^\n]*\n*/i, "").trim();
  const hangulCount = (userText.match(/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g) || []).length;
  const latinCount = (userText.match(/[A-Za-z]/g) || []).length;
  const cjkCount = (userText.match(/[\u3040-\u30ff\u3400-\u9fff]/g) || []).length;
  const arabicCount = (userText.match(/[\u0600-\u06ff]/g) || []).length;
  const cyrillicCount = (userText.match(/[\u0400-\u04ff]/g) || []).length;

  if (hangulCount >= 2) {
    return [
      "The customer's current question is written in Korean.",
      "Respond in natural Korean (ko-KR) for this message.",
      selectedLanguage ? `The saved Command Room default language remains ${selectedLanguage}; do not change that saved selector value because of this message.` : "",
    ].filter(Boolean).join(" ");
  }

  if (cjkCount >= 2) {
    return [
      "The customer's current question uses Japanese or Chinese characters.",
      "Respond in the same language/script used by the current question for this message.",
      selectedLanguage ? `The saved Command Room default language remains ${selectedLanguage}; do not change that saved selector value because of this message.` : "",
    ].filter(Boolean).join(" ");
  }

  if (arabicCount >= 2) {
    return [
      "The customer's current question is written in Arabic-script text.",
      "Respond in the same language used by the current question for this message.",
      selectedLanguage ? `The saved Command Room default language remains ${selectedLanguage}; do not change that saved selector value because of this message.` : "",
    ].filter(Boolean).join(" ");
  }

  if (cyrillicCount >= 2) {
    return [
      "The customer's current question is written in Cyrillic-script text.",
      "Respond in the same language used by the current question for this message.",
      selectedLanguage ? `The saved Command Room default language remains ${selectedLanguage}; do not change that saved selector value because of this message.` : "",
    ].filter(Boolean).join(" ");
  }

  if (latinCount >= 3) {
    return [
      "The customer's current question is written primarily with Latin-script text.",
      "Respond in the same language used by the current question for this message.",
      selectedLanguage ? `If the exact language is ambiguous, use the saved Command Room default locale ${selectedLanguage}. Do not change the saved selector value.` : "",
    ].filter(Boolean).join(" ");
  }

  return selectedLanguage
    ? `The current question's language is ambiguous. Respond using the saved Command Room default locale ${selectedLanguage}. The saved selector remains unchanged until the customer changes it.`
    : "The current question's language is ambiguous. Respond in the same language as best inferred from the question.";
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
