import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const witnessPath = "scripts/supabase-local-migration-tree-witness-20260912.json";

type MigrationTreeWitness = {
  repository: string;
  source_commit_before_witness: string;
  stable_base_sha: string;
  migration_path: string;
  migration_tree_sha: string;
  hosted_ledger_receipt: string;
  hosted_project_ref: string;
  hosted_migration_count: number;
  hosted_ordered_ledger_md5: string;
  verification: {
    local_migration_tree_bound: boolean;
    hosted_ledger_fresh_read_only: boolean;
    hosted_mutation_performed: boolean;
    linked_cli_inventory_proven: boolean;
    linked_db_push_dry_run_proven: boolean;
    ready_for_apply: boolean;
  };
};

type HostedLedgerReceipt = {
  project_ref: string;
  migration_count: number;
  ordered_ledger_md5: string;
  hosted_mutation_performed: boolean;
  linked_cli_inventory_proven: boolean;
  linked_db_push_dry_run_proven: boolean;
  ready_for_apply: boolean;
};

function readJson<T>(path: string): T {
  return JSON.parse(fs.readFileSync(path, "utf8")) as T;
}

function currentTreeSha(path: string): string {
  return execFileSync("git", ["rev-parse", `HEAD:${path}`], { encoding: "utf8" }).trim();
}

describe("Supabase local migration tree witness", () => {
  it("fails closed if the exact local migration directory tree changes", () => {
    const witness = readJson<MigrationTreeWitness>(witnessPath);

    expect(witness.repository).toBe("harry2park-afk/RoyalCommandAI");
    expect(witness.source_commit_before_witness).toBe(
      "3df60ebf708587449e8582c4edaa188b33556c9d",
    );
    expect(witness.stable_base_sha).toBe("33da2a917dc6adcf266f59f0b27d18a56f1271d8");
    expect(witness.migration_path).toBe("supabase/migrations");
    expect(currentTreeSha(witness.migration_path)).toBe(witness.migration_tree_sha);
    expect(witness.verification.local_migration_tree_bound).toBe(true);
  });

  it("binds the local-tree witness to the fresh Hosted receipt without granting apply authority", () => {
    const witness = readJson<MigrationTreeWitness>(witnessPath);
    const hosted = readJson<HostedLedgerReceipt>(witness.hosted_ledger_receipt);

    expect(hosted.project_ref).toBe(witness.hosted_project_ref);
    expect(hosted.migration_count).toBe(witness.hosted_migration_count);
    expect(hosted.ordered_ledger_md5).toBe(witness.hosted_ordered_ledger_md5);
    expect(witness.hosted_migration_count).toBe(72);
    expect(witness.hosted_ordered_ledger_md5).toBe("61da7181eb49c180fc1100b09f32f20e");
    expect(witness.verification.hosted_ledger_fresh_read_only).toBe(true);

    expect(hosted.hosted_mutation_performed).toBe(false);
    expect(hosted.linked_cli_inventory_proven).toBe(false);
    expect(hosted.linked_db_push_dry_run_proven).toBe(false);
    expect(hosted.ready_for_apply).toBe(false);
    expect(witness.verification.hosted_mutation_performed).toBe(false);
    expect(witness.verification.linked_cli_inventory_proven).toBe(false);
    expect(witness.verification.linked_db_push_dry_run_proven).toBe(false);
    expect(witness.verification.ready_for_apply).toBe(false);
  });
});
