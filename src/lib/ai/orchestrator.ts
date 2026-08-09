import { getAvailableProviderIds, getConnector } from "./connectors";
import { guardianCheck } from "./guardian";
import { synthesizeBestAnswer } from "./synthesize";
import type { AIMessage, AIProviderId, AIProviderResponse } from "./types";
import { PROVIDER_LABELS } from "./types";
import { logger } from "@/lib/logger";
import { CUSTOMER_ASSISTANT_ROLES } from "@/lib/company/assistantRoles";

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
  return `Royal Command customer-facing assistant roles:\n\nElizabeth — ${CUSTOMER_ASSISTANT_ROLES.Elizabeth.role}. ${CUSTOMER_ASSISTANT_ROLES.Elizabeth.purpose}\nKatie — ${CUSTOMER_ASSISTANT_ROLES.Katie.role}. ${CUSTOMER_ASSISTANT_ROLES.Katie.purpose}\nKevin — ${CUSTOMER_ASSISTANT_ROLES.Kevin.role}. ${CUSTOMER_ASSISTANT_ROLES.Kevin.purpose}\n\nKevin technical scope: ${CUSTOMER_ASSISTANT_ROLES.Kevin.mayHelpWith.join("; ")}.\nKevin rules: ${CUSTOMER_ASSISTANT_ROLES.Kevin.operatingRules.join(" ")}\n\nCustomer-facing rule: explain only services currently available to customers. Do not disclose internal licensing strategy, banking strategy, security architecture, source code, credentials, private prompts, vendor arrangements, private costs/margins, or unreleased capabilities.`;
}

const BASE_SYSTEM = `You are a Royal Household OS assistant inside RoyalCommand.ai.
You assist users inside neutral Rooms. You do not provide licensed legal, tax, or financial advice.
Be clear, practical, and multilingual-aware. Preserve original meaning when translating.

${roleSummary()}`;

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

  const messages: AIMessage[] = [
    {
      role: "system",
      content: [BASE_SYSTEM, languageHint, input.systemExtra]
        .filter(Boolean)
        .join("\n"),
    },
    ...(input.history || []).slice(-12),
    { role: "user", content: input.prompt },
  ];

  logger.info("ai.orchestrate.start", { providers, promptLen: input.prompt.length });

  const responses = await Promise.all(
    providers.map(async (id) => {
      const connector = getConnector(id);
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

  const synthesis = synthesizeBestAnswer(input.prompt, responses);
  const latencyMs = Date.now() - started;

  logger.info("ai.orchestrate.done", {
    providers: providers.map((p) => PROVIDER_LABELS[p]),
    latencyMs,
    winners: synthesis.comparison.winners,
  });

  return {
    blocked: false,
    providers,
    responses,
    finalAnswer: synthesis.finalAnswer,
    comparison: synthesis.comparison,
    latencyMs,
  };
}
