import { GLOBAL_LANGUAGE_ASSISTANTS } from "./languageAssistantFactory";

export type ProductionStatus =
  | "EXISTING_VERIFIED"
  | "READY_FOR_RETELL_CLONE"
  | "RETELL_CREATED"
  | "PHONE_ASSIGNED"
  | "TESTED"
  | "ACTIVE";

export type ExistingLanguageAssistantSlot = {
  slotId: string;
  source: "EXISTING_RETELL_ASSISTANT";
  preserveExistingIdentity: true;
  preserveExistingPhoneRouting: true;
  status: "EXISTING_VERIFIED";
  verifiedName: string;
  verifiedLanguages: readonly string[];
  retellAgentId: string;
  retellLlmId: string;
  phoneNumber?: string;
  phoneRoutingStatus: "NOT_YET_API_VERIFIED";
};

// Verified directly from the live Retell API on 2026-08-11.
// Identity, language and IDs are now bound to the Factory registry.
// Phone/SIP mappings remain untouched until separately read from the live telephony configuration.
export const EXISTING_LANGUAGE_ASSISTANTS: readonly ExistingLanguageAssistantSlot[] = [
  {
    slotId: "EXISTING-LANG-01",
    source: "EXISTING_RETELL_ASSISTANT",
    preserveExistingIdentity: true,
    preserveExistingPhoneRouting: true,
    status: "EXISTING_VERIFIED",
    verifiedName: "Elizabeth",
    verifiedLanguages: ["en-US"],
    retellAgentId: "agent_5dd13e8a9738c04a4e504f920e",
    retellLlmId: "llm_69fe7d366be878c1a971c48c78aa",
    phoneRoutingStatus: "NOT_YET_API_VERIFIED",
  },
  {
    slotId: "EXISTING-LANG-02",
    source: "EXISTING_RETELL_ASSISTANT",
    preserveExistingIdentity: true,
    preserveExistingPhoneRouting: true,
    status: "EXISTING_VERIFIED",
    verifiedName: "Claire",
    verifiedLanguages: ["fr-FR"],
    retellAgentId: "agent_5868ef59e692a44eece4d90bd7",
    retellLlmId: "llm_0eb2747f032453be3d728ed4eb91",
    phoneRoutingStatus: "NOT_YET_API_VERIFIED",
  },
  {
    slotId: "EXISTING-LANG-03",
    source: "EXISTING_RETELL_ASSISTANT",
    preserveExistingIdentity: true,
    preserveExistingPhoneRouting: true,
    status: "EXISTING_VERIFIED",
    verifiedName: "Mei",
    verifiedLanguages: ["zh-CN"],
    retellAgentId: "agent_07ca3ea0388c00b8a33e273e95",
    retellLlmId: "llm_96434bcacb65c8f522592d859418",
    phoneRoutingStatus: "NOT_YET_API_VERIFIED",
  },
  {
    slotId: "EXISTING-LANG-04",
    source: "EXISTING_RETELL_ASSISTANT",
    preserveExistingIdentity: true,
    preserveExistingPhoneRouting: true,
    status: "EXISTING_VERIFIED",
    verifiedName: "Yuki",
    verifiedLanguages: ["ja-JP"],
    retellAgentId: "agent_c98911c6a9304aa67e65dee208",
    retellLlmId: "llm_2e564251b19f53e027cddecf6eae",
    phoneRoutingStatus: "NOT_YET_API_VERIFIED",
  },
] as const;

export const LANGUAGE_ASSISTANT_PRODUCTION_QUEUE = GLOBAL_LANGUAGE_ASSISTANTS.map((assistant) => ({
  ...assistant,
  status: "READY_FOR_RETELL_CLONE" as const,
  productionMethod: "CLONE_ELIZABETH_CUSTOMER_SERVICE_TEMPLATE" as const,
  requires: [
    "Retell agent creation or clone",
    "assigned language prompt/voice configuration",
    "phone/SIP assignment when required",
    "inbound routing test",
    "quote-form guidance test",
    "money-firewall test",
    "customer handoff test",
  ] as const,
}));

export const LANGUAGE_ASSISTANT_PRODUCTION_POLICY = {
  firstAction:
    "The four existing live language assistants have been verified by live Retell API for identity, language, agent ID and LLM ID. Preserve them.",
  secondAction:
    "Use the approved Elizabeth-equivalent Retell template as the production master for additional language assistants.",
  cloneRule:
    "Clone customer-service behaviour and safety rules; change only identity, assigned languages, voice and routing configuration unless another difference is explicitly approved.",
  existingRule:
    "Existing assistants are migrated into this registry in place. Do not delete and recreate them merely to fit the factory.",
  activationRule:
    "A produced assistant is not ACTIVE until inbound routing, language response, quotation-form guidance, commercial money firewall and handoff are tested.",
  truthRule:
    "Code readiness is not the same as a live Retell agent. Never report a desk as live until its Retell creation and routing have been verified.",
} as const;

export const TOTAL_PLANNED_LANGUAGE_CAPACITY = {
  existingSlots: EXISTING_LANGUAGE_ASSISTANTS.length,
  factoryDesks: LANGUAGE_ASSISTANT_PRODUCTION_QUEUE.length,
  totalAssistantSlots: EXISTING_LANGUAGE_ASSISTANTS.length + LANGUAGE_ASSISTANT_PRODUCTION_QUEUE.length,
} as const;
