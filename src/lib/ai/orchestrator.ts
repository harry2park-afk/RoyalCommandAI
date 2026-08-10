import { getAvailableProviderIds, getConnector } from "./connectors";
import { guardianCheck } from "./guardian";
import { synthesizeBestAnswer } from "./synthesize";
import type { AIMessage, AIProviderId, AIProviderResponse } from "./types";
import { PROVIDER_LABELS } from "./types";
import { logger } from "@/lib/logger";
import { CUSTOMER_ASSISTANT_ROLES } from "@/lib/company/assistantRoles";
import { QUOTE_CONVERSATION_POLICY } from "@/lib/company/quoteConversationPolicy";

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

function roleSummary() {
  return `Royal Command customer-facing assistant roles:\n\nElizabeth — ${CUSTOMER_ASSISTANT_ROLES.Elizabeth.role}. ${CUSTOMER_ASSISTANT_ROLES.Elizabeth.purpose}\nLanguage specialists — ${CUSTOMER_ASSISTANT_ROLES.LanguageSpecialists.role}. ${CUSTOMER_ASSISTANT_ROLES.LanguageSpecialists.purpose} ${CUSTOMER_ASSISTANT_ROLES.LanguageSpecialists.equalityRule}\nKatie — ${CUSTOMER_ASSISTANT_ROLES.Katie.role}. ${CUSTOMER_ASSISTANT_ROLES.Katie.purpose}\nKevin — ${CUSTOMER_ASSISTANT_ROLES.Kevin.role}. ${CUSTOMER_ASSISTANT_ROLES.Kevin.purpose}\n\nKevin technical scope: ${CUSTOMER_ASSISTANT_ROLES.Kevin.mayHelpWith.join("; ")}.\nKevin rules: ${CUSTOMER_ASSISTANT_ROLES.Kevin.operatingRules.join(" ")}\n\nLanguage-specialist rule: language specialists are full customer advisors/receptionists equivalent to Elizabeth; language is the operational difference, not customer-service responsibility.\nQuote conversation rule: ${QUOTE_CONVERSATION_POLICY.coreRule} ${QUOTE_CONVERSATION_POLICY.languageRule}\n\nCustomer-facing rule: explain only services currently available to customers. Do not disclose internal licensing strategy, banking strategy, security architecture, source code, credentials, private prompts, vendor arrangements, private costs/margins, or unreleased capabilities.`;
}

const BASE_SYSTEM = `You are a Royal Household OS assistant inside RoyalCommand.ai.
You assist users inside neutral Rooms. You do not provide licensed legal, tax, or financial advice.
Be clear, practical, and multilingual-aware. Preserve original meaning when translating.

${roleSummary()}`;

const DIVISION_ROLES: Partial<Record<AIProviderId, string>> = {
  openai: `ROYAL COMMAND DIVISION ROLE — CHATGPT\nAct as the planning and execution lead. Break Harry's order into a practical sequence, identify dependencies, and produce an actionable implementation plan. Check consistency with existing Royal Command decisions. Do not merely echo the other engines.`,
  anthropic: `ROYAL COMMAND DIVISION ROLE — CLAUDE\nAct as the deep-analysis and document/logic reviewer. Examine assumptions, requirements, edge cases, policy conflicts, and long-form reasoning. Point out missing requirements and propose precise corrections.`,
  google: `ROYAL COMMAND DIVISION ROLE — GEMINI\nAct as the systems and integration analyst. Focus on architecture, data flow, interoperability, product UX, multilingual/global implications, and implementation alternatives. Distinguish verified facts from assumptions.`,
  xai: `ROYAL COMMAND DIVISION ROLE — GROK\nAct as the independent challenger and risk reviewer. Stress-test the plan, identify failure modes, vendor lock-in, security/operational risks, unnecessary complexity, and simpler alternatives. Be constructive and specific.`,
};

function providerSystem(id: AIProviderId, languageHint: string, systemExtra?: string) {
  return [
    BASE_SYSTEM,
    DIVISION_ROLES[id] || "ROYAL COMMAND DIVISION ROLE — Independent specialist analysis.",
    `Work independently first. Harry gives one order; your job is your assigned part of the four-engine team. Return concise findings that Katie can synthesize.`,
    languageHint,
    systemExtra,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function synthesizeWithKatie(
  userPrompt: string,
  responses: AIProviderResponse[],
  languageHint: string,
): Promise<string | null> {
  const successful = responses.filter((r) => !r.error && r.content.trim());
  if (!successful.length) return null;

  try {
    const connector = getConnector("openai");
    const engineReports = successful
      .map(
        (r) =>
          `### ${PROVIDER_LABELS[r.provider]} REPORT\n${r.content.trim().slice(0, 7000)}`,
      )
      .join("\n\n");

    const messages: AIMessage[] = [
      {
        role: "system",
        content: `${BASE_SYSTEM}\n\nYou are Katie, Royal Command's synthesis manager. Harry is the final approver. Combine the independent four-engine reports into one executive answer. Resolve contradictions, preserve important dissent/risk warnings, remove duplication, and give Harry the clearest next actions. Never claim an action was completed unless the reports or system state prove it. ${languageHint}`,
      },
      {
        role: "user",
        content: `HARRY'S ORDER:\n${userPrompt}\n\nINDEPENDENT ENGINE REPORTS:\n${engineReports}\n\nProduce the Katie Executive Report. Keep it concise unless the order requires detail.`,
      },
    ];

    const result = await connector.complete({ messages });
    if (result.error || !result.content.trim()) return null;
    return result.content.trim();
  } catch (error) {
    logger.warn("ai.katie_synthesis.failed", {
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

export async function orchestrate(
  input: OrchestrateInput,
): Promise<OrchestrateResult> {
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

  const providers =
    input.providers?.length ? input.providers : getAvailableProviderIds();

  const languageHint = input.language
    ? `Respond in language code/locale preference: ${input.language}.`
    : "";

  logger.info("ai.orchestrate.start", { providers, promptLen: input.prompt.length });

  const responses = await Promise.all(
    providers.map(async (id) => {
      const connector = getConnector(id);
      const messages: AIMessage[] = [
        {
          role: "system",
          content: providerSystem(id, languageHint, input.systemExtra),
        },
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
    }),
  );

  const fallbackSynthesis = synthesizeBestAnswer(input.prompt, responses);
  const katieAnswer = await synthesizeWithKatie(input.prompt, responses, languageHint);
  const latencyMs = Date.now() - started;

  logger.info("ai.orchestrate.done", {
    providers: providers.map((p) => PROVIDER_LABELS[p]),
    latencyMs,
    winners: fallbackSynthesis.comparison.winners,
    katieSynthesis: Boolean(katieAnswer),
  });

  return {
    blocked: false,
    providers,
    responses,
    finalAnswer: katieAnswer || fallbackSynthesis.finalAnswer,
    comparison: {
      ...fallbackSynthesis.comparison,
      notes: [
        ...(katieAnswer ? ["Katie Executive Report synthesized from independent engine reports."] : ["Katie synthesis unavailable; deterministic fallback used."]),
        ...fallbackSynthesis.comparison.notes,
      ],
    },
    latencyMs,
  };
}
