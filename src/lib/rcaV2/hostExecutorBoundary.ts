export type HostExecutorCheck = {
  id: string;
  ready: boolean;
  reason: string;
};

export type HostExecutorBoundaryInput = {
  dedicatedSessionSecretConfigured: boolean;
  authenticatedUserVerified: boolean;
  tenantIsolationVerified: boolean;
  ruleGateIntegrated: boolean;
  masterTaskControllerIntegrated: boolean;
  resourceLockPlannerIntegrated: boolean;
  reviewerEvidenceGateIntegrated: boolean;
  persistentLockBackendReady: boolean;
  executionAdaptersConnected: boolean;
};

export type HostExecutorBoundaryResult = {
  boundary: "RCA_V2_HOST_EXECUTOR";
  phase: "DISABLED_PREFLIGHT";
  executionAuthority: false;
  infrastructureCredentialsExposedToAI: false;
  checks: HostExecutorCheck[];
  blockers: string[];
};

/**
 * Central security boundary for all future RCA BUILD mutations.
 *
 * IMPORTANT: This phase is deliberately non-executable. Even when every
 * readiness check becomes true, this function still returns
 * executionAuthority:false. Enabling execution requires a separate reviewed
 * change that wires narrowly-scoped Host adapters behind this boundary.
 */
export function evaluateHostExecutorBoundary(
  input: HostExecutorBoundaryInput,
): HostExecutorBoundaryResult {
  const checks: HostExecutorCheck[] = [
    {
      id: "dedicated-session-secret",
      ready: input.dedicatedSessionSecretConfigured,
      reason: input.dedicatedSessionSecretConfigured
        ? "Dedicated RCA session-signing secret is configured."
        : "AU_V2_SESSION_SECRET must be configured before BUILD execution can be considered.",
    },
    {
      id: "authenticated-user",
      ready: input.authenticatedUserVerified,
      reason: input.authenticatedUserVerified
        ? "Authenticated user verification is available."
        : "A verified authenticated user is required.",
    },
    {
      id: "tenant-isolation",
      ready: input.tenantIsolationVerified,
      reason: input.tenantIsolationVerified
        ? "The current user can access the configured server-side RCA Room boundary."
        : "A verified User → Tenant/Household → Room boundary is required.",
    },
    {
      id: "rule-gate",
      ready: input.ruleGateIntegrated,
      reason: input.ruleGateIntegrated
        ? "Rule Gate is integrated before BUILD planning."
        : "Rule Gate must be integrated before any execution path.",
    },
    {
      id: "master-task-controller",
      ready: input.masterTaskControllerIntegrated,
      reason: input.masterTaskControllerIntegrated
        ? "Master Task Controller planning is integrated."
        : "A validated Task/Work Lane plan is required.",
    },
    {
      id: "resource-lock-planner",
      ready: input.resourceLockPlannerIntegrated,
      reason: input.resourceLockPlannerIntegrated
        ? "Planning Resource Lock validation is integrated."
        : "Resource ownership and dependency validation are required.",
    },
    {
      id: "review-evidence-gate",
      ready: input.reviewerEvidenceGateIntegrated,
      reason: input.reviewerEvidenceGateIntegrated
        ? "Independent Reviewer and Evidence planning is integrated."
        : "Independent review and evidence requirements are required.",
    },
    {
      id: "persistent-lock-backend",
      ready: input.persistentLockBackendReady,
      reason: input.persistentLockBackendReady
        ? "Persistent server-owned execution locks are available."
        : "Persistent server-owned Resource Locks are not active yet.",
    },
    {
      id: "execution-adapters",
      ready: input.executionAdaptersConnected,
      reason: input.executionAdaptersConnected
        ? "Narrowly-scoped Host execution adapters are connected."
        : "No Host mutation adapters are connected in this phase.",
    },
  ];

  const blockers = checks.filter((check) => !check.ready).map((check) => check.reason);

  return {
    boundary: "RCA_V2_HOST_EXECUTOR",
    phase: "DISABLED_PREFLIGHT",
    executionAuthority: false,
    infrastructureCredentialsExposedToAI: false,
    checks,
    blockers,
  };
}
