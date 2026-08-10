import { GLOBAL_LANGUAGE_DESKS } from "./languageAssistantFactory";

export type RetellProvisioningStatus =
  | "EXISTING_VERIFY_FIRST"
  | "READY_FOR_TEMPLATE"
  | "READY_FOR_CLONE"
  | "NEEDS_RETELL_AGENT_ID"
  | "NEEDS_PHONE_MAPPING"
  | "TEST_REQUIRED"
  | "ACTIVE";

export type RetellLanguageAssistantProvisioning = {
  slotId: string;
  source: "EXISTING" | "NEW_FACTORY";
  displayName: string;
  languages: readonly string[];
  retellAgentId?: string;
  phoneNumber?: string;
  status: RetellProvisioningStatus;
  lockedUntilVerified: boolean;
  notes: string;
};

// The four existing language assistants must be discovered from the real Retell account.
// Never guess or overwrite their names, languages, Agent IDs, voices or phone mappings.
export const EXISTING_LANGUAGE_ASSISTANT_SLOTS: RetellLanguageAssistantProvisioning[] = [
  {
    slotId: "EXISTING-LANG-01",
    source: "EXISTING",
    displayName: "Existing Language Assistant 01 — VERIFY IN RETELL",
    languages: [],
    status: "EXISTING_VERIFY_FIRST",
    lockedUntilVerified: true,
    notes: "Preserve current Retell configuration until name, languages, Agent ID, voice and phone mapping are verified from the real account.",
  },
  {
    slotId: "EXISTING-LANG-02",
    source: "EXISTING",
    displayName: "Existing Language Assistant 02 — VERIFY IN RETELL",
    languages: [],
    status: "EXISTING_VERIFY_FIRST",
    lockedUntilVerified: true,
    notes: "Preserve current Retell configuration until name, languages, Agent ID, voice and phone mapping are verified from the real account.",
  },
  {
    slotId: "EXISTING-LANG-03",
    source: "EXISTING",
    displayName: "Existing Language Assistant 03 — VERIFY IN RETELL",
    languages: [],
    status: "EXISTING_VERIFY_FIRST",
    lockedUntilVerified: true,
    notes: "Preserve current Retell configuration until name, languages, Agent ID, voice and phone mapping are verified from the real account.",
  },
  {
    slotId: "EXISTING-LANG-04",
    source: "EXISTING",
    displayName: "Existing Language Assistant 04 — VERIFY IN RETELL",
    languages: [],
    status: "EXISTING_VERIFY_FIRST",
    lockedUntilVerified: true,
    notes: "Preserve current Retell configuration until name, languages, Agent ID, voice and phone mapping are verified from the real account.",
  },
];

export const NEW_LANGUAGE_ASSISTANT_QUEUE: RetellLanguageAssistantProvisioning[] =
  GLOBAL_LANGUAGE_DESKS.map((desk) => ({
    slotId: desk.id,
    source: "NEW_FACTORY" as const,
    displayName: desk.displayName,
    languages: desk.languages,
    status: "READY_FOR_TEMPLATE" as const,
    lockedUntilVerified: false,
    notes: "Clone only from the approved Elizabeth-equivalent Retell template. Apply assigned languages, then map Agent ID and phone number and pass tests before activation.",
  }));

export const RETELL_LANGUAGE_PRODUCTION_POLICY = {
  totalPlannedSlots: EXISTING_LANGUAGE_ASSISTANT_SLOTS.length + NEW_LANGUAGE_ASSISTANT_QUEUE.length,
  existingSlots: EXISTING_LANGUAGE_ASSISTANT_SLOTS.length,
  newFactorySlots: NEW_LANGUAGE_ASSISTANT_QUEUE.length,
  goldenTemplate:
    "One approved Elizabeth-equivalent Retell customer-advisor/receptionist template is the source for all new language assistants.",
  existingProtectionRule:
    "Existing four language assistants are read/verify first. Never rename, delete, recreate, reassign voice, change prompt, change language, change Retell Agent ID or change phone mapping until their real current configuration is verified.",
  cloneRule:
    "New language assistants inherit Elizabeth customer-service behavior, quote-form guidance, commercial money firewall, privacy, escalation and handoff rules. Only language assignment, voice and approved routing differ.",
  activationRule:
    "No assistant becomes ACTIVE until Retell Agent ID, assigned language behavior, phone routing, quote-form guidance, price firewall, transfer/handoff and live test results are all verified.",
  testChecklist: [
    "Correct language greeting and conversation",
    "Elizabeth-equivalent customer-service behavior",
    "Quote-form guidance works naturally",
    "No price, fee, rate, discount or monetary amount is revealed or sent",
    "Correct transfer/handoff behavior",
    "Correct Retell Agent ID",
    "Correct phone-number mapping",
    "Inbound call test passes",
    "Outbound/transfer test passes when enabled",
  ],
} as const;
