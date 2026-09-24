import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { verifyHostedLedgerTrustBoundary } from "./supabase-hosted-drift-guard.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const driftEvidence = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "scripts", "supabase-hosted-drift-evidence-20260921.json"), "utf8"),
);
const trustedSnapshot = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "scripts", "supabase-hosted-ledger-snapshot-20260920.json"), "utf8"),
);

function makeReviewedResolvedEvidence() {
  const resolvedEvidence = structuredClone(driftEvidence);
  resolvedEvidence.hosted_migration_ledger.trusted_baseline_advanced = true;
  resolvedEvidence.git_provenance.status = "RESOLVED";
  resolvedEvidence.git_provenance.resolution_method = "APPROVED_PRIVATE_DEPLOYMENT_ARTIFACT";
  resolvedEvidence.git_provenance.resolution_evidence_ref = "private-change-record:example-reviewed-artifact";
  resolvedEvidence.git_provenance.reviewed_by = "launch-reviewer";
  resolvedEvidence.git_provenance.reviewed_at = "2026-09-21T05:50:37Z";
  return resolvedEvidence;
}

function makeReconciledSnapshot(resolvedEvidence) {
  const reconciledSnapshot = structuredClone(trustedSnapshot);
  reconciledSnapshot.migration_count = resolvedEvidence.hosted_migration_ledger.observed_count;
  reconciledSnapshot.last_version = resolvedEvidence.hosted_migration_ledger.observed_head_version;
  return reconciledSnapshot;
}

describe("Hosted ledger drift guard", () => {
  it("fails closed while the 76th provenance blocker remains unresolved even when later Hosted migrations are source-equivalent", () => {
    expect(() => verifyHostedLedgerTrustBoundary({ driftEvidence, trustedSnapshot })).toThrow(
      /unresolved Hosted ledger drift/,
    );
  });

  it("does not accept a bare RESOLVED status without reviewed closure evidence", () => {
    const statusOnlyEvidence = structuredClone(driftEvidence);
    statusOnlyEvidence.hosted_migration_ledger.trusted_baseline_advanced = true;
    statusOnlyEvidence.git_provenance.status = "RESOLVED";

    const reconciledSnapshot = makeReconciledSnapshot(statusOnlyEvidence);

    expect(() =>
      verifyHostedLedgerTrustBoundary({ driftEvidence: statusOnlyEvidence, trustedSnapshot: reconciledSnapshot }),
    ).toThrow(/resolution method is not approved/);
  });

  it("rejects a later Hosted migration whose repository digest no longer matches the Hosted statement", () => {
    const tamperedEvidence = structuredClone(driftEvidence);
    tamperedEvidence.post_blocking_migrations[1].repository_statement_md5 = "00000000000000000000000000000000";

    expect(() => verifyHostedLedgerTrustBoundary({ driftEvidence: tamperedEvidence, trustedSnapshot })).toThrow(
      /repository\/Hosted digest mismatch/,
    );
  });

  it("accepts only a reviewed blocker closure whose trusted snapshot exactly reaches the observed Hosted head", () => {
    const resolvedEvidence = makeReviewedResolvedEvidence();
    const reconciledSnapshot = makeReconciledSnapshot(resolvedEvidence);

    expect(
      verifyHostedLedgerTrustBoundary({
        driftEvidence: resolvedEvidence,
        trustedSnapshot: reconciledSnapshot,
      }),
    ).toMatchObject({
      ready_for_linked_dry_run: true,
      trusted_migration_count: 79,
      trusted_head_version: "20260921052125",
      provenance_blocker_version: "20260920091809",
      post_blocking_migrations_verified: 3,
      provenance_status: "RESOLVED",
      provenance_resolution_method: "APPROVED_PRIVATE_DEPLOYMENT_ARTIFACT",
    });
  });

  it("still blocks if provenance is reviewed but the trusted snapshot is stale", () => {
    const resolvedEvidence = makeReviewedResolvedEvidence();

    expect(() => verifyHostedLedgerTrustBoundary({ driftEvidence: resolvedEvidence, trustedSnapshot })).toThrow(
      /trusted snapshot migration count does not match observed Hosted ledger/,
    );
  });
});
