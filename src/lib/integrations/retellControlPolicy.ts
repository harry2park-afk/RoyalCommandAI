// Royal Command — Retell Control Policy
// Shared governance layer for ChatGPT, Claude, Gemini and Grok.
// IMPORTANT: Retell secrets must never be committed to GitHub or exposed to browser/client code.

export const RETELL_CONTROL_POLICY = {
  provider: "RETELL" as const,
  architecture: "ROYAL_COMMAND_SERVER_SIDE_CONTROL_CENTER" as const,
  authorisedAIWorkers: ["CHATGPT", "CLAUDE", "GEMINI", "GROK"] as const,

  secretPolicy: {
    storage: "SERVER_ENVIRONMENT_ONLY" as const,
    environmentVariable: "RETELL_API_KEY" as const,
    neverCommitSecret: true,
    neverExposeToBrowser: true,
    neverShareSecretWithIndividualAIWorker: true,
  },

  // Safe discovery/audit operations can be performed without changing live service.
  readOperations: [
    "LIST_AGENTS",
    "GET_AGENT",
    "LIST_PHONE_NUMBERS",
    "GET_PHONE_NUMBER",
    "READ_AGENT_CONFIGURATION",
  ] as const,

  // Changes that can affect customers, live calls, routing or commercial policy
  // remain behind Harry's approval gate.
  approvalRequiredOperations: [
    "CREATE_AGENT",
    "UPDATE_AGENT",
    "DELETE_AGENT",
    "CHANGE_AGENT_IDENTITY",
    "CHANGE_AGENT_LANGUAGE",
    "CHANGE_PROMPT_OR_BEHAVIOUR",
    "CHANGE_PHONE_ASSIGNMENT",
    "CHANGE_SIP_OR_CALL_ROUTING",
    "CHANGE_PRICING_OR_COMMERCIAL_RULES",
  ] as const,

  languageAssistantRules: {
    preserveExistingFourUntilVerified: true,
    commonTemplate: "ELIZABETH_CUSTOMER_SERVICE_TEMPLATE" as const,
    assistantsNeverKnowOrQuotePrice: true,
    priceQuestionAction: "GUIDE_TO_QUOTE_FORM" as const,
    katieKevinRole: "ASSESS_DIFFICULTY_LEVEL_1_TO_30_AND_REASON_ONLY" as const,
    finalPriceAuthority: "HARRY_ONLY" as const,
  },

  auditRules: {
    logActorAI: true,
    logRequestedAction: true,
    logTargetResource: true,
    logApprovalState: true,
    logResult: true,
  },
} as const;

export type RetellReadOperation = typeof RETELL_CONTROL_POLICY.readOperations[number];
export type RetellApprovalRequiredOperation =
  typeof RETELL_CONTROL_POLICY.approvalRequiredOperations[number];
