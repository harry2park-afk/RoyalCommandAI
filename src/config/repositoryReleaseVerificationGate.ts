export const REQUIRED_REPOSITORY_RELEASE_CHECKS = [
  "QUALITY_GATE",
  "CONFLICT_GUARD",
  "CHANGE_CONTROL",
  "SUPABASE_CLEAN_REPLAY",
  "SUPABASE_LINKED_DRY_RUN",
  "ROOM_FACTORY_CONCURRENCY",
  "MASTER_REQUIRED_STATUS_CHECKS",
  "STABLE_RESTORE_REF",
  "VERCEL_PREVIEW_DEPLOYMENT",
] as const;

export type RepositoryReleaseCheckName =
  (typeof REQUIRED_REPOSITORY_RELEASE_CHECKS)[number];

export type RepositoryReleaseCheckState =
  | "SUCCESS"
  | "FAILURE"
  | "SKIPPED"
  | "PENDING";

export type RepositoryReleaseCheckEvidence = {
  check: string;
  state: RepositoryReleaseCheckState;
  evidenceRef: string;
};

export type RepositoryReleaseVerificationEvidence = {
  evidenceId: string;
  exactHeadSha: string;
  previewDeploymentId: string;
  capturedAtUtc: string;
  checks: readonly RepositoryReleaseCheckEvidence[];
};

export type RepositoryReleaseVerificationBlocker =
  | "REPOSITORY_VERIFICATION_EVIDENCE_MISSING"
  | "REPOSITORY_VERIFICATION_EVIDENCE_ID_MISSING"
  | "REPOSITORY_VERIFICATION_HEAD_SHA_INVALID"
  | "REPOSITORY_VERIFICATION_HEAD_SHA_MISMATCH"
  | "REPOSITORY_VERIFICATION_PREVIEW_DEPLOYMENT_MISMATCH"
  | "REPOSITORY_VERIFICATION_TIMESTAMP_INVALID"
  | "REPOSITORY_VERIFICATION_EVIDENCE_STALE"
  | "REPOSITORY_VERIFICATION_EVIDENCE_FROM_FUTURE"
  | "REPOSITORY_VERIFICATION_CHECK_COVERAGE_INCOMPLETE"
  | "REPOSITORY_VERIFICATION_CHECK_DUPLICATE"
  | "REPOSITORY_VERIFICATION_CHECK_UNSUPPORTED"
  | "REPOSITORY_VERIFICATION_CHECK_EVIDENCE_REF_MISSING"
  | "REPOSITORY_VERIFICATION_CHECK_NOT_SUCCESS";

export type RepositoryReleaseVerificationRow = {
  check: RepositoryReleaseCheckName;
  evaluated: boolean;
  state: RepositoryReleaseCheckState | "MISSING";
  evidenceRef: string;
  ready: boolean;
};

export type RepositoryReleaseVerificationDecision = {
  candidateSha: string;
  previewDeploymentId: string;
  ready: boolean;
  blockers: RepositoryReleaseVerificationBlocker[];
  checks: RepositoryReleaseVerificationRow[];
};

const EXACT_SHA_PATTERN = /^[0-9a-f]{40}$/;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const MAX_AGE_MS = 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const REQUIRED_CHECK_SET = new Set<string>(REQUIRED_REPOSITORY_RELEASE_CHECKS);

function pushUnique(
  blockers: RepositoryReleaseVerificationBlocker[],
  blocker: RepositoryReleaseVerificationBlocker,
): void {
  if (!blockers.includes(blocker)) {
    blockers.push(blocker);
  }
}

function isValidUtcTimestamp(value: string): boolean {
  return UTC_TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Fail-closed repository/release evidence gate for first-wave Production review.
 *
 * This gate deliberately separates source/runtime readiness assertions from the
 * actual exact-head delivery evidence needed before Production review. A green
 * Quality Gate does not stand in for Conflict Guard, Change Control, clean
 * migration replay, linked Supabase dry-run, Room Factory concurrency, actual
 * master required-status-check enforcement, a verified stable restore ref, or
 * the exact Preview deployment. SKIPPED and PENDING are never treated as SUCCESS.
 *
 * Evidence is bound to the same exact candidate SHA and Preview deployment used
 * by the higher-level Production review, and must be fresh. This function has no
 * side effects and grants no merge/deploy/migration authority by itself.
 */
export function evaluateRepositoryReleaseVerification(
  expectedExactHeadSha: string,
  expectedPreviewDeploymentId: string,
  evidence?: RepositoryReleaseVerificationEvidence | null,
  evaluatedAtUtc = new Date().toISOString(),
): RepositoryReleaseVerificationDecision {
  const candidateSha = expectedExactHeadSha.trim();
  const previewDeploymentId = expectedPreviewDeploymentId.trim();
  const blockers: RepositoryReleaseVerificationBlocker[] = [];

  if (!evidence) {
    return {
      candidateSha,
      previewDeploymentId,
      ready: false,
      blockers: ["REPOSITORY_VERIFICATION_EVIDENCE_MISSING"],
      checks: REQUIRED_REPOSITORY_RELEASE_CHECKS.map((check) => ({
        check,
        evaluated: false,
        state: "MISSING" as const,
        evidenceRef: "",
        ready: false,
      })),
    };
  }

  if (!evidence.evidenceId.trim()) {
    pushUnique(blockers, "REPOSITORY_VERIFICATION_EVIDENCE_ID_MISSING");
  }

  const evidenceHeadSha = evidence.exactHeadSha.trim();
  if (!EXACT_SHA_PATTERN.test(evidenceHeadSha)) {
    pushUnique(blockers, "REPOSITORY_VERIFICATION_HEAD_SHA_INVALID");
  } else if (evidenceHeadSha !== candidateSha) {
    pushUnique(blockers, "REPOSITORY_VERIFICATION_HEAD_SHA_MISMATCH");
  }

  if (
    !previewDeploymentId ||
    !evidence.previewDeploymentId.trim() ||
    evidence.previewDeploymentId.trim() !== previewDeploymentId
  ) {
    pushUnique(blockers, "REPOSITORY_VERIFICATION_PREVIEW_DEPLOYMENT_MISMATCH");
  }

  const normalizedEvaluatedAtUtc = evaluatedAtUtc.trim();
  const capturedAtUtc = evidence.capturedAtUtc.trim();
  const evaluatedAtValid = isValidUtcTimestamp(normalizedEvaluatedAtUtc);
  const capturedAtValid = isValidUtcTimestamp(capturedAtUtc);

  if (!capturedAtValid || !evaluatedAtValid) {
    pushUnique(blockers, "REPOSITORY_VERIFICATION_TIMESTAMP_INVALID");
  } else {
    const evaluatedAtMs = Date.parse(normalizedEvaluatedAtUtc);
    const capturedAtMs = Date.parse(capturedAtUtc);
    if (evaluatedAtMs - capturedAtMs > MAX_AGE_MS) {
      pushUnique(blockers, "REPOSITORY_VERIFICATION_EVIDENCE_STALE");
    }
    if (capturedAtMs - evaluatedAtMs > MAX_FUTURE_SKEW_MS) {
      pushUnique(blockers, "REPOSITORY_VERIFICATION_EVIDENCE_FROM_FUTURE");
    }
  }

  const byCheck = new Map<RepositoryReleaseCheckName, RepositoryReleaseCheckEvidence>();

  for (const checkEvidence of evidence.checks) {
    const check = checkEvidence.check.trim();
    if (!REQUIRED_CHECK_SET.has(check)) {
      pushUnique(blockers, "REPOSITORY_VERIFICATION_CHECK_UNSUPPORTED");
      continue;
    }

    const typedCheck = check as RepositoryReleaseCheckName;
    if (byCheck.has(typedCheck)) {
      pushUnique(blockers, "REPOSITORY_VERIFICATION_CHECK_DUPLICATE");
      continue;
    }

    byCheck.set(typedCheck, checkEvidence);
  }

  const checks = REQUIRED_REPOSITORY_RELEASE_CHECKS.map((check) => {
    const checkEvidence = byCheck.get(check);
    if (!checkEvidence) {
      pushUnique(blockers, "REPOSITORY_VERIFICATION_CHECK_COVERAGE_INCOMPLETE");
      return {
        check,
        evaluated: false,
        state: "MISSING" as const,
        evidenceRef: "",
        ready: false,
      };
    }

    const evidenceRef = checkEvidence.evidenceRef.trim();
    if (!evidenceRef) {
      pushUnique(blockers, "REPOSITORY_VERIFICATION_CHECK_EVIDENCE_REF_MISSING");
    }
    if (checkEvidence.state !== "SUCCESS") {
      pushUnique(blockers, "REPOSITORY_VERIFICATION_CHECK_NOT_SUCCESS");
    }

    return {
      check,
      evaluated: true,
      state: checkEvidence.state,
      evidenceRef,
      ready: checkEvidence.state === "SUCCESS" && Boolean(evidenceRef),
    };
  });

  return {
    candidateSha,
    previewDeploymentId,
    ready: blockers.length === 0 && checks.every(({ ready }) => ready),
    blockers,
    checks,
  };
}
