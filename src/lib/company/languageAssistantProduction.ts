import { GLOBAL_LANGUAGE_ASSISTANTS } from "./languageAssistantFactory";

export type ProductionStatus =
  | "EXISTING_VERIFY_REQUIRED"
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
  status: "EXISTING_VERIFY_REQUIRED";
  verifiedName?: string;
  verifiedLanguages?: readonly string[];
  retellAgentId?: string;
  phoneNumber?: string;
};

// These four slots represent the four language assistants already in service.
// Their actual names, languages, Retell IDs and phone routing must be read from the live
// Retell/telephony configuration before any replacement, rename or reassignment.
export const EXISTING_LANGUAGE_ASSISTANTS: readonly ExistingLanguageAssistantSlot[] = [
  { slotId: "EXISTING-LANG-01", source: "EXISTING_RETELL_ASSISTANT", preserveExistingIdentity: true, preserveExistingPhoneRouting: true, status: "EXISTING_VERIFY_REQUIRED" },
  { slotId: "EXISTING-LANG-02", source: "EXISTING_RETELL_ASSISTANT", preserveExistingIdentity: true, preserveExistingPhoneRouting: true, status: "EXISTING_VERIFY_REQUIRED" },
  { slotId: "EXISTING-LANG-03", source: "EXISTING_RETELL_ASSISTANT", preserveExistingIdentity: true, preserveExistingPhoneRouting: true, status: "EXISTING_VERIFY_REQUIRED" },
  { slotId: "EXISTING-LANG-04", source: "EXISTING_RETELL_ASSISTANT", preserveExistingIdentity: true, preserveExistingPhoneRouting: true, status: "EXISTING_VERIFY_REQUIRED" },
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
    "Verify the four existing live language assistants before touching their identity, language assignment, Retell agent ID or phone routing.",
  secondAction:
    "Use one approved Elizabeth-equivalent Retell template as the production master for additional language assistants.",
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
