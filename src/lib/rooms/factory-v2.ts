import { ROOM_MATERIALS } from "./materials";
import { ROOM_TEMPLATES } from "./templates";

export type RoomSafetyTier = "standard" | "regulated" | "high-risk";
export type ConnectorAvailability = "available" | "country-dependent" | "planned";
export type ConversationState =
  | "welcome"
  | "orient"
  | "listen"
  | "solve-with-current"
  | "suggest"
  | "gate"
  | "approval"
  | "execute"
  | "summarize";

export type CapabilityBundleId =
  | "office"
  | "documents"
  | "research"
  | "finance-data"
  | "customer-service"
  | "booking"
  | "commerce"
  | "project"
  | "design"
  | "technical"
  | "learning"
  | "operations"
  | "regulated-intake"
  | "space-data";

export type RoomConnectorId =
  | "email-send"
  | "calendar"
  | "crm"
  | "phone"
  | "sms"
  | "esign"
  | "accounting-software"
  | "bank-feed"
  | "payment"
  | "pos"
  | "booking-platform"
  | "delivery-platform"
  | "legal-practice-software"
  | "cad-bim"
  | "3d-rendering"
  | "github"
  | "vercel"
  | "database"
  | "satellite-provider"
  | "earth-observation-provider"
  | "human-expert";

export type CapabilityBundle = {
  id: CapabilityBundleId;
  label: string;
  outcomes: string[];
  materialIds: string[];
};

export type ConnectorDefinition = {
  id: RoomConnectorId;
  label: string;
  reason: string;
  availability: ConnectorAvailability;
  paidOrExternal: true;
  defaultEnabled: false;
  approvalRequired: true;
  materialId?: string;
};

export type DomainProfile = {
  templateId: string;
  roomLabel: string;
  bundles: CapabilityBundleId[];
  starters: string[];
  optionalConnectors: RoomConnectorId[];
  safetyTier: RoomSafetyTier;
  adviceBoundary?: string;
};

export const GLOBAL_CORE_MATERIAL_IDS = [
  "data-isolation",
  "room-identity",
  "room-history",
  "primary-ai",
  "room-memory",
  "document-reader",
  "web-search",
  "owner-role",
  "human-approval",
  "preview",
] as const;

export const CONVERSATION_STATE_MACHINE: ReadonlyArray<{
  state: ConversationState;
  purpose: string;
}> = [
  { state: "welcome", purpose: "Warm welcome. Reassure the customer that the Room is ready and they can ask anything." },
  { state: "orient", purpose: "Explain in a few lines what the Room can already do without asking for setup work." },
  { state: "listen", purpose: "Let the customer describe what they need in their own words." },
  { state: "solve-with-current", purpose: "Use current Core and Bundle capabilities before suggesting anything new." },
  { state: "suggest", purpose: "Suggest at most two useful next options, never a catalogue dump." },
  { state: "gate", purpose: "Check country, policy, capability, permissions, plan, risk and cost." },
  { state: "approval", purpose: "For paid/external/high-risk actions, show a host-owned approval card and obtain explicit consent." },
  { state: "execute", purpose: "Execute only within the approved scope and single write authority." },
  { state: "summarize", purpose: "Explain the result, evidence and the simplest next step." },
];

export const CONVERSATION_RULES = {
  maxSuggestionsPerTurn: 2,
  maxConsecutiveQuestions: 1,
  rejectedSuggestionCooldownTurns: 6,
  solveOrder: [
    "current-capability",
    "same-core-workaround",
    "free-alternative",
    "existing-connector",
    "new-capability",
    "human-or-specialist",
  ] as const,
  neverTreatCasualYesAsPaidConsent: true,
  noUpsellWithoutObservedNeed: true,
} as const;

export const CAPABILITY_BUNDLES: Record<CapabilityBundleId, CapabilityBundle> = {
  office: {
    id: "office",
    label: "Office Work",
    outcomes: ["draft messages", "organise routine work", "prepare schedules", "summarise business information"],
    materialIds: ["email-draft", "calendar", "spreadsheet"],
  },
  documents: {
    id: "documents",
    label: "Documents & Files",
    outcomes: ["read documents", "summarise files", "prepare drafts", "organise evidence and records"],
    materialIds: ["document-reader"],
  },
  research: {
    id: "research",
    label: "Research & Knowledge",
    outcomes: ["research current public information", "compare options", "prepare source-aware summaries"],
    materialIds: ["web-search", "document-reader"],
  },
  "finance-data": {
    id: "finance-data",
    label: "Finance & Structured Data",
    outcomes: ["organise receipts and records", "work with tables", "prepare calculations", "draft finance summaries"],
    materialIds: ["spreadsheet", "document-reader"],
  },
  "customer-service": {
    id: "customer-service",
    label: "Customer Service",
    outcomes: ["prepare customer replies", "organise enquiries", "draft follow-up", "track customer needs"],
    materialIds: ["email-draft", "crm"],
  },
  booking: {
    id: "booking",
    label: "Booking & Scheduling",
    outcomes: ["prepare appointment options", "organise schedules", "draft reminders", "coordinate availability"],
    materialIds: ["calendar", "email-draft"],
  },
  commerce: {
    id: "commerce",
    label: "Sales & Commerce",
    outcomes: ["prepare product information", "organise orders", "draft quotes", "track sales requests"],
    materialIds: ["spreadsheet", "crm", "email-draft"],
  },
  project: {
    id: "project",
    label: "Project Work",
    outcomes: ["plan tasks", "organise project documents", "prepare checklists", "track next steps"],
    materialIds: ["document-reader", "calendar", "spreadsheet"],
  },
  design: {
    id: "design",
    label: "Design Support",
    outcomes: ["prepare design briefs", "analyse references", "organise drawing requirements", "prepare presentation notes"],
    materialIds: ["document-reader", "web-search"],
  },
  technical: {
    id: "technical",
    label: "Technical Support",
    outcomes: ["troubleshoot", "prepare technical instructions", "review technical documents", "plan implementation"],
    materialIds: ["document-reader", "web-search"],
  },
  learning: {
    id: "learning",
    label: "Learning & Training",
    outcomes: ["explain concepts", "prepare lessons", "create study plans", "review learning material"],
    materialIds: ["document-reader", "web-search", "calendar"],
  },
  operations: {
    id: "operations",
    label: "Operations",
    outcomes: ["prepare procedures", "organise work records", "track tasks", "draft operational reports"],
    materialIds: ["spreadsheet", "document-reader", "calendar"],
  },
  "regulated-intake": {
    id: "regulated-intake",
    label: "Regulated Intake",
    outcomes: ["organise customer facts", "prepare document checklists", "separate information from professional advice", "prepare hand-off packs"],
    materialIds: ["document-reader", "human-approval", "external-send-approval"],
  },
  "space-data": {
    id: "space-data",
    label: "Space & Geospatial Data",
    outcomes: ["research providers", "organise satellite requirements", "prepare mapping briefs", "compare data sources"],
    materialIds: ["web-search", "document-reader", "spreadsheet"],
  },
};

export const CONNECTOR_REGISTRY: Record<RoomConnectorId, ConnectorDefinition> = {
  "email-send": { id: "email-send", label: "External Email Send", reason: "Send messages outside the Room", availability: "available", paidOrExternal: true, defaultEnabled: false, approvalRequired: true, materialId: "email-send" },
  calendar: { id: "calendar", label: "External Calendar", reason: "Read or create events in an external calendar", availability: "available", paidOrExternal: true, defaultEnabled: false, approvalRequired: true, materialId: "calendar" },
  crm: { id: "crm", label: "CRM", reason: "Work with live customer relationship data", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true, materialId: "crm" },
  phone: { id: "phone", label: "Phone", reason: "Handle live voice calls", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true, materialId: "phone" },
  sms: { id: "sms", label: "SMS", reason: "Send or receive live SMS", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true, materialId: "sms" },
  esign: { id: "esign", label: "E-signature", reason: "Send documents for electronic signature", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true, materialId: "esign" },
  "accounting-software": { id: "accounting-software", label: "Accounting Software", reason: "Synchronise with Xero, MYOB, QuickBooks or another supported accounting system", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  "bank-feed": { id: "bank-feed", label: "Bank Feed", reason: "Use live bank transaction data", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  payment: { id: "payment", label: "Payments", reason: "Take or manage real payments", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  pos: { id: "pos", label: "POS", reason: "Synchronise live point-of-sale orders and transactions", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  "booking-platform": { id: "booking-platform", label: "Booking Platform", reason: "Synchronise live external bookings", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  "delivery-platform": { id: "delivery-platform", label: "Delivery Platform", reason: "Synchronise live delivery orders and tracking", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  "legal-practice-software": { id: "legal-practice-software", label: "Legal Practice Software", reason: "Synchronise supported legal matter and practice data", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  "cad-bim": { id: "cad-bim", label: "CAD / BIM", reason: "Use native architectural or engineering design systems", availability: "planned", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  "3d-rendering": { id: "3d-rendering", label: "3D Rendering", reason: "Use specialist rendering engines or services", availability: "planned", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  github: { id: "github", label: "GitHub", reason: "Read or change connected software repositories", availability: "available", paidOrExternal: true, defaultEnabled: false, approvalRequired: true, materialId: "github" },
  vercel: { id: "vercel", label: "Vercel", reason: "Deploy or manage connected websites", availability: "available", paidOrExternal: true, defaultEnabled: false, approvalRequired: true, materialId: "vercel" },
  database: { id: "database", label: "External Database", reason: "Read or write live external records", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  "satellite-provider": { id: "satellite-provider", label: "Satellite Provider", reason: "Use live satellite connectivity or provider services", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  "earth-observation-provider": { id: "earth-observation-provider", label: "Earth Observation Provider", reason: "Purchase or retrieve live satellite imagery or geospatial datasets", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
  "human-expert": { id: "human-expert", label: "Human Expert", reason: "Bring an authorised professional or specialist into the workflow", availability: "country-dependent", paidOrExternal: true, defaultEnabled: false, approvalRequired: true },
};

const D = (
  templateId: string,
  roomLabel: string,
  bundles: CapabilityBundleId[],
  starters: string[],
  optionalConnectors: RoomConnectorId[],
  safetyTier: RoomSafetyTier = "standard",
  adviceBoundary?: string,
): DomainProfile => ({ templateId, roomLabel, bundles, starters, optionalConnectors, safetyTier, adviceBoundary });

export const DOMAIN_PROFILES: Record<string, DomainProfile> = {
  medical: D("medical", "Medical Room", ["documents", "customer-service", "booking", "regulated-intake"], ["Prepare for a patient enquiry", "Organise documents", "Help me understand my next step"], ["booking-platform", "phone", "sms", "human-expert"], "high-risk", "AI may organise information and prepare questions or drafts, but diagnosis, treatment and clinical decisions require an appropriately qualified professional."),
  legal: D("legal", "Legal Room", ["documents", "research", "project", "regulated-intake"], ["Organise my matter", "Prepare a document draft", "Help me prepare for a lawyer"], ["legal-practice-software", "esign", "email-send", "human-expert"], "regulated", "AI may organise facts, research, documents and drafts; professional legal advice and representation require an authorised legal professional where applicable."),
  accounting: D("accounting", "Accounting Room", ["office", "documents", "finance-data", "regulated-intake"], ["Organise receipts", "Prepare tax records", "Create a monthly summary"], ["accounting-software", "bank-feed", "email-send", "human-expert"], "regulated", "AI may organise records, calculations and drafts; regulated tax or accounting advice may require a qualified professional depending on jurisdiction."),
  finance: D("finance", "Finance Room", ["documents", "finance-data", "research", "regulated-intake"], ["Compare finance options", "Organise my documents", "Prepare questions for an adviser"], ["bank-feed", "payment", "human-expert"], "high-risk", "AI may provide general information and organise documents; regulated financial advice, lending decisions and financial product recommendations require applicable licensed processes."),
  business: D("business", "Business Room", ["office", "customer-service", "project", "operations"], ["Help me with today’s work", "Improve customer follow-up", "Plan my next business task"], ["crm", "phone", "sms", "email-send", "payment" ]),
  realestate: D("realestate", "Real Estate Room", ["customer-service", "booking", "documents", "commerce"], ["Prepare a property enquiry", "Organise inspections", "Draft follow-up"], ["crm", "booking-platform", "phone", "sms", "esign"]),
  propertymanagement: D("propertymanagement", "Property Management Room", ["customer-service", "booking", "documents", "operations"], ["Organise maintenance", "Prepare tenant follow-up", "Review an inspection task"], ["crm", "booking-platform", "phone", "sms", "email-send"]),
  construction: D("construction", "Construction Room", ["project", "operations", "documents", "commerce"], ["Prepare a quote", "Plan the next job", "Organise project documents"], ["crm", "phone", "sms", "database"]),
  buildingmaterials: D("buildingmaterials", "Building Materials Room", ["commerce", "operations", "customer-service"], ["Prepare a quote", "Find the right product", "Organise an order"], ["crm", "database", "delivery-platform", "payment"]),
  hardware: D("hardware", "Hardware Room", ["commerce", "customer-service", "operations"], ["Find a product", "Prepare an order", "Help a customer"], ["pos", "database", "payment", "delivery-platform"]),
  architecture: D("architecture", "Architecture Room", ["design", "documents", "project", "research"], ["Start a design brief", "Review reference material", "Plan a drawing package"], ["cad-bim", "3d-rendering", "human-expert"]),
  retail: D("retail", "Retail Room", ["commerce", "customer-service", "operations"], ["Help a customer", "Prepare product information", "Organise an order"], ["pos", "payment", "delivery-platform", "crm"]),
  homeshopping: D("homeshopping", "Home Shopping Room", ["commerce", "customer-service", "operations"], ["Prepare a product presentation", "Organise orders", "Draft customer follow-up"], ["payment", "phone", "pos", "delivery-platform"]),
  marketplace: D("marketplace", "Marketplace Room", ["commerce", "customer-service", "operations", "project"], ["Help a buyer", "Help a seller", "Organise a marketplace issue"], ["payment", "crm", "database", "human-expert"]),
  restaurant: D("restaurant", "Restaurant Room", ["customer-service", "booking", "commerce", "operations"], ["Organise reservations", "Prepare menu information", "Handle a customer enquiry"], ["booking-platform", "pos", "delivery-platform", "phone", "sms"]),
  foodgrocery: D("foodgrocery", "Food & Grocery Room", ["commerce", "customer-service", "operations"], ["Find a product", "Organise an order", "Prepare delivery information"], ["pos", "delivery-platform", "payment", "database"]),
  hotel: D("hotel", "Hotel & Travel Room", ["customer-service", "booking", "documents", "operations"], ["Prepare a reservation", "Help a guest", "Plan a travel request"], ["booking-platform", "phone", "sms", "payment"]),
  automotive: D("automotive", "Automotive Room", ["customer-service", "booking", "commerce", "operations"], ["Prepare a service booking", "Draft a quote", "Handle a customer enquiry"], ["booking-platform", "crm", "phone", "sms"]),
  insurance: D("insurance", "Insurance Room", ["documents", "customer-service", "regulated-intake", "research"], ["Organise a claim", "Review policy documents", "Prepare questions for an adviser"], ["crm", "esign", "human-expert"], "regulated", "AI may organise policy and claim information; regulated insurance advice and coverage decisions require applicable authorised processes."),
  migration: D("migration", "Migration Room", ["documents", "research", "booking", "regulated-intake"], ["Organise visa documents", "Prepare a checklist", "Prepare for an adviser"], ["booking-platform", "esign", "human-expert"], "regulated", "AI may organise migration information and documents; personalised immigration legal advice may require an authorised professional."),
  recruitment: D("recruitment", "Recruitment Room", ["documents", "customer-service", "booking", "operations"], ["Review a candidate", "Prepare an interview", "Organise a vacancy"], ["crm", "booking-platform", "email-send", "database"]),
  technology: D("technology", "Technology Room", ["technical", "project", "documents", "research"], ["Troubleshoot a problem", "Plan a software task", "Review technical documentation"], ["github", "vercel", "database"]),
  telecom: D("telecom", "Telecommunications Room", ["technical", "customer-service", "operations"], ["Troubleshoot a service", "Prepare a customer response", "Plan a connection"], ["phone", "sms", "database"]),
  electronics: D("electronics", "Electronics Room", ["technical", "commerce", "customer-service"], ["Find the right product", "Troubleshoot an issue", "Prepare warranty information"], ["crm", "database", "payment"]),
  marketing: D("marketing", "Marketing Room", ["office", "project", "research", "customer-service"], ["Plan a campaign", "Draft content", "Prepare a client update"], ["crm", "email-send", "database"]),
  manufacturing: D("manufacturing", "Manufacturing Room", ["operations", "project", "commerce", "documents"], ["Plan production work", "Organise suppliers", "Prepare a quality checklist"], ["database", "crm", "delivery-platform"]),
  agriculture: D("agriculture", "Agriculture Room", ["operations", "research", "project", "commerce"], ["Plan today’s work", "Review crop information", "Prepare a sales or supply task"], ["database", "earth-observation-provider", "satellite-provider"]),
  logistics: D("logistics", "Logistics Room", ["operations", "customer-service", "booking", "commerce"], ["Plan a delivery", "Handle a tracking enquiry", "Organise dispatch"], ["delivery-platform", "database", "phone", "sms"]),
  beauty: D("beauty", "Beauty Room", ["customer-service", "booking", "commerce"], ["Organise appointments", "Help a customer", "Prepare service information"], ["booking-platform", "pos", "phone", "sms"]),
  fitness: D("fitness", "Fitness Room", ["customer-service", "booking", "learning", "operations"], ["Plan a class", "Help a member", "Organise a schedule"], ["booking-platform", "payment", "sms"]),
  education: D("education", "Education Room", ["learning", "documents", "research", "project"], ["Explain a topic", "Plan a lesson", "Review study material"], ["booking-platform", "email-send"]),
  music: D("music", "Music Room", ["learning", "documents", "project"], ["Plan a practice session", "Review lesson notes", "Prepare a learning goal"], ["booking-platform", "human-expert"]),
  dance: D("dance", "Dance Room", ["learning", "booking", "project"], ["Plan a practice session", "Prepare a class", "Set a learning goal"], ["booking-platform", "human-expert"]),
  consultation: D("consultation", "Consultation Room", ["customer-service", "booking", "documents", "regulated-intake"], ["Prepare for a consultation", "Organise notes", "Plan the next step"], ["booking-platform", "human-expert", "esign"], "regulated", "AI may organise information and consultation preparation; regulated professional advice remains subject to the relevant professional and jurisdictional rules."),
  space: D("space", "Space Services Room", ["space-data", "research", "technical", "project"], ["Find the right space service", "Compare satellite options", "Prepare a research brief"], ["satellite-provider", "earth-observation-provider", "human-expert"]),
  satelliteinternet: D("satelliteinternet", "Satellite Connectivity Room", ["space-data", "technical", "research"], ["Compare connectivity options", "Prepare a site requirement", "Troubleshoot a setup"], ["satellite-provider", "human-expert"]),
  earthobservation: D("earthobservation", "Earth Observation Room", ["space-data", "research", "project"], ["Find imagery options", "Prepare a change-detection brief", "Plan a mapping output"], ["earth-observation-provider", "database", "human-expert"]),
  spaceresearch: D("spaceresearch", "Space Research Room", ["space-data", "research", "learning", "project"], ["Research a space topic", "Analyse a dataset requirement", "Plan a study project"], ["earth-observation-provider", "satellite-provider", "human-expert"]),
  custom: D("custom", "Custom Room", ["office", "documents", "research", "project"], ["Tell me what you want to do", "Show me what this Room can do", "Help me choose the next step"], ["human-expert"]),
};

const materialIds = new Set(ROOM_MATERIALS.map((item) => item.id));

export function resolveDomainProfile(templateId: string) {
  const template = ROOM_TEMPLATES.find((item) => item.id === templateId) || ROOM_TEMPLATES.find((item) => item.id === "custom")!;
  const profile = DOMAIN_PROFILES[template.id] || DOMAIN_PROFILES.custom;
  const bundleMaterials = profile.bundles.flatMap((bundleId) => CAPABILITY_BUNDLES[bundleId].materialIds);
  const defaultMaterialIds = Array.from(new Set([...GLOBAL_CORE_MATERIAL_IDS, ...bundleMaterials])).filter((id) => materialIds.has(id));

  return {
    template,
    profile,
    defaultMaterialIds,
    capabilities: profile.bundles.flatMap((bundleId) => CAPABILITY_BUNDLES[bundleId].outcomes),
    connectors: profile.optionalConnectors.map((id) => CONNECTOR_REGISTRY[id]),
  };
}

export function defaultRoomName(ownerName: string, profile: DomainProfile) {
  const owner = ownerName.trim().slice(0, 70) || "My";
  return `${owner} - ${profile.roomLabel}`.slice(0, 120);
}

export const ROOM_FACTORY_V2_SUCCESS_TARGET = {
  immediateCoreCoverageTarget: "70-90% of common non-connected work",
  immediateIncludedExamples: [
    "conversation",
    "document upload/read/organisation",
    "research and summarisation",
    "drafts and checklists",
    "basic calculations and structured work",
    "safe guidance and next-step planning",
  ],
  connectorRequiredExamples: [
    "live phone or SMS",
    "real payments or POS",
    "external accounting/legal software sync",
    "external email sending",
    "native CAD/BIM",
    "live external databases or provider data",
  ],
} as const;
