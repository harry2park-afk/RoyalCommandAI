import { getConfiguredCountryCodes, hasCountryConfig } from "../../config/countryResolver";
import { DEFAULT_GLOBAL_ROOM_SETTINGS, GLOBAL_ROOM_PRESETS, type GlobalRoomSettings } from "./global";
import { ROOM_TEMPLATES } from "./templates";
import {
  CONVERSATION_RULES,
  CONVERSATION_STATE_MACHINE,
  ROOM_FACTORY_V2_SUCCESS_TARGET,
  resolveDomainProfile,
} from "./factory-v2";

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

export type RoomFactoryV2Blueprint = Omit<RoomFactoryBlueprint, "version" | "capabilities"> & {
  version: "room-factory-v2";
  domain: {
    profileId: string;
    roomLabel: string;
    safetyTier: "standard" | "regulated" | "high-risk";
    adviceBoundary?: string;
    starterActions: string[];
  };
  capabilities: {
    websiteKit: boolean;
    selectedMaterials: string[];
    includedOutcomes: string[];
    bundles: string[];
    connectorPolicy: "off-until-needed-and-approved";
    optionalConnectors: Array<{
      id: string;
      label: string;
      reason: string;
      availability: string;
      defaultEnabled: false;
      approvalRequired: true;
    }>;
  };
  conversation: {
    stateMachine: typeof CONVERSATION_STATE_MACHINE;
    rules: typeof CONVERSATION_RULES;
  };
  policyRuntime: {
    checks: readonly ["country", "plan", "risk", "compliance", "permission", "cost"];
    paidOrExternalRequiresHostApproval: true;
    casualChatCannotApproveSpend: true;
    connectorDefault: "off";
  };
  consentLedger: {
    requiredForPaidOrExternal: true;
    evidenceFields: readonly [
      "subject",
      "reason",
      "price",
      "billingType",
      "alternativesShown",
      "approvedBy",
      "approvedAt",
      "workId",
      "result",
      "cancelPathShown",
    ];
  };
  outcomeMemory: {
    structuredFields: readonly ["goals", "decisions", "notNeeded", "deferred", "approvals", "preferences", "frequentWork"];
    piiMinimisationRequired: true;
    resumeStateRequired: true;
  };
  evolution: {
    promotionPath: readonly ["customer-patch", "verified-capability", "bundle-or-domain"];
    promotionChecks: readonly ["repeat-use", "evidence", "pii-removed", "security", "regulatory", "maintenance-cost"];
    regulatedDomainsNeverAutoPromoteGlobally: true;
  };
  successTarget: typeof ROOM_FACTORY_V2_SUCCESS_TARGET;
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
  return hasCountryConfig(code);
}

function presetFor(code: string) {
  return GLOBAL_ROOM_PRESETS.find((item) => item.id === code);
}

function buildLocale(input: RoomFactoryInput) {
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

  if (!languageTag) blockers.push("Room language is required.");
  if (!timeZone) blockers.push("Time zone is required.");
  if (currencyCode.length !== 3) blockers.push("Currency must be a 3-letter code.");
  if (!registeredCountry(countryCode)) {
    warnings.push("Country is not yet a configured RCA country profile. Locale defaults may be used, but country-specific compliance must remain unverified until a CountryConfig is added.");
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

  return { locale, blockers, warnings };
}

function baseExecution(input: RoomFactoryInput) {
  return {
    approvalMode: input.approvalMode || "approval",
    productionWriteDefault: false as const,
    singleWriteAuthority: true as const,
    reviewerCanWrite: false as const,
    evidenceBeforeSuccess: true as const,
    rollbackRequired: true as const,
    tenantIsolationRequired: true as const,
    secretsStayHostOwned: true as const,
  };
}

function clonePolicy() {
  return {
    mode: "structure-only" as const,
    customerData: false as const,
    memory: false as const,
    credentials: false as const,
    secrets: false as const,
  };
}

export function compileRoomFactoryBlueprint(input: RoomFactoryInput): RoomFactoryBlueprint {
  const roomName = input.roomName.trim().slice(0, 120);
  const template = ROOM_TEMPLATES.find((item) => item.id === input.templateId)
    || ROOM_TEMPLATES.find((item) => item.id === "custom")!;
  const { locale, blockers, warnings } = buildLocale(input);

  if (!roomName) blockers.push("Room name is required.");

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
    execution: baseExecution(input),
    clonePolicy: clonePolicy(),
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

export function compileRoomFactoryV2Blueprint(input: RoomFactoryInput): RoomFactoryV2Blueprint {
  const roomName = input.roomName.trim().slice(0, 120);
  const resolved = resolveDomainProfile(input.templateId);
  const { locale, blockers, warnings } = buildLocale(input);

  if (!roomName) blockers.push("Room name is required.");
  const selectedMaterials = Array.from(new Set([
    ...resolved.defaultMaterialIds,
    ...(input.selectedMaterials || []),
  ])).filter(Boolean);

  return {
    version: "room-factory-v2",
    room: {
      name: roomName || "Untitled Room",
      templateId: resolved.template.id,
      templateName: resolved.template.name,
      purpose: resolved.template.shortDescription,
      suggestedAgents: [...resolved.template.suggestedAgents],
    },
    domain: {
      profileId: resolved.profile.templateId,
      roomLabel: resolved.profile.roomLabel,
      safetyTier: resolved.profile.safetyTier,
      adviceBoundary: resolved.profile.adviceBoundary,
      starterActions: [...resolved.profile.starters],
    },
    locale,
    execution: baseExecution(input),
    clonePolicy: clonePolicy(),
    capabilities: {
      websiteKit: Boolean(input.websiteKit),
      selectedMaterials,
      includedOutcomes: Array.from(new Set(resolved.capabilities)),
      bundles: [...resolved.profile.bundles],
      connectorPolicy: "off-until-needed-and-approved",
      optionalConnectors: resolved.connectors.map((connector) => ({
        id: connector.id,
        label: connector.label,
        reason: connector.reason,
        availability: connector.availability,
        defaultEnabled: false as const,
        approvalRequired: true as const,
      })),
    },
    conversation: {
      stateMachine: CONVERSATION_STATE_MACHINE,
      rules: CONVERSATION_RULES,
    },
    policyRuntime: {
      checks: ["country", "plan", "risk", "compliance", "permission", "cost"] as const,
      paidOrExternalRequiresHostApproval: true,
      casualChatCannotApproveSpend: true,
      connectorDefault: "off",
    },
    consentLedger: {
      requiredForPaidOrExternal: true,
      evidenceFields: [
        "subject",
        "reason",
        "price",
        "billingType",
        "alternativesShown",
        "approvedBy",
        "approvedAt",
        "workId",
        "result",
        "cancelPathShown",
      ] as const,
    },
    outcomeMemory: {
      structuredFields: ["goals", "decisions", "notNeeded", "deferred", "approvals", "preferences", "frequentWork"] as const,
      piiMinimisationRequired: true,
      resumeStateRequired: true,
    },
    evolution: {
      promotionPath: ["customer-patch", "verified-capability", "bundle-or-domain"] as const,
      promotionChecks: ["repeat-use", "evidence", "pii-removed", "security", "regulatory", "maintenance-cost"] as const,
      regulatedDomainsNeverAutoPromoteGlobally: true,
    },
    successTarget: ROOM_FACTORY_V2_SUCCESS_TARGET,
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
    registeredProfiles: getConfiguredCountryCodes().length,
    localePresets: GLOBAL_ROOM_PRESETS.filter((item) => item.id !== "GLOBAL").length,
    extensibleCountryModel: true,
    strategy: "One global core plus country-profile overlays. Locale presets may scale ahead of launch profiles, while countries without a verified CountryConfig remain custom-profile-required.",
  } as const;
}
