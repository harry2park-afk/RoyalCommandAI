import type { AIProviderId } from "@/lib/ai/types";

export type RuleGateDisposition =
  | "ALLOW"
  | "ALLOW_WITH_CONDITIONS"
  | "OWNER_APPROVAL_REQUIRED"
  | "BLOCK"
  | "UNKNOWN_REQUIRES_REVIEW";

export type RuleGateCheckStatus = "PASS" | "CONDITION" | "OWNER" | "BLOCK" | "UNKNOWN";

export type RuleGateCheck = {
  id: string;
  category:
    | "ROYAL_COMMAND_LAW"
    | "PLATFORM_REPOSITORY"
    | "COUNTRY_REGULATION"
    | "AI_PROVIDER"
    | "TENANT_DATA"
    | "RESOURCE_DEPENDENCY"
    | "EVIDENCE_ROLLBACK";
  status: RuleGateCheckStatus;
  reason: string;
};

export type RuleGateInput = {
  task: string;
  mode: "FAST" | "BUILD";
  countryCodes?: string[];
  providers?: AIProviderId[];
  resources?: string[];
  evidencePlan?: string;
  rollbackPoint?: string;
  productionRequested?: boolean;
  destructive?: boolean;
  regulated?: boolean;
};

export type RuleGateRuntime = {
  dedicatedSessionSecretConfigured: boolean;
  authenticatedUserVerified: boolean;
  tenantIsolationVerified: boolean;
  availableProviders: AIProviderId[];
};

export type RuleGateResult = {
  disposition: RuleGateDisposition;
  writeAuthority: false;
  checks: RuleGateCheck[];
  blockers: string[];
  conditions: string[];
  ownerApprovalReasons: string[];
  unknowns: string[];
};

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values || []).map((value) => value.trim()).filter(Boolean)));
}

export function evaluateRcaRuleGate(input: RuleGateInput, runtime: RuleGateRuntime): RuleGateResult {
  const checks: RuleGateCheck[] = [];
  const task = input.task.trim();
  const countries = uniqueStrings(input.countryCodes).map((value) => value.toUpperCase());
  const resources = uniqueStrings(input.resources);
  const providers = Array.from(new Set(input.providers || []));

  if (!task) {
    checks.push({
      id: "task-required",
      category: "ROYAL_COMMAND_LAW",
      status: "BLOCK",
      reason: "Executable work requires a non-empty Task declaration.",
    });
  } else {
    checks.push({
      id: "task-declared",
      category: "ROYAL_COMMAND_LAW",
      status: "PASS",
      reason: "Task declaration is present.",
    });
  }

  if (input.mode === "FAST") {
    checks.push({
      id: "fast-answer-only",
      category: "ROYAL_COMMAND_LAW",
      status: "PASS",
      reason: "FAST mode remains answer/analysis only and receives no write authority.",
    });
  } else {
    checks.push({
      id: "build-explicit",
      category: "ROYAL_COMMAND_LAW",
      status: "PASS",
      reason: "BUILD mode was explicitly requested for precheck.",
    });

    if (!runtime.dedicatedSessionSecretConfigured) {
      checks.push({
        id: "dedicated-session-secret",
        category: "PLATFORM_REPOSITORY",
        status: "BLOCK",
        reason: "BUILD cannot start until AU_V2_SESSION_SECRET is configured as a dedicated session-signing secret.",
      });
    } else {
      checks.push({
        id: "dedicated-session-secret",
        category: "PLATFORM_REPOSITORY",
        status: "PASS",
        reason: "Dedicated RCA session-signing secret is configured.",
      });
    }

    if (!runtime.authenticatedUserVerified) {
      checks.push({
        id: "authenticated-user",
        category: "TENANT_DATA",
        status: "BLOCK",
        reason: "BUILD requires verified user authentication/authorization before execution authority can be granted.",
      });
    }

    if (!runtime.tenantIsolationVerified) {
      checks.push({
        id: "tenant-isolation",
        category: "TENANT_DATA",
        status: "BLOCK",
        reason: "BUILD requires verified User → Tenant → Room isolation; current RCA test storage is not sufficient.",
      });
    }

    if (!resources.length) {
      checks.push({
        id: "resource-boundary",
        category: "RESOURCE_DEPENDENCY",
        status: "UNKNOWN",
        reason: "No file/data/resource boundary was declared, so safe parallel Writer ownership cannot yet be verified.",
      });
    } else {
      checks.push({
        id: "resource-boundary",
        category: "RESOURCE_DEPENDENCY",
        status: "PASS",
        reason: `${resources.length} resource boundary item(s) declared for collision checking.`,
      });
    }

    if (!input.evidencePlan?.trim()) {
      checks.push({
        id: "evidence-plan",
        category: "EVIDENCE_ROLLBACK",
        status: "CONDITION",
        reason: "BUILD must define task-appropriate evidence before SUCCESS can be declared.",
      });
    } else {
      checks.push({
        id: "evidence-plan",
        category: "EVIDENCE_ROLLBACK",
        status: "PASS",
        reason: "Evidence plan is declared.",
      });
    }

    if ((input.productionRequested || input.destructive) && !input.rollbackPoint?.trim()) {
      checks.push({
        id: "rollback-required",
        category: "EVIDENCE_ROLLBACK",
        status: "BLOCK",
        reason: "Production/destructive work requires a known-good rollback point before execution.",
      });
    } else if (input.rollbackPoint?.trim()) {
      checks.push({
        id: "rollback-declared",
        category: "EVIDENCE_ROLLBACK",
        status: "PASS",
        reason: "Rollback point is declared.",
      });
    } else {
      checks.push({
        id: "rollback-preview",
        category: "EVIDENCE_ROLLBACK",
        status: "CONDITION",
        reason: "Preview-only work may proceed later, but a rollback point is required before production-affecting execution.",
      });
    }
  }

  const unavailableProviders = providers.filter((provider) => !runtime.availableProviders.includes(provider));
  if (unavailableProviders.length) {
    checks.push({
      id: "provider-availability",
      category: "AI_PROVIDER",
      status: "BLOCK",
      reason: `Requested provider(s) are not currently connected: ${unavailableProviders.join(", ")}.`,
    });
  } else if (providers.length) {
    checks.push({
      id: "provider-availability",
      category: "AI_PROVIDER",
      status: "PASS",
      reason: "Requested AI providers are currently connected.",
    });
  } else if (input.mode === "BUILD") {
    checks.push({
      id: "provider-selection",
      category: "AI_PROVIDER",
      status: "UNKNOWN",
      reason: "No Writer/reviewer provider set has been declared for BUILD.",
    });
  }

  if (countries.length || input.regulated) {
    checks.push({
      id: "country-law-review",
      category: "COUNTRY_REGULATION",
      status: "UNKNOWN",
      reason: countries.length
        ? `Country/legal requirements require verified policy data before BUILD: ${countries.join(", ")}.`
        : "REGULATED work requires verified country/legal policy data before BUILD.",
    });
  }

  if (input.productionRequested) {
    checks.push({
      id: "production-owner-approval",
      category: "ROYAL_COMMAND_LAW",
      status: "OWNER",
      reason: "Production merge/deploy requires explicit Owner approval.",
    });
  }

  if (input.destructive) {
    checks.push({
      id: "destructive-owner-approval",
      category: "ROYAL_COMMAND_LAW",
      status: "OWNER",
      reason: "Destructive operations require explicit Owner approval and verified rollback.",
    });
  }

  const blockers = checks.filter((check) => check.status === "BLOCK").map((check) => check.reason);
  const ownerApprovalReasons = checks.filter((check) => check.status === "OWNER").map((check) => check.reason);
  const unknowns = checks.filter((check) => check.status === "UNKNOWN").map((check) => check.reason);
  const conditions = checks.filter((check) => check.status === "CONDITION").map((check) => check.reason);

  let disposition: RuleGateDisposition = "ALLOW";
  if (blockers.length) disposition = "BLOCK";
  else if (ownerApprovalReasons.length) disposition = "OWNER_APPROVAL_REQUIRED";
  else if (unknowns.length) disposition = "UNKNOWN_REQUIRES_REVIEW";
  else if (conditions.length) disposition = "ALLOW_WITH_CONDITIONS";

  return {
    disposition,
    writeAuthority: false,
    checks,
    blockers,
    conditions,
    ownerApprovalReasons,
    unknowns,
  };
}
