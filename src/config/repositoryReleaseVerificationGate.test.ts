import { describe, expect, it } from "vitest";
import {
  REQUIRED_REPOSITORY_RELEASE_CHECKS,
  evaluateRepositoryReleaseVerification,
  type RepositoryReleaseVerificationEvidence,
} from "./repositoryReleaseVerificationGate";

const EXACT_HEAD = "7f31f39ff1d3e7e5bca7a4de4a5f10c2ea40ce41";
const PREVIEW_DEPLOYMENT_ID = "vercel-preview-first-wave-production-review";
const EVALUATED_AT = "2026-09-13T00:00:00Z";

function verifiedEvidence(): RepositoryReleaseVerificationEvidence {
  return {
    evidenceId: "repository-release-verification-20260913",
    exactHeadSha: EXACT_HEAD,
    previewDeploymentId: PREVIEW_DEPLOYMENT_ID,
    capturedAtUtc: "2026-09-12T23:50:00Z",
    checks: REQUIRED_REPOSITORY_RELEASE_CHECKS.map((check) => ({
      check,
      state: "SUCCESS" as const,
      evidenceRef: `evidence-${check.toLowerCase()}`,
    })),
  };
}

describe("repository release verification gate", () => {
  it("requires every exact-head launch check to succeed", () => {
    const result = evaluateRepositoryReleaseVerification(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      verifiedEvidence(),
      EVALUATED_AT,
    );

    expect(result.blockers).toEqual([]);
    expect(result.checks).toHaveLength(REQUIRED_REPOSITORY_RELEASE_CHECKS.length);
    expect(result.checks.every(({ ready }) => ready)).toBe(true);
    expect(result.ready).toBe(true);
  });

  it("fails closed when linked Supabase dry-run evidence is missing", () => {
    const evidence = verifiedEvidence();
    const result = evaluateRepositoryReleaseVerification(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      {
        ...evidence,
        checks: evidence.checks.filter(({ check }) => check !== "SUPABASE_LINKED_DRY_RUN"),
      },
      EVALUATED_AT,
    );

    expect(result.blockers).toContain("REPOSITORY_VERIFICATION_CHECK_COVERAGE_INCOMPLETE");
    expect(result.checks.find(({ check }) => check === "SUPABASE_LINKED_DRY_RUN")).toEqual(
      expect.objectContaining({ evaluated: false, state: "MISSING", ready: false }),
    );
    expect(result.ready).toBe(false);
  });

  it("does not count skipped Change Control as a passing check", () => {
    const evidence = verifiedEvidence();
    const result = evaluateRepositoryReleaseVerification(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      {
        ...evidence,
        checks: evidence.checks.map((checkEvidence) =>
          checkEvidence.check === "CHANGE_CONTROL"
            ? { ...checkEvidence, state: "SKIPPED" as const }
            : checkEvidence,
        ),
      },
      EVALUATED_AT,
    );

    expect(result.blockers).toContain("REPOSITORY_VERIFICATION_CHECK_NOT_SUCCESS");
    expect(result.checks.find(({ check }) => check === "CHANGE_CONTROL")?.ready).toBe(false);
    expect(result.ready).toBe(false);
  });

  it("binds repository verification to the same exact SHA and Preview deployment", () => {
    const result = evaluateRepositoryReleaseVerification(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      {
        ...verifiedEvidence(),
        exactHeadSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        previewDeploymentId: "different-preview",
      },
      EVALUATED_AT,
    );

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "REPOSITORY_VERIFICATION_HEAD_SHA_MISMATCH",
        "REPOSITORY_VERIFICATION_PREVIEW_DEPLOYMENT_MISMATCH",
      ]),
    );
    expect(result.ready).toBe(false);
  });

  it("rejects stale repository verification evidence", () => {
    const result = evaluateRepositoryReleaseVerification(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      {
        ...verifiedEvidence(),
        capturedAtUtc: "2026-09-12T22:59:59Z",
      },
      EVALUATED_AT,
    );

    expect(result.blockers).toContain("REPOSITORY_VERIFICATION_EVIDENCE_STALE");
    expect(result.ready).toBe(false);
  });

  it("rejects duplicate and unsupported check rows", () => {
    const evidence = verifiedEvidence();
    const quality = evidence.checks.find(({ check }) => check === "QUALITY_GATE")!;
    const result = evaluateRepositoryReleaseVerification(
      EXACT_HEAD,
      PREVIEW_DEPLOYMENT_ID,
      {
        ...evidence,
        checks: [
          ...evidence.checks,
          quality,
          { check: "UNREGISTERED_CHECK", state: "SUCCESS", evidenceRef: "unexpected" },
        ],
      },
      EVALUATED_AT,
    );

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "REPOSITORY_VERIFICATION_CHECK_DUPLICATE",
        "REPOSITORY_VERIFICATION_CHECK_UNSUPPORTED",
      ]),
    );
    expect(result.ready).toBe(false);
  });
});
