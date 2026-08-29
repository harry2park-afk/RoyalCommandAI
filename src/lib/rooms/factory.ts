import { DEFAULT_GLOBAL_ROOM_SETTINGS, GLOBAL_ROOM_PRESETS, type GlobalRoomSettings } from "./global";
import { ROOM_TEMPLATES } from "./templates";

export type RoomFactoryApprovalMode = "safe" | "approval" | "autonomous";
export type RoomFactoryCountryStatus = "registered" | "custom-profile-required";

export type RoomFactoryInput = {
  roomName: string;
  templateId: string;
  countryCode: string;
  languageTag: string;
  languageTags?: string[];
  timeZone?: string;
  currencyCode?: string;
  approvalMode?: RoomFactoryApprovalMode;
  websiteKit?: boolean;
  selectedMaterials?: string[];
};

export type RoomFactoryLane = {
  id: string;
  name: string;
  writeAuthority: "single-writer";
  reviewRequired: boolean;
  evidenceRequired: boolean;
  purpose: string;
};

export type RoomFactoryBlueprint = {
  version: "room-factory-v1";
  room: {
    name: string;
    templateId: string;
    templateName: string;
    purpose: string;
    suggestedAgents: string[];
  };
  locale: GlobalRoomSettings & {
    countryProfileStatus: RoomFactoryCountryStatus;
    supportedLanguageTags: string[];
  };
  execution: {
    approvalMode: RoomFactoryApprovalMode;
    productionWriteDefault: false;
    singleWriteAuthority: true;
    reviewerCanWrite: false;
    evidenceBeforeSuccess: true;
    rollbackRequired: true;
    tenantIsolationRequired: true;
    secretsStayHostOwned: true;
  };
  clonePolicy: {
    mode: "structure-only";
    customerData: false;
    memory: false;
    credentials: false;
    secrets: false;
  };
  capabilities: {
    websiteKit: boolean;
    selectedMaterials: string[];
  };
  lanes: RoomFactoryLane[];
  readiness: {
    readyForSafeBuild: boolean;
    blockers: string[];
    warnings: string[];
  };
};

const DEFAULT_LANES: RoomFactoryLane[] = [
  {
    id: "core",
    name: "Global Core",
    writeAuthority: "single-writer",
    reviewRequired: true,
    evidenceRequired: true,
    purpose: "Room shell, tenant boundary, identity, navigation and shared controls.",
  },
  {
    id: "domain",
    name: "Room Domain",
    writeAuthority: "single-writer",
    reviewRequired: true,
    evidenceRequired: true,
    purpose: "Template-specific workflows, fields, agents and customer experience.",
  },
  {
    id: "integrations",
    name: "Integrations",
    writeAuthority: "single-writer",
    reviewRequired: true,
    evidenceRequired: true,
    purpose: "AI providers, tools, communications and external service adapters.",
  },
  {
    id: "country",
    name: "Country Profile",
    writeAuthority: "single-writer",
    reviewRequired: true,
    evidenceRequired: true,
    purpose: "Language, timezone, currency and country-specific policy overlays without duplicating the core.",
  },
  {
    id: "qa",
    name: "QA · Security · Evidence",
    writeAuthority: "single-writer",
    reviewRequired: true,
    evidenceRequired: true,
    purpose: "Independent review, build/test evidence, rollback readiness and final release decision.",
  },
];

function normaliseCountry(value: string) {
  return value.trim().toUpperCase().slice(0, 8) || "GLOBAL";
}

function normaliseLanguage(value: string) {
  return value.trim().slice(0, 35) || "en";
}

function registeredCountry(code: string) {
  return GLOBAL_ROOM_PRESETS.some((item) => item.id === code);
}

function presetFor(code: string) {
  return GLOBAL_ROOM_PRESETS.find((item) => item.id === code);
}

export function compileRoomFactoryBlueprint(input: RoomFactoryInput): RoomFactoryBlueprint {
  const roomName = input.roomName.trim().slice(0, 120);
  const template = ROOM_TEMPLATES.find((item) => item.id === input.templateId)
    || ROOM_TEMPLATES.find((item) => item.id === "custom")!;
  const countryCode = normaliseCountry(input.countryCode);
  const preset = presetFor(countryCode);
  const languageTag = normaliseLanguage(input.languageTag || preset?.languageTag || DEFAULT_GLOBAL_ROOM_SETTINGS.languageTag);
  const supportedLanguageTags = Array.from(new Set([
    languageTag,
    ...(input.languageTags || []).map(normaliseLanguage),
  ])).filter(Boolean).slice(0, 10);
  const timeZone = (input.timeZone || preset?.timeZone || DEFAULT_GLOBAL_ROOM_SETTINGS.timeZone).trim().slice(0, 80);
  const currencyCode = (input.currencyCode || preset?.currencyCode || DEFAULT_GLOBAL_ROOM_SETTINGS.currencyCode).trim().toUpperCase().slice(0, 3);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!roomName) blockers.push("Room name is required.");
  if (!languageTag) blockers.push("Room language is required.");
  if (!timeZone) blockers.push("Time zone is required.");
  if (currencyCode.length !== 3) blockers.push("Currency must be a 3-letter code.");
  if (!registeredCountry(countryCode)) {
    warnings.push("Country is not yet a registered RCA profile. Safe build may continue, but country-specific compliance must remain unverified until a profile is added.");
  }

  const locale: GlobalRoomSettings & {
    countryProfileStatus: RoomFactoryCountryStatus;
    supportedLanguageTags: string[];
  } = {
    ...DEFAULT_GLOBAL_ROOM_SETTINGS,
    countryCode,
    languageTag,
    supportedLanguageTags,
    timeZone,
    currencyCode,
    textDirection: languageTag.toLowerCase().startsWith("ar") ? "rtl" : "ltr",
    countryProfileStatus: registeredCountry(countryCode) ? "registered" : "custom-profile-required",
  };

  return {
    version: "room-factory-v1",
    room: {
      name: roomName || "Untitled Room",
      templateId: template.id,
      templateName: template.name,
      purpose: template.shortDescription,
      suggestedAgents: [...template.suggestedAgents],
    },
    locale,
    execution: {
      approvalMode: input.approvalMode || "approval",
      productionWriteDefault: false,
      singleWriteAuthority: true,
      reviewerCanWrite: false,
      evidenceBeforeSuccess: true,
      rollbackRequired: true,
      tenantIsolationRequired: true,
      secretsStayHostOwned: true,
    },
    clonePolicy: {
      mode: "structure-only",
      customerData: false,
      memory: false,
      credentials: false,
      secrets: false,
    },
    capabilities: {
      websiteKit: Boolean(input.websiteKit),
      selectedMaterials: Array.from(new Set(input.selectedMaterials || [])).filter(Boolean),
    },
    lanes: DEFAULT_LANES.map((lane) => ({ ...lane })),
    readiness: {
      readyForSafeBuild: blockers.length === 0,
      blockers,
      warnings,
    },
  };
}

export function roomFactoryCountryCoverage() {
  return {
    registeredProfiles: GLOBAL_ROOM_PRESETS.filter((item) => item.id !== "GLOBAL").length,
    extensibleCountryModel: true,
    strategy: "One global core plus country-profile overlays. Unregistered ISO-style country codes use a safe custom-profile-required state instead of cloning the core.",
  } as const;
}
