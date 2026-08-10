import { CUSTOMER_ASSISTANT_ROLES } from "./assistantRoles";

export type LanguageAssistantDefinition = {
  id: string;
  displayName: string;
  languages: readonly string[];
  role: typeof CUSTOMER_ASSISTANT_ROLES.Elizabeth.role;
  purpose: typeof CUSTOMER_ASSISTANT_ROLES.Elizabeth.purpose;
  customerServiceEquivalentTo: "Elizabeth";
  pricingConversation: "QUOTE_FORM_GUIDANCE_ONLY";
  monetaryAccess: false;
};

export type ExistingLanguageAssistantRegistration = {
  existingAssistantId: string;
  existingDisplayName: string;
  existingLanguages: readonly string[];
};

// These desks provide broad global language coverage. They are templates/capacity
// definitions and do not replace or rename the four language assistants already in use.
export const GLOBAL_LANGUAGE_DESKS = [
  { id: "LANG-001", displayName: "Global Desk 01", languages: ["English", "Korean"] },
  { id: "LANG-002", displayName: "Global Desk 02", languages: ["Mandarin Chinese", "Cantonese", "Taiwanese Mandarin"] },
  { id: "LANG-003", displayName: "Global Desk 03", languages: ["Japanese", "Vietnamese", "Thai", "Lao", "Khmer"] },
  { id: "LANG-004", displayName: "Global Desk 04", languages: ["Tagalog / Filipino", "Cebuano", "Indonesian", "Malay"] },
  { id: "LANG-005", displayName: "Global Desk 05", languages: ["Hindi", "Urdu", "Punjabi", "Gujarati", "Marathi"] },
  { id: "LANG-006", displayName: "Global Desk 06", languages: ["Bengali", "Nepali", "Sinhala", "Tamil", "Telugu"] },
  { id: "LANG-007", displayName: "Global Desk 07", languages: ["Kannada", "Malayalam", "Odia", "Assamese"] },
  { id: "LANG-008", displayName: "Global Desk 08", languages: ["Arabic", "Persian / Farsi", "Dari", "Pashto", "Kurdish"] },
  { id: "LANG-009", displayName: "Global Desk 09", languages: ["Hebrew", "Turkish", "Azerbaijani", "Armenian", "Georgian"] },
  { id: "LANG-010", displayName: "Global Desk 10", languages: ["Spanish", "Portuguese", "Catalan", "Galician"] },
  { id: "LANG-011", displayName: "Global Desk 11", languages: ["French", "Italian", "Romanian", "Moldovan"] },
  { id: "LANG-012", displayName: "Global Desk 12", languages: ["German", "Dutch", "Afrikaans", "Luxembourgish"] },
  { id: "LANG-013", displayName: "Global Desk 13", languages: ["Swedish", "Norwegian", "Danish", "Icelandic", "Finnish"] },
  { id: "LANG-014", displayName: "Global Desk 14", languages: ["Polish", "Czech", "Slovak", "Slovenian", "Croatian"] },
  { id: "LANG-015", displayName: "Global Desk 15", languages: ["Serbian", "Bosnian", "Montenegrin", "Macedonian", "Albanian"] },
  { id: "LANG-016", displayName: "Global Desk 16", languages: ["Russian", "Ukrainian", "Belarusian", "Bulgarian"] },
  { id: "LANG-017", displayName: "Global Desk 17", languages: ["Greek", "Hungarian", "Estonian", "Latvian", "Lithuanian"] },
  { id: "LANG-018", displayName: "Global Desk 18", languages: ["Swahili", "Amharic", "Somali", "Oromo", "Tigrinya"] },
  { id: "LANG-019", displayName: "Global Desk 19", languages: ["Hausa", "Yoruba", "Igbo", "Wolof", "Fula"] },
  { id: "LANG-020", displayName: "Global Desk 20", languages: ["Zulu", "Xhosa", "Sesotho", "Setswana", "Shona"] },
  { id: "LANG-021", displayName: "Global Desk 21", languages: ["Kazakh", "Uzbek", "Kyrgyz", "Turkmen", "Tajik"] },
  { id: "LANG-022", displayName: "Global Desk 22", languages: ["Mongolian", "Burmese", "Tibetan", "Dzongkha"] },
  { id: "LANG-023", displayName: "Global Desk 23", languages: ["Haitian Creole", "Papiamento", "Jamaican Patois", "Quechua", "Guarani"] },
  { id: "LANG-024", displayName: "Global Desk 24", languages: ["Samoan", "Tongan", "Fijian", "Māori", "Hawaiian", "Tok Pisin"] },
] as const;

export function createLanguageAssistant(
  desk: (typeof GLOBAL_LANGUAGE_DESKS)[number],
): LanguageAssistantDefinition {
  return {
    id: desk.id,
    displayName: desk.displayName,
    languages: desk.languages,
    role: CUSTOMER_ASSISTANT_ROLES.Elizabeth.role,
    purpose: CUSTOMER_ASSISTANT_ROLES.Elizabeth.purpose,
    customerServiceEquivalentTo: "Elizabeth",
    pricingConversation: "QUOTE_FORM_GUIDANCE_ONLY",
    monetaryAccess: false,
  };
}

export function adoptExistingLanguageAssistant(
  existing: ExistingLanguageAssistantRegistration,
): LanguageAssistantDefinition {
  return {
    id: existing.existingAssistantId,
    displayName: existing.existingDisplayName,
    languages: existing.existingLanguages,
    role: CUSTOMER_ASSISTANT_ROLES.Elizabeth.role,
    purpose: CUSTOMER_ASSISTANT_ROLES.Elizabeth.purpose,
    customerServiceEquivalentTo: "Elizabeth",
    pricingConversation: "QUOTE_FORM_GUIDANCE_ONLY",
    monetaryAccess: false,
  };
}

export const GLOBAL_LANGUAGE_ASSISTANTS = GLOBAL_LANGUAGE_DESKS.map(createLanguageAssistant);

export function findLanguageAssistant(language: string) {
  const normalized = language.trim().toLowerCase();
  return GLOBAL_LANGUAGE_ASSISTANTS.find((assistant) =>
    assistant.languages.some((item) => item.toLowerCase() === normalized),
  );
}

export const EXISTING_FOUR_LANGUAGE_ASSISTANTS_POLICY = {
  count: 4,
  status: "PRESERVE_AND_ADOPT",
  rule:
    "The four language assistants already configured by Royal Command are part of this Language Assistant Factory. Preserve each existing assistant's current identity, voice/telephony assignment and language assignment unless Harry separately approves a change. Apply the Elizabeth-equivalent customer-service role, quotation-form guidance, commercial money firewall and escalation standards to all four.",
  noReplacementRule:
    "Do not delete, rename, overwrite or replace the existing four assistants merely to fit a new Global Desk number. Register/adopt them into the factory and use new desks only for additional language coverage.",
  sourceOfTruthRule:
    "Do not guess the existing four assistants' names, phone mappings or exact language assignments. Read them from the current approved/live assistant or telephony configuration before binding them to factory records.",
} as const;

export const LANGUAGE_ASSISTANT_FACTORY_POLICY = {
  baseRole: "Elizabeth",
  rule:
    "Every language assistant is a full Customer Advisor & Receptionist equivalent to Elizabeth. Language assignment is the only service-role difference.",
  quoteRule:
    "Every language assistant follows the Royal Command quotation-form conversation policy and has zero monetary pricing access.",
  expansionRule:
    "Add or split language desks by editing GLOBAL_LANGUAGE_DESKS; do not duplicate customer-service logic in separate assistant implementations.",
  existingAssistantRule:
    "The four existing language assistants must be adopted into this factory and retained; future assistants are added around them rather than replacing them.",
  fallbackRule:
    "If a customer's language is not mapped, route to the closest supported language desk or a general multilingual fallback without inventing a language capability.",
} as const;
