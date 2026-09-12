import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { verifyLinkedDryRunAllowlist } from "./supabase-linked-allowlist-provenance.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const manifestPath = path.join(
  repoRoot,
  "scripts",
  "supabase-unresolved-local-migration-classification-20260908.json",
);
const workflowPath = path.join(
  repoRoot,
  ".github",
  "workflows",
  "supabase-linked-dry-run-evidence.yml",
);

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
  it("binds the workflow allow-list exactly to the provenance-authorized new candidate", () => {
    const report = verifyLinkedDryRunAllowlist({
      manifest: loadManifest(),
      requestedAllowlist: readWorkflowAllowlist(),
    });

    expect(report.blockers).toEqual([]);
    expect(report.dry_run_allowlist_verified).toBe(true);
    expect(report.ready_for_apply).toBe(false);
    expect(report.requested_allowlist).toEqual(["20260831225500_scope_matter_staff_access.sql"]);
    expect(report.provenance_authorized_dry_run).toEqual([
      "20260831225500_scope_matter_staff_access.sql",
    ]);
  });

  it("fails closed if a quarantined historical migration is added to the dry-run allow-list", () => {
    const report = verifyLinkedDryRunAllowlist({
      manifest: loadManifest(),
      requestedAllowlist:
        "20260831225500_scope_matter_staff_access.sql,20260825041500_fix_room_member_insert_rls.sql",
    });

    expect(report.dry_run_allowlist_verified).toBe(false);
    expect(report.blockers.join("\n")).toContain("quarantined historical migration");
  });

  it("fails closed if the workflow allow-list is narrower than the provenance manifest", () => {
    const report = verifyLinkedDryRunAllowlist({
      manifest: loadManifest(),
      requestedAllowlist: "20260810065600_passkeys.sql",
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
      requestedAllowlist: `${migration},${migration}`,
    });

    expect(report.dry_run_allowlist_verified).toBe(false);
    expect(report.blockers.join("\n")).toContain("duplicate migration");
  });

  it("never upgrades provenance evidence into apply authority", () => {
    const manifest = { ...loadManifest(), ready_for_apply: true };
    const report = verifyLinkedDryRunAllowlist({
      manifest,
      requestedAllowlist: "20260831225500_scope_matter_staff_access.sql",
    });

    expect(report.dry_run_allowlist_verified).toBe(false);
    expect(report.ready_for_apply).toBe(false);
    expect(report.blockers.join("\n")).toContain("ready_for_apply=false");
  });
});
