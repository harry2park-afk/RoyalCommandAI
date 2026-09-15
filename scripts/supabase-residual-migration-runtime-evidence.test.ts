import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath = "scripts/supabase-residual-migration-runtime-evidence-20260910.json";

function loadEvidence() {
  return JSON.parse(fs.readFileSync(evidencePath, "utf8"));
}

describe("Supabase residual migration runtime evidence", () => {
  it("covers exactly the five known residual migration names", () => {
    const evidence = loadEvidence();
    const names = evidence.entries.map((entry: { name: string }) => entry.name).sort();

    expect(names).toEqual([
      "add_room_work_records",
      "legal_case_file_numbers",
      "legal_story_entries",
      "room_factory_evidence_review",
      "room_factory_start_execution",
    ]);
    expect(evidence.summary.residual_migration_names_checked).toBe(5);
    expect(evidence.summary.current_runtime_invariants_verified).toBe(5);
  });

  it("never upgrades runtime evidence into migration-ledger equivalence or apply readiness", () => {
    const evidence = loadEvidence();

    expect(evidence.summary.historical_ledger_equivalence_verified).toBe(0);
    expect(evidence.summary.ready_for_linked_apply).toBe(false);
    expect(
      evidence.entries.every(
        (entry: { ledger_equivalence_claimed: boolean }) => entry.ledger_equivalence_claimed === false,
      ),
    ).toBe(true);
    expect(evidence.remaining_gate).toContain("db push --linked --dry-run");
  });

  it("records the later hardened Room Factory runtime instead of treating old function bodies as current", () => {
    const evidence = loadEvidence();
    const review = evidence.entries.find(
      (entry: { name: string }) => entry.name === "room_factory_evidence_review",
    );
    const execution = evidence.entries.find(
      (entry: { name: string }) => entry.name === "room_factory_start_execution",
    );

    expect(review.runtime_status).toBe("VERIFIED_SUPERSEDED_BY_HARDENED_RUNTIME");
    expect(review.evidence.public_authenticated_execute_and_anon_denied).toBe(true);
    expect(review.evidence.private_auth_uid_and_room_membership_guards_present).toBe(true);
    expect(review.evidence.review_writer_self_review_guard_present).toBe(true);
    expect(review.evidence.review_evidence_required_guard_present).toBe(true);

    expect(execution.runtime_status).toBe("VERIFIED_SUPERSEDED_BY_HARDENED_RUNTIME");
    expect(execution.evidence.public_authenticated_execute_and_anon_denied).toBe(true);
    expect(execution.evidence.private_auth_uid_and_room_membership_guards_present).toBe(true);
    expect(execution.evidence.dependency_pass_guard_present).toBe(true);
    expect(execution.evidence.complete_lock_token_evidence_guard_present).toBe(true);
  });
});
