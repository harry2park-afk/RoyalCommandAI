export const GLOBAL_SERVICE_FRAMEWORK_VERSION = "1.1" as const;

export const GLOBAL_SERVICE_CATEGORIES = [
  "ai",
  "secretary",
  "communication",
  "professional",
  "accounting",
  "legal",
  "files",
  "education",
  "business",
  "mail",
  "website",
  "maintenance",
  "media",
  "music",
  "sports",
  "travel",
  "marketplace",
] as const;

export type GlobalServiceCategory = (typeof GLOBAL_SERVICE_CATEGORIES)[number];

export const COMMERCIAL_MODEL_PRIORITY = [
  "wholesale",
  "rc_resale",
  "commission",
  "referral",
  "custom_quote",
] as const;

export type CountryPackContract = {
  countryCode: string;
  currencies: string[];
  defaultCurrency: string;
  languages: string[];
  serviceAvailability: Record<string, "available" | "restricted" | "unavailable" | "research">;
  providerOverrides: Record<string, string[]>;
  regulatoryFlags: string[];
  taxProfile?: string;
  paymentProfile?: string;
  telecomProfile?: string;
  recordingPolicyProfile?: string;
  privacyProfile?: string;
};

export const GLOBAL_DELIVERY_RULES = [
  "One Global Core serves every country; country-specific differences live in Country Packs or country terms.",
  "Customers choose the capability they want; Royal Command chooses and manages the supplier connection behind the scenes.",
  "Prefer approved wholesale, resale, API and OAuth supplier arrangements that Royal Command can operate for the customer.",
  "If Royal Command cannot provide a suitable connection, handle any customer-direct supplier proposal separately rather than making it a normal Room choice.",
  "Never assume a discount, margin, commission, API capability or country availability before supplier terms are verified.",
  "Keep supplier cost, RC margin, commission and internal supplier-selection logic server-side only.",
  "Keep country, language and currency independently configurable.",
  "A supplier can be replaced without changing the customer-facing Room workflow.",
  "Build RC-native functionality only when no suitable supplier exists or the capability is strategically core to Royal Command.",
] as const;

export const MARKETPLACE_SAFETY_RULES = [
  "Royal Command provides listing, discovery, communication and safety controls; it is not automatically the buyer, seller, escrow provider, shipper or product guarantor.",
  "Provide an urgent report path on listings and conversations.",
  "A credible urgent report can temporarily restrict Marketplace selling or listing visibility while it is reviewed.",
  "Repeated or verified abuse can lead to Marketplace suspension or broader account action.",
  "Preserve report, listing, edit, verification and moderation evidence for review and lawful requests.",
  "Do not disclose another member's private contact information merely because a dispute exists; use controlled communication and lawful disclosure processes.",
] as const;

export const MUSIC_ROOM_CAPABILITIES = [
  "licensed or user-provided sheet music",
  "score-follow cursor or bar",
  "instrument practice",
  "tempo control",
  "key or transposition support where licensed and technically supported",
  "loop practice",
  "metronome",
  "karaoke or backing-track mode",
  "timed lyric highlighting where licensed",
  "recording and playback",
  "practice history and AI-assisted feedback",
  "external music provider integration through RC when suitable",
] as const;

export const GLOBAL_LAUNCH_PRINCIPLE = {
  core: "single_global_core",
  countryLayer: "country_pack",
  providerLayer: "country_aware_provider_registry",
  commercialLayer: "country_aware_supplier_terms",
  customerExperience: "capability_only_supplier_hidden",
} as const;
