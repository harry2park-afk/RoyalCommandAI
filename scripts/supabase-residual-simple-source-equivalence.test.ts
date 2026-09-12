import crypto from "node:crypto";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath = "scripts/supabase-residual-simple-source-equivalence-20260911.json";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeAllowlistedSimpleSql(source: string): string {
  const normalizedNewlines = source.replace(/\r\n?/g, "\n");

  expect(normalizedNewlines).not.toMatch(/\/\*/);
  expect(normalizedNewlines).not.toMatch(/\$[A-Za-z_0-9]*\$/);

  const executableLines = normalizedNewlines
    .split("\n")
    .filter((line) => !/^\s*--/.test(line));
  const executableSource = executableLines.join("\n").trim();

  const quotedLiterals = executableSource.match(/'(?:''|[^'])*'|"(?:""|[^"])*"/g) ?? [];
  for (const literal of quotedLiterals) {
    expect(literal).not.toMatch(/\s/);
  }

  return executableSource.replace(/\s+/g, " ");
}

function loadEvidence() {
  return JSON.parse(fs.readFileSync(evidencePath, "utf8"));
}

describe("Supabase residual simple-source equivalence", () => {
  it("is limited to the two explicitly evidenced simple residual migrations", () => {
    const evidence = loadEvidence();
    const names = evidence.entries.map((entry: { name: string }) => entry.name).sort();

    expect(names).toEqual(["add_room_work_records", "legal_case_file_numbers"]);
    expect(evidence.summary.eligible_migrations).toBe(2);
    expect(evidence.summary.source_provenance_equivalent).toBe(2);
    expect(evidence.summary.ledger_identity_verified).toBe(0);
    expect(evidence.summary.ready_for_linked_apply).toBe(false);
  });

  it("matches each pinned Hosted canonical hash from the exact local migration source", () => {
    const evidence = loadEvidence();

    for (const entry of evidence.entries as Array<{
      local_path: string;
      remote_whitespace_canonical_sha256: string;
      source_provenance_equivalent: boolean;
      ledger_identity_claimed: boolean;
    }>) {
      const localSource = fs.readFileSync(entry.local_path, "utf8");
      const canonicalLocalSource = normalizeAllowlistedSimpleSql(localSource);

      expect(sha256(canonicalLocalSource)).toBe(entry.remote_whitespace_canonical_sha256);
      expect(entry.source_provenance_equivalent).toBe(true);
      expect(entry.ledger_identity_claimed).toBe(false);
    }
  });

  it("keeps the three complex residual migrations blocked and preserves the linked dry-run gate", () => {
    const evidence = loadEvidence();

    expect(evidence.remaining_residual_names.sort()).toEqual([
      "legal_story_entries",
      "room_factory_evidence_review",
      "room_factory_start_execution",
    ]);
    expect(evidence.remaining_gate).toContain("migration list --linked");
    expect(evidence.remaining_gate).toContain("db push --linked --dry-run");
  });
});
