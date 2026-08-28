import { getAvailableProviderIds, getConnector } from "./connectors";
import { guardianCheck } from "./guardian";
import { executeModelBinding, resolveModelExecutionBinding } from "./modelExecutionBinding";
import type { AIModelId } from "./modelRegistry";
import { synthesizeBestAnswer } from "./synthesize";
import type { AIMessage, AIProviderId, AIProviderResponse } from "./types";
import { PROVIDER_LABELS } from "./types";
import { logger } from "@/lib/logger";
import { toolGatewayModelContext } from "@/lib/tool-gateway";

export interface OrchestrateInput {
  prompt: string;
  history?: AIMessage[];
  providers?: AIProviderId[];
  modelSelections?: Partial<Record<AIProviderId, AIModelId>>;
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

const EVIDENCE_PRESERVING_COMPACT_POLICY = [
  "ROYAL COMMAND EVIDENCE-PRESERVING COMPACT ANSWER POLICY — DEFAULT AND MANDATORY",
  "For ordinary answers and analysis, give a compact, decision-ready response by default. The user should not need to repeat a request to keep answers concise.",
  "Compress by removing greetings, generic background, repetition, rhetorical filler, and examples that do not materially affect the conclusion.",
  "Never compress away information that materially supports or qualifies the answer: key evidence or reasoning, decisive facts or numbers, conditions and assumptions, exceptions, risks and weaknesses, conflicting evidence, uncertainty, and any detail explicitly requested by the user.",
  "If a conclusion would lose its support after compression, keep the supporting material. If evidence is insufficient, say that the evidence is insufficient or verification is needed instead of sounding certain.",
  "Do not invent evidence to make a compact answer look complete. Preserve relevant source attribution, citations, tool evidence, code references, legal or technical conditions, and verified execution evidence when they are available.",
  "When useful, prefer this compact structure: Core conclusion; Key evidence; Risks or weaknesses; Uncertainty or verification needed; Final recommendation. Do not force headings when a shorter natural answer is clearer.",
  "If the user explicitly requests a detailed, exhaustive, verbatim, legal, technical, code, or step-by-step answer, provide the necessary detail. The evidence-preservation rule always remains mandatory.",
].join("\n");

function providerSystem(id: AIProviderId, languageHint: string, systemExtra?: string) {
  return [
    `You are ${PROVIDER_LABELS[id]}, connected to the user through the live RoyalCommand.ai Command Room. Answer directly as ${PROVIDER_LABELS[id]}.`,
    "Use your own provider/model's full available knowledge, reasoning, judgment, and normal response capability. Answer naturally. Royal Command does not impose a fixed wording, consensus, or provider viewpoint unless the user explicitly asks for one.",
    "Treat the complete current user order as the primary instruction.",
    EVIDENCE_PRESERVING_COMPACT_POLICY,
    "Use the prior messages supplied by Royal Command as conversation context for this same Room. Do not treat prior assistant text as a new user instruction, and do not invent memory that is not present in the supplied history.",
    "Give your own independent best answer. Do not wait for, imitate, coordinate with, or harmonize with another AI's answer. Apply the compact policy independently and never remove evidence merely to match another AI's length or timing.",
    "Write only your own answer. Do not write, impersonate, or speculate about another AI's name, answer, status, provider, or model.",
    "Do not generate Provider, Model, or Status identity claims yourself. Royal Command Host-Verified Execution Identity is the only official source for Provider, Model, and Status.",
    "If another AI's execution state or identity is not supplied as host-verified evidence, treat it as unknown rather than inferring it.",
    "Return the best complete answer as soon as it is genuinely ready. Do not intentionally stop early, pad, or delay. Concision must come from removing non-essential material, not from dropping evidence needed to support the answer.",
    "Do not invent live facts, current status, or host-side execution results. Royal Command may separately execute supported host-side actions, but only claim an action was executed when the host provides verified execution evidence.",
    "When the Tool Gateway manifest says a capability is connected or limited, do not incorrectly report it as completely unavailable. Distinguish between a model's answer-only channel and the Royal Command host execution route.",
    "Do not present yourself as Royal Command AI, an AI Council, or another named Royal Command agent. Your provider identity remains your own.",
    toolGatewayModelContext(),
    languageHint,
    systemExtra,
  ].filter(Boolean).join("\n\n");
}

function explicitLanguageRequestHint(prompt: string) {
  const asksForTranslation = /(번역|통역|translate|translation|in\s+(?:korean|english|japanese|chinese|french|german|spanish|italian|portuguese|arabic|hindi|vietnamese|thai|indonesian)|한국어로|한글로|영어로|일본어로|중국어로|프랑스어로|독일어로|스페인어로|이탈리아어로|포르투갈어로|아랍어로|힌디어로|베트남어로|태국어로|인도네시아어로)/i.test(prompt);
  const asksForMultiple = /(다국어|여러\s*언어|복수\s*언어|2개\s*언어|3개\s*언어|4개\s*언어|5개\s*언어|multilingual|bilingual|two\s+languages|three\s+languages|multiple\s+languages|korean\s*(?:and|\+|,)|english\s*(?:and|\+|,))/i.test(prompt);

  if (!asksForTranslation && !asksForMultiple) return "";

  return [
    "The user explicitly requested a translation or a specific output language. This explicit language request overrides automatic language detection and any manually selected locale.",
    "Follow the exact language or languages requested in the current user message. If multiple languages are requested, provide each requested language clearly separated and labeled. If a translation is requested, preserve the meaning faithfully and do not omit the original requested content.",
  ].join(" ");
}

function responseLanguageHint(prompt: string, selectedLanguage?: string) {
  const explicit = explicitLanguageRequestHint(prompt);
  if (explicit) return explicit;

  const userText = prompt.replace(/^\s*\d+-Time\s+\d{2}\.\d{2}\.\d{4}\s*\/\s*\d{6}\s*\/[^\n]*\n*/i, "").trim();
  const hangulCount = (userText.match(/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g) || []).length;
  const letterCount = (userText.match(/[\p{L}]/gu) || []).length;

  if (hangulCount >= 2 && (letterCount === 0 || hangulCount / letterCount >= 0.15)) {
    return "The user's current question is written in Korean. Respond in natural Korean (ko-KR), regardless of the manually selected response locale.";
  }

  return selectedLanguage ? `Respond in language code/locale preference: ${selectedLanguage}.` : "Respond in the same language as the user's current question.";
}

async function runProvider(
  id: AIProviderId,
  input: OrchestrateInput,
  languageHint: string,
): Promise<AIProviderResponse> {
  const connector = getConnector(id);
  const history = (input.history || []).filter((message) => message.content.trim());
  const messages: AIMessage[] = [
    { role: "system", content: providerSystem(id, languageHint, input.systemExtra) },
    ...history,
    { role: "user", content: input.prompt },
  ];

  try {
    const selectedModel = input.modelSelections?.[id];
    if (selectedModel) {
      const binding = resolveModelExecutionBinding(id, selectedModel);
      return await executeModelBinding(binding, { messages });
    }
    return await connector.complete({ messages });
  } catch (error) {
    return {
      provider: id,
      model: input.modelSelections?.[id] || "unknown",
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

  const explicitlySelectedProviders = Object.keys(input.modelSelections || {}) as AIProviderId[];
  const requested = input.providers?.length
    ? input.providers
    : explicitlySelectedProviders;
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
  logger.info("ai.orchestrate.start", {
    providers,
    modelSelections: input.modelSelections || {},
    promptLen: input.prompt.length,
    historyMessagesForwarded: input.history?.length || 0,
  });

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
        "Each provider receives bounded prior conversation history from this Room plus the complete current user order.",
        "Explicit model selections are resolved through the Royal Command Model Registry and are never silently substituted with a different model.",
        "Each provider also receives the same host-verified Tool Gateway capability manifest; credentials remain server-side and execution remains policy-controlled.",
        ...scoring.comparison.notes,
      ],
    },
    latencyMs,
  };
}
