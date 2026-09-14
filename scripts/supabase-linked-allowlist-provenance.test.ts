import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { verifyLinkedDryRunAllowlist } from "./supabase-linked-allowlist-provenance.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(
  repoRoot,
  "scripts",
  "supabase-unresolved-local-migration-classification-20260914.json",
);
const workflowPath = path.join(
  repoRoot,
  ".github",
  "workflows",
  "supabase-linked-dry-run-evidence.yml",
);
const migrationDir = path.join(repoRoot, "supabase", "migrations");

const expectedCandidates = [
  "20260831225500_scope_matter_staff_access.sql",
  "20260901025800_room_factory_atomic_non_encounter.sql",
  "20260903205500_payment_operational_safeguards.sql",
  "20260904105500_harden_profile_role_authority.sql",
  "20260911045100_room_factory_manifest_acl_hardening.sql",
];

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function readWorkflowAllowlist(): string {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const match = workflow.match(/EXPECTED_APPLY_MIGRATIONS:\s*>-\s*\n\s+([^\n]+)/);
  if (!match) throw new Error("workflow EXPECTED_APPLY_MIGRATIONS is missing or malformed");
  return match[1].trim();
}

describe("Supabase linked dry-run allow-list provenance", () => {
  it("binds the workflow allow-list exactly to all provenance-authorized new candidates", () => {
    const report = verifyLinkedDryRunAllowlist({
      manifest: loadManifest(),
      requestedAllowlist: readWorkflowAllowlist(),
      migrationDir,
    });

    expect(report.blockers).toEqual([]);
    expect(report.dry_run_allowlist_verified).toBe(true);
    expect(report.ready_for_apply).toBe(false);
    expect(report.requested_allowlist).toEqual(expectedCandidates);
    expect(report.provenance_authorized_dry_run).toEqual(expectedCandidates);
    expect(report.source_blob_checks.length).toBe(4);
    expect(report.source_blob_checks.every((check: { verified: boolean }) => check.verified)).toBe(true);
  });

  it("fails closed if a quarantined historical migration is added to the dry-run allow-list", () => {
    const report = verifyLinkedDryRunAllowlist({
      manifest: loadManifest(),
      requestedAllowlist: `${expectedCandidates.join(",")},20260825041500_fix_room_member_insert_rls.sql`,
      migrationDir,
    });

    expect(report.dry_run_allowlist_verified).toBe(false);
    expect(report.blockers.join("\n")).toContain("quarantined historical migration");
  });

  it("fails closed if the workflow allow-list is narrower than the provenance manifest", () => {
    const report = verifyLinkedDryRunAllowlist({
      manifest: loadManifest(),
      requestedAllowlist: expectedCandidates.slice(0, 4).join(","),
      migrationDir,
    });

    expect(report.dry_run_allowlist_verified).toBe(false);
    expect(report.blockers.join("\n")).toContain(
      "workflow dry-run allow-list does not exactly match provenance manifest",
    );
  });

  it("fails closed on duplicate allow-list entries", () => {
    const migration = "20260831225500_scope_matter_staff_access.sql";
    const report = verifyLinkedDryRunAllowlist({
      manifest: loadManifest(),
      requestedAllowlist: `${expectedCandidates.join(",")},${migration}`,
      migrationDir,
    });

    expect(report.dry_run_allowlist_verified).toBe(false);
    expect(report.blockers.join("\n")).toContain("duplicate migration");
  });

  it("fails closed if a recorded candidate source blob no longer matches the copied migration", () => {
    const manifest = loadManifest();
    const paymentEntry = manifest.entries.find(
      (entry: { local_basename?: string }) =>
        entry.local_basename === "20260903205500_payment_operational_safeguards.sql",
    );
    expect(paymentEntry).toBeTruthy();
    paymentEntry.source_blob_sha = "0000000000000000000000000000000000000000";

    const report = verifyLinkedDryRunAllowlist({
      manifest,
      requestedAllowlist: expectedCandidates.join(","),
      migrationDir,
    });

    expect(report.dry_run_allowlist_verified).toBe(false);
    expect(report.blockers.join("\n")).toContain("candidate source blob mismatch");
  });

  it("never upgrades provenance evidence into apply authority", () => {
    const manifest = { ...loadManifest(), ready_for_apply: true };
    const report = verifyLinkedDryRunAllowlist({
      manifest,
      requestedAllowlist: expectedCandidates.join(","),
      migrationDir,
    });

    expect(report.dry_run_allowlist_verified).toBe(false);
    expect(report.ready_for_apply).toBe(false);
    expect(report.blockers.join("\n")).toContain("ready_for_apply=false");
  });
});
