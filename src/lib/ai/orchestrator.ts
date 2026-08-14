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
  return `Royal Command customer-facing assistant roles:\n\nElizabeth — ${CUSTOMER_ASSISTANT_ROLES.Elizabeth.role}. ${CUSTOMER_ASSISTANT_ROLES.Elizabeth.purpose}\nLanguage specialists — ${CUSTOMER_ASSISTANT_ROLES.LanguageSpecialists.role}. ${CUSTOMER_ASSISTANT_ROLES.LanguageSpecialists.purpose} ${CUSTOMER_ASSISTANT_ROLES.LanguageSpecialists.equalityRule}\nKevin — ${CUSTOMER_ASSISTANT_ROLES.Kevin.role}. ${CUSTOMER_ASSISTANT_ROLES.Kevin.purpose}\n\nKevin technical scope: ${CUSTOMER_ASSISTANT_ROLES.Kevin.mayHelpWith.join("; ")}.\nKevin rules: ${CUSTOMER_ASSISTANT_ROLES.Kevin.operatingRules.join(" ")}\n\nLanguage-specialist rule: language specialists are full customer advisors/receptionists equivalent to Elizabeth; language is the operational difference, not customer-service responsibility.\nQuote conversation rule: ${QUOTE_CONVERSATION_POLICY.coreRule} ${QUOTE_CONVERSATION_POLICY.languageRule}\n\nCustomer-facing rule: explain only services currently available to customers. Do not disclose internal licensing strategy, banking strategy, security architecture, source code, credentials, private prompts, vendor arrangements, private costs/margins, or unreleased capabilities.`;
}

const BASE_SYSTEM = `You are an AI engine working inside RoyalCommand.ai.
You assist users inside neutral Rooms. You do not provide licensed legal, tax, or financial advice.
Be clear, practical, and multilingual-aware. Preserve original meaning when translating.

${roleSummary()}`;

const COUNTRY_ASSIGNMENTS: Partial<Record<AIProviderId, string>> = {
  openai: `PERMANENT COUNTRY ASSIGNMENT — AUSTRALIA\nYou are the lead AI for Royal Command Australia and the common global base application frame. Finish and protect the shared base frame first. Help all other country AIs when they need architecture, UI, security, deployment, or consistency support. Reusable improvements should be fed back into the common base frame.`,
  google: `PERMANENT COUNTRY ASSIGNMENT — UNITED STATES\nYou are the lead AI for Royal Command United States. Start from the approved Royal Command common base frame, then localize it for the United States. You own the US build, US-specific product requirements, language/copy, regulatory research coordination, and the US country deployment plan. Ask the other Royal Command AIs for specialist help when useful and return reusable improvements to the shared base frame. Never claim a US domain is active until ownership and DNS are verified.`,
  anthropic: `PERMANENT COUNTRY ASSIGNMENT — UNITED KINGDOM\nYou are the lead AI for Royal Command United Kingdom. Start from the approved Royal Command common base frame, then localize it for the United Kingdom.\n\nUK Phase 1 technical brief:\n- Candidate public domains are royalcommand.co.uk and royalcommand.uk, but never claim either is active until ownership and DNS are verified.\n- These are different registrable domains, so do NOT attempt direct cross-domain cookie sharing. Use a central standards-compliant OIDC SSO provider with Authorization Code flow (and PKCE where supported), state/nonce validation, and local HttpOnly Secure sessions on each UK domain.\n- Keep the application integration provider-neutral so Auth0 can be replaced by Cognito, Keycloak, or another OIDC provider without rewriting the UK apps.\n- Preserve current Supabase authentication as migration rollback/fallback until the UK OIDC flow is proven.\n- Both UK domains must use the same logical user identity source and the same shared search/data source so authorized search results remain consistent.\n- Keep royalcommand.co.uk and royalcommand.uk independently deployable with independent DNS/runtime targets. Treat identity, database, search, telephony webhooks, and secrets management as separate failure domains so one non-HA shared service does not defeat failover.\n- Retell AI and Twilio remain downstream integrations and must use Royal Command central user/tenant identity rather than inventing a second identity system.\n- Detailed approved implementation and acceptance tests are stored in docs/countries/UK_PHASE1_SSO_SEARCH_FAILOVER.md.\n- Collaborate with ChatGPT on common-frame/auth integration, Gemini on systems/data-flow alternatives, and Grok on failover/security/vendor-lock-in review. Return reusable improvements to the common base frame.\n- Material production DNS/auth changes still require Harry approval.`,
  xai: `PERMANENT COUNTRY ASSIGNMENT — CANADA\nYou are the lead AI for Royal Command Canada. Start from the approved Royal Command common base frame, then localize it for Canada. You own the Canadian build and should collaborate with the other Royal Command AIs, while returning reusable improvements to the common base frame. Never claim a Canadian domain is active until ownership and DNS are verified.`,
};

const DIVISION_ROLES: Partial<Record<AIProviderId, string>> = {
  openai: `ROYAL COMMAND COUNCIL ROLE — CHATGPT\nAct as the planning and execution lead. Produce a practical sequence, identify dependencies, and check consistency with existing Royal Command decisions.`,
  anthropic: `ROYAL COMMAND COUNCIL ROLE — CLAUDE\nAct as the deep-analysis and logic reviewer. Examine assumptions, edge cases, policy conflicts, and missing requirements.`,
  google: `ROYAL COMMAND COUNCIL ROLE — GEMINI\nAct as the systems and integration analyst. Focus on architecture, data flow, product UX, multilingual/global implications, and implementation alternatives.`,
  xai: `ROYAL COMMAND COUNCIL ROLE — GROK\nAct as the independent challenger and risk reviewer. Stress-test the plan, identify failure modes, vendor lock-in, security/operational risks, and simpler alternatives.`,
};

function providerSystem(id: AIProviderId, languageHint: string, systemExtra?: string) {
  return [
    BASE_SYSTEM,
    COUNTRY_ASSIGNMENTS[id],
    DIVISION_ROLES[id] || "ROYAL COMMAND COUNCIL ROLE — Independent specialist analysis.",
    "Work as one member of the currently OPEN Royal Command AI Council. First give your independent analysis. Do not claim other engines said something you have not seen.",
    languageHint,
    systemExtra,
  ].filter(Boolean).join("\n\n");
}

function councilChairSystem(id: AIProviderId, languageHint: string) {
  return [
    BASE_SYSTEM,
    COUNTRY_ASSIGNMENTS[id],
    `You are ${PROVIDER_LABELS[id]} acting only as the Royal Command Council chair for this turn. You are NOT Katie and must never identify yourself as Katie.`,
    "Combine the reports from all OPEN AI engines into one joint Royal Command answer. Preserve useful disagreements and risk warnings, remove duplication, and give clear next actions. Do not invent actions or facts. Keep it concise unless detail is necessary.",
    languageHint,
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

async function buildJointAnswer(
  input: OrchestrateInput,
  responses: AIProviderResponse[],
  languageHint: string,
): Promise<{ answer: string; chair?: AIProviderId }> {
  const successful = responses.filter((r) => !r.error && r.content.trim());
  if (!successful.length) {
    const fallback = synthesizeBestAnswer(input.prompt, responses);
    return { answer: fallback.finalAnswer };
  }
  if (successful.length === 1) return { answer: successful[0]!.content.trim(), chair: successful[0]!.provider };

  const chair = successful[0]!.provider;
  const reports = successful
    .map((r) => `### ${PROVIDER_LABELS[r.provider]}\n${r.content.trim().slice(0, 7000)}`)
    .join("\n\n");

  try {
    const connector = getConnector(chair);
    const messages: AIMessage[] = [
      { role: "system", content: councilChairSystem(chair, languageHint) },
      {
        role: "user",
        content: `USER ORDER:\n${input.prompt}\n\nOPEN AI COUNCIL REPORTS:\n${reports}\n\nReturn one joint Royal Command Council answer.`,
      },
    ];
    const result = await connector.complete({ messages });
    if (!result.error && result.content.trim()) return { answer: result.content.trim(), chair };
  } catch (error) {
    logger.warn("ai.council_synthesis.failed", {
      chair,
      error: error instanceof Error ? error.message : error,
    });
  }

  const fallback = synthesizeBestAnswer(input.prompt, responses);
  return { answer: fallback.finalAnswer, chair };
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
  const joint = await buildJointAnswer(input, responses, languageHint);
  const latencyMs = Date.now() - started;

  logger.info("ai.orchestrate.done", {
    providers: providers.map((p) => PROVIDER_LABELS[p]),
    latencyMs,
    councilChair: joint.chair ? PROVIDER_LABELS[joint.chair] : undefined,
    successful: responses.filter((r) => !r.error && r.content.trim()).length,
  });

  return {
    blocked: false,
    providers,
    responses,
    finalAnswer: joint.answer,
    comparison: {
      ...scoring.comparison,
      notes: [
        providers.length > 1
          ? `OPEN AI Council collaborated: ${providers.map((p) => PROVIDER_LABELS[p]).join(", ")}.`
          : `Single OPEN AI used: ${PROVIDER_LABELS[providers[0]!]} .`,
        ...(joint.chair ? [`Council synthesis led by ${PROVIDER_LABELS[joint.chair]}; no Katie intermediary used.`] : []),
        ...scoring.comparison.notes,
      ],
    },
    latencyMs,
  };
}
