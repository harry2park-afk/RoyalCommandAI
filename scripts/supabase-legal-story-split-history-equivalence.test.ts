import crypto from "node:crypto";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath = "scripts/supabase-legal-story-split-history-equivalence-20260911.json";
const audioDeclarationLine =
  "  audio_document_id uuid null references public.documents(id) on delete set null,\n";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function loadEvidence() {
  return JSON.parse(fs.readFileSync(evidencePath, "utf8"));
}

describe("Supabase legal story split-history source composition", () => {
  it("pins the exact local and Hosted split-history identities without claiming ledger identity", () => {
    const evidence = loadEvidence();

    expect(evidence.project_ref).toBe("aygawkavujjmybekswrg");
    expect(evidence.local.name).toBe("legal_story_entries");
    expect(evidence.local.version).toBe("20260829142500");
    expect(evidence.hosted_base).toMatchObject({
      name: "legal_story_entries",
      version: "20260829042019",
    });
    expect(evidence.hosted_followup).toMatchObject({
      name: "legal_story_entry_audio",
      version: "20260829042153",
    });
    expect(evidence.composition_contract.ledger_identity_claimed).toBe(false);
    expect(evidence.composition_contract.execution_order_identity_claimed).toBe(false);
    expect(evidence.summary.ledger_identity_verified).toBe(0);
    expect(evidence.summary.ready_for_linked_apply).toBe(false);
  });

  it("proves the local folded column is exactly the Hosted base plus Hosted follow-up source", () => {
    const evidence = loadEvidence();
    const localSource = fs.readFileSync(evidence.local.path, "utf8");

    expect(localSource.split(audioDeclarationLine)).toHaveLength(2);

    const hostedBaseCandidate = localSource.replace(audioDeclarationLine, "");
    expect(sha256(hostedBaseCandidate)).toBe(evidence.hosted_base.statements_sha256);

    const declaration = audioDeclarationLine.trim().replace(/,$/, "");
    expect(declaration).toBe(evidence.composition_contract.folded_local_declaration);

    const hostedFollowupCandidate =
      `alter table public.legal_story_entries\n` +
      `  add column if not exists ${declaration};`;
    expect(sha256(hostedFollowupCandidate)).toBe(evidence.hosted_followup.statements_sha256);
    expect(evidence.composition_contract.source_composition_equivalent).toBe(true);
  });

  it("narrows only source-composition uncertainty and keeps the deployment gate fail closed", () => {
    const evidence = loadEvidence();

    expect(evidence.summary.complex_source_composition_proven).toBe(1);
    expect(evidence.summary.remaining_complex_formatting_source_proofs).toBe(2);
    expect(evidence.remaining_complex_formatting_names.sort()).toEqual([
      "room_factory_evidence_review",
      "room_factory_start_execution",
    ]);
    expect(evidence.remaining_gate).toContain("migration list --linked");
    expect(evidence.remaining_gate).toContain("db push --linked --dry-run");
  });
});
