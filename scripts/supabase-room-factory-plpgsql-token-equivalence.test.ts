import crypto from "node:crypto";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath = "scripts/supabase-room-factory-plpgsql-token-equivalence-20260911.json";
const TOKEN_SEPARATOR = "\x1f";

const LOCAL_COMMENT_METADATA: Record<string, string[]> = {
  room_factory_evidence_review: [],
  room_factory_start_execution: [
    `comment on function public.start_room_factory_lane_execution(uuid, uuid, text, integer) is\n  'Checks dependency PASS state, acquires one Work Lane persistent locks, and marks that lane running. No code execution occurs inside this RPC.';`,
    `comment on function public.fail_room_factory_lane_execution(uuid, uuid, text, uuid[], text) is\n  'Token-verified failed execution cleanup: releases the lane leases and records failed state.';`,
  ],
};

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function loadEvidence() {
  return JSON.parse(fs.readFileSync(evidencePath, "utf8"));
}

function stripExplicitLocalCommentMetadata(name: string, source: string): string {
  let stripped = source;
  for (const statement of LOCAL_COMMENT_METADATA[name] ?? []) {
    expect(stripped.split(statement)).toHaveLength(2);
    stripped = stripped.replace(statement, "");
  }
  return stripped;
}

function tokenizeAllowlistedSqlPlpgsql(source: string): string[] {
  const normalized = source.replace(/\r\n?/g, "\n");

  expect(normalized).not.toMatch(/\/\*/);
  expect(normalized).not.toMatch(/\$[A-Za-z_0-9]+\$/);

  const tokenPattern = /(--[^\n]*(?:\n|$)|'(?:''|[^'])*'|"(?:""|[^"])*"|\$\$|::|:=|<>|<=|>=|!=|\|\||->>|->|#>>|#>|[A-Za-z_][A-Za-z_0-9]*|[0-9]+(?:\.[0-9]+)?|\S)/g;
  return Array.from(normalized.matchAll(tokenPattern), (match) => match[1]).filter(
    (token) => !token.startsWith("--"),
  );
}

describe("Supabase Room Factory PLpgSQL token-source equivalence", () => {
  it("is restricted to the two remaining complex formatting residual migrations", () => {
    const evidence = loadEvidence();
    const names = evidence.entries.map((entry: { name: string }) => entry.name).sort();

    expect(names).toEqual([
      "room_factory_evidence_review",
      "room_factory_start_execution",
    ]);
    expect(evidence.summary.complex_formatting_source_proofs).toBe(2);
    expect(evidence.summary.executable_token_source_equivalent).toBe(2);
    expect(evidence.summary.ledger_identity_verified).toBe(0);
    expect(evidence.summary.ready_for_linked_apply).toBe(false);
  });

  it("matches each fresh Hosted executable token hash from the exact local source", () => {
    const evidence = loadEvidence();

    for (const entry of evidence.entries as Array<{
      name: string;
      local_path: string;
      remote_token_count: number;
      remote_token_sha256: string;
      excluded_local_comment_metadata: string[];
      executable_token_source_equivalent: boolean;
      ledger_identity_claimed: boolean;
    }>) {
      const localSource = fs.readFileSync(entry.local_path, "utf8");
      const expectedMetadata = LOCAL_COMMENT_METADATA[entry.name] ?? [];
      expect(entry.excluded_local_comment_metadata).toHaveLength(expectedMetadata.length);

      const executableSource = stripExplicitLocalCommentMetadata(entry.name, localSource);
      const tokens = tokenizeAllowlistedSqlPlpgsql(executableSource);
      const canonical = tokens.join(TOKEN_SEPARATOR);

      expect(tokens).toHaveLength(entry.remote_token_count);
      expect(sha256(canonical)).toBe(entry.remote_token_sha256);
      expect(entry.executable_token_source_equivalent).toBe(true);
      expect(entry.ledger_identity_claimed).toBe(false);
    }
  });

  it("keeps source equivalence separate from migration-ledger and linked-apply authorization", () => {
    const evidence = loadEvidence();

    expect(evidence.remaining_source_provenance_note).toContain("legal_story_entries");
    expect(evidence.remaining_source_provenance_note).toContain("Migration-version/ledger identity remains unreconciled");
    expect(evidence.remaining_gate).toContain("migration list --linked");
    expect(evidence.remaining_gate).toContain("db push --linked --dry-run");
    expect(evidence.remaining_gate).toContain("Do not repair migration history");
  });
});
