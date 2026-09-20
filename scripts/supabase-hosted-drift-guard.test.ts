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

describe("Hosted ledger drift guard", () => {
  it("fails closed while the observed 76th migration is not a trusted baseline", () => {
    expect(() => verifyHostedLedgerTrustBoundary({ driftEvidence, trustedSnapshot })).toThrow(
      /unresolved Hosted ledger drift/,
    );
  });

  it("accepts only a provenance-resolved snapshot that exactly matches the observed ledger", () => {
    const resolvedEvidence = structuredClone(driftEvidence);
    resolvedEvidence.hosted_migration_ledger.trusted_baseline_advanced = true;
    resolvedEvidence.git_provenance.status = "RESOLVED";

    const reconciledSnapshot = structuredClone(trustedSnapshot);
    reconciledSnapshot.migration_count = resolvedEvidence.hosted_migration_ledger.observed_count;
    reconciledSnapshot.last_version = resolvedEvidence.hosted_migration_ledger.observed_head_version;

    expect(
      verifyHostedLedgerTrustBoundary({
        driftEvidence: resolvedEvidence,
        trustedSnapshot: reconciledSnapshot,
      }),
    ).toMatchObject({
      ready_for_linked_dry_run: true,
      trusted_migration_count: 76,
      trusted_head_version: "20260920091809",
      provenance_status: "RESOLVED",
    });
  });

  it("still blocks if provenance is resolved but the trusted snapshot is stale", () => {
    const resolvedEvidence = structuredClone(driftEvidence);
    resolvedEvidence.hosted_migration_ledger.trusted_baseline_advanced = true;
    resolvedEvidence.git_provenance.status = "RESOLVED";

    expect(() => verifyHostedLedgerTrustBoundary({ driftEvidence: resolvedEvidence, trustedSnapshot })).toThrow(
      /trusted snapshot migration count does not match observed Hosted ledger/,
    );
  });
});
