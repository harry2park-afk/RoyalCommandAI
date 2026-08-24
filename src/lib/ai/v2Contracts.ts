import type { AIModelId } from "./modelRegistry";
import type { AIProviderId } from "./types";

/**
 * Royal Command RC Room V2 Phase 0 normative contracts.
 *
 * DESIGN CONTRACT ONLY: importing this module must not perform network,
 * persistence, tool, git, preview, or production side effects.
 */

export const RC_V2_CONTRACT_VERSION = "REV-02-FINAL-INTEGRATED/PHASE-0-v1" as const;

export const WORK_MODES = [
  "CHAT",
  "ANALYSE",
  "RESEARCH",
  "DEVELOP",
  "TOOL_TASK",
  "BENCHMARK",
] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const DEFAULT_WORK_MODE: WorkMode = "CHAT";

export const WORK_MODE_SIGNAL_PRIORITY = [
  "user_explicit",
  "ui_explicit",
  "work_continuation",
  "host_policy",
  "automatic_classifier",
] as const;
export type WorkModeSignal = (typeof WORK_MODE_SIGNAL_PRIORITY)[number];

export type WorkModeDecision = {
  mode: WorkMode;
  source: WorkModeSignal;
  confidence?: number;
  overriddenBy?: Exclude<WorkModeSignal, "automatic_classifier">;
  reason?: string;
};

export function normalizeClassifierDecision(
  mode: WorkMode | null | undefined,
  confidence: number | null | undefined,
  minimumConfidence = 0.7,
): WorkModeDecision {
  if (!mode || confidence == null || confidence < minimumConfidence) {
    return {
      mode: DEFAULT_WORK_MODE,
      source: "automatic_classifier",
      confidence: confidence ?? undefined,
      reason: "classifier_missing_or_below_confidence_threshold",
    };
  }
  return { mode, source: "automatic_classifier", confidence };
}

export const COUNCIL_MODES = ["off", "manual_once"] as const;
export type CouncilMode = (typeof COUNCIL_MODES)[number];
export const DEFAULT_COUNCIL_MODE: CouncilMode = "off";

export const WORK_STATES = [
  "CREATED",
  "RUNNING",
  "PARTIAL",
  "WAITING_APPROVAL",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type WorkState = (typeof WORK_STATES)[number];

export const PROVIDER_RESULT_STATES = [
  "SUCCESS",
  "PARTIAL",
  "TIMEOUT",
  "FAILED",
  "LATE",
  "CANCELLED",
] as const;
export type ProviderResultState = (typeof PROVIDER_RESULT_STATES)[number];

export const NORMALIZED_PROVIDER_ERRORS = [
  "AUTH_ERROR",
  "RATE_LIMIT",
  "CREDIT_EXHAUSTED",
  "TIMEOUT",
  "PROVIDER_DOWN",
  "MODEL_UNAVAILABLE",
  "CONTEXT_OVERFLOW",
  "CANCELLED",
  "UNKNOWN",
] as const;
export type NormalizedProviderError = (typeof NORMALIZED_PROVIDER_ERRORS)[number];

export type ProviderResultIdentity = {
  resultId: string;
  workId: string;
  revision: number;
  providerId: AIProviderId;
  modelId?: AIModelId;
  attempt: number;
};

export type ProviderResultEnvelope = ProviderResultIdentity & {
  status: ProviderResultState;
  content?: string;
  error?: NormalizedProviderError;
  createdAt: string;
  completedAt?: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type ProviderAdapterRequest = {
  workId: string;
  revision: number;
  providerId: AIProviderId;
  modelId: AIModelId;
  prompt: string;
  deadlineAt: string;
  attempt: number;
  abortSignal?: AbortSignal;
};

export type ProviderStreamEvent =
  | { type: "delta"; text: string }
  | { type: "usage"; inputTokens?: number; outputTokens?: number }
  | { type: "partial"; text: string }
  | { type: "final"; result: ProviderResultEnvelope }
  | { type: "error"; error: NormalizedProviderError; message?: string };

export interface ProviderAdapterContract {
  readonly providerId: AIProviderId;
  start(request: ProviderAdapterRequest): AsyncIterable<ProviderStreamEvent>;
  cancel?(identity: ProviderResultIdentity): Promise<void> | void;
}

export const EXECUTION_LANES = [
  "INTERACTIVE",
  "COUNCIL",
  "DEVELOPMENT",
  "BENCHMARK",
] as const;
export type ExecutionLane = (typeof EXECUTION_LANES)[number];

export type LaneIsolationPolicy = {
  lane: ExecutionLane;
  maxConcurrency: number;
  maxQueueDepth: number;
  timeoutMs: number;
  rateLimitKey: string;
  credentialScope: string;
  dbConnectionBudget?: number;
};

/**
 * These are safe starting contract values, not permanent capacity promises.
 * Bench is intentionally constrained so it cannot become the default path.
 */
export const INITIAL_LANE_POLICIES: Readonly<Record<ExecutionLane, LaneIsolationPolicy>> = Object.freeze({
  INTERACTIVE: Object.freeze({
    lane: "INTERACTIVE",
    maxConcurrency: 32,
    maxQueueDepth: 100,
    timeoutMs: 90_000,
    rateLimitKey: "lane:interactive",
    credentialScope: "interactive",
  }),
  COUNCIL: Object.freeze({
    lane: "COUNCIL",
    maxConcurrency: 8,
    maxQueueDepth: 25,
    timeoutMs: 120_000,
    rateLimitKey: "lane:council",
    credentialScope: "council",
  }),
  DEVELOPMENT: Object.freeze({
    lane: "DEVELOPMENT",
    maxConcurrency: 4,
    maxQueueDepth: 20,
    timeoutMs: 300_000,
    rateLimitKey: "lane:development",
    credentialScope: "development",
  }),
  BENCHMARK: Object.freeze({
    lane: "BENCHMARK",
    maxConcurrency: 5,
    maxQueueDepth: 10,
    timeoutMs: 180_000,
    rateLimitKey: "lane:benchmark",
    credentialScope: "benchmark",
  }),
});

export const TOOL_RISK_CLASSES = ["R0", "R1", "R2", "R3"] as const;
export type ToolRiskClass = (typeof TOOL_RISK_CLASSES)[number];

export type ToolExecutionProposal = {
  proposalId: string;
  idempotencyKey: string;
  actorId: string;
  tenantId: string;
  roomId: string;
  workId: string;
  revision: number;
  mode: WorkMode;
  lane: ExecutionLane;
  tool: string;
  riskClass: ToolRiskClass;
  target: string;
  arguments: unknown;
};

export type ToolAuthorizationDecision = {
  allowed: boolean;
  reason: string;
  requiresUserApproval: boolean;
};

export function baselineToolAuthorization(
  proposal: Pick<ToolExecutionProposal, "mode" | "lane" | "riskClass">,
): ToolAuthorizationDecision {
  if (proposal.riskClass === "R3") {
    return { allowed: false, reason: "explicit_user_approval_required", requiresUserApproval: true };
  }
  if (proposal.lane === "BENCHMARK" && proposal.riskClass !== "R0") {
    return { allowed: false, reason: "benchmark_lane_read_only", requiresUserApproval: false };
  }
  if (proposal.mode === "CHAT" && proposal.riskClass !== "R0") {
    return { allowed: false, reason: "chat_mode_read_only_by_default", requiresUserApproval: false };
  }
  return { allowed: true, reason: "baseline_policy_allows_proposal", requiresUserApproval: false };
}

export type EvidenceKind =
  | "RESPONSE"
  | "SOURCE"
  | "TOOL_RESULT"
  | "CODE_CHANGE"
  | "TEST"
  | "COMMIT"
  | "PULL_REQUEST"
  | "PREVIEW"
  | "USER_APPROVAL"
  | "DEPLOYMENT";

export type EvidenceRecord = {
  evidenceId: string;
  workId: string;
  revision: number;
  mode: WorkMode;
  kind: EvidenceKind;
  createdAt: string;
  providerId?: AIProviderId;
  modelId?: AIModelId;
  tool?: string;
  branch?: string;
  commitSha?: string;
  pullRequestUrl?: string;
  previewUrl?: string;
  deploymentId?: string;
  redacted: boolean;
  payloadHash?: string;
};

export const REQUIRED_EVIDENCE_BY_MODE: Readonly<Record<WorkMode, readonly EvidenceKind[]>> = Object.freeze({
  CHAT: Object.freeze(["RESPONSE"]),
  ANALYSE: Object.freeze(["RESPONSE"]),
  RESEARCH: Object.freeze(["RESPONSE", "SOURCE"]),
  TOOL_TASK: Object.freeze(["TOOL_RESULT"]),
  DEVELOP: Object.freeze(["CODE_CHANGE", "TEST", "COMMIT", "PULL_REQUEST", "PREVIEW"]),
  BENCHMARK: Object.freeze(["RESPONSE"]),
});

export function missingRequiredEvidence(mode: WorkMode, evidence: readonly EvidenceRecord[]): EvidenceKind[] {
  const present = new Set(evidence.map((item) => item.kind));
  return REQUIRED_EVIDENCE_BY_MODE[mode].filter((kind) => !present.has(kind));
}

export function canTransitionToCompleted(mode: WorkMode, evidence: readonly EvidenceRecord[]): boolean {
  return missingRequiredEvidence(mode, evidence).length === 0;
}

export type ApprovalLease = {
  leaseId: string;
  workId: string;
  revision: number;
  approvedSha: string;
  previewSha: string;
  previewId: string;
  approverId: string;
  issuedAt: string;
  expiresAt: string;
};

export type ApprovalPreflightInput = {
  lease: ApprovalLease;
  now: string;
  prHeadSha: string;
  previewSha: string;
  deploymentSourceSha: string;
};

export type ApprovalPreflightResult = {
  valid: boolean;
  reason:
    | "ok"
    | "lease_expired"
    | "pr_head_mismatch"
    | "preview_mismatch"
    | "deployment_source_mismatch";
};

export function validateApprovalPreflight(input: ApprovalPreflightInput): ApprovalPreflightResult {
  if (Date.parse(input.now) >= Date.parse(input.lease.expiresAt)) {
    return { valid: false, reason: "lease_expired" };
  }
  if (input.prHeadSha !== input.lease.approvedSha) {
    return { valid: false, reason: "pr_head_mismatch" };
  }
  if (input.previewSha !== input.lease.previewSha || input.previewSha !== input.lease.approvedSha) {
    return { valid: false, reason: "preview_mismatch" };
  }
  if (input.deploymentSourceSha !== input.lease.approvedSha) {
    return { valid: false, reason: "deployment_source_mismatch" };
  }
  return { valid: true, reason: "ok" };
}

export const CANCELLATION_ACTIONS = [
  "ABORT",
  "STOP_DELIVERY",
  "PRESERVE_RESULT",
  "REQUIRE_REVERT",
  "CLOSE_OR_ABANDON",
  "CLEANUP_ASYNC",
] as const;
export type CancellationAction = (typeof CANCELLATION_ACTIONS)[number];

export const CANCELLATION_MATRIX: Readonly<Record<string, readonly CancellationAction[]>> = Object.freeze({
  provider_inference: Object.freeze(["ABORT", "STOP_DELIVERY"]),
  streaming: Object.freeze(["STOP_DELIVERY"]),
  tool_R0: Object.freeze(["ABORT"]),
  tool_R1: Object.freeze(["ABORT", "PRESERVE_RESULT"]),
  tool_R2: Object.freeze(["PRESERVE_RESULT", "CLEANUP_ASYNC"]),
  tool_R3: Object.freeze(["REQUIRE_REVERT"]),
  git_commit: Object.freeze(["CLOSE_OR_ABANDON", "PRESERVE_RESULT"]),
  pull_request: Object.freeze(["CLOSE_OR_ABANDON"]),
  preview: Object.freeze(["CLEANUP_ASYNC"]),
});

export const ACK_SYNC_ALLOWLIST = Object.freeze([
  "minimal_auth_check",
  "work_id_create_or_lookup",
  "explicit_mode_and_council_read",
  "cached_feature_flag_read",
  "cached_provider_snapshot_read",
] as const);

export const ACK_SYNC_DENYLIST = Object.freeze([
  "long_history_retrieval",
  "embedding_generation",
  "full_context_assembly",
  "real_time_cost_reconciliation",
  "detailed_provider_health_calculation",
  "large_database_scan",
  "benchmark_work",
] as const);

export const FAILURE_UX = Object.freeze({
  TIMEOUT: "Timed Out",
  PARTIAL: "Partial",
  LATE: "Late Result",
  REAUTH_REQUIRED: "Authentication Required",
  CREDIT_EXHAUSTED: "Credit Limit Reached",
  BLOCKED: "Blocked",
  CANCELLED: "Cancelled",
  PROVIDER_DOWN: "Unavailable",
} as const);

export const MINIMUM_SLOS = Object.freeze({
  ackLatencyMsTarget: 100,
  routingLatencyMsTarget: 100,
  firstUsefulOutputMsTarget: 8_000,
  providerTimeoutRateWarn: 0.10,
  partialRateWarn: 0.15,
  authRefreshFailureRateWarn: 0.02,
} as const);

export type ShadowGoNoGoMetrics = {
  latencyRegressionPct: number;
  failureRate: number;
  correctnessRegressionDetected: boolean;
  costRegressionPct: number;
  truthDivergenceDetected: boolean;
};

export function shadowGoNoGo(metrics: ShadowGoNoGoMetrics): "GO" | "NO_GO" {
  if (metrics.truthDivergenceDetected || metrics.correctnessRegressionDetected) return "NO_GO";
  if (metrics.latencyRegressionPct > 10) return "NO_GO";
  if (metrics.failureRate > 0.05) return "NO_GO";
  if (metrics.costRegressionPct > 20) return "NO_GO";
  return "GO";
}
