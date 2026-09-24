import crypto from "node:crypto";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

const baselinePath = "scripts/supabase-hosted-ledger-snapshot-20260908.json";
const previousRefreshPath = "scripts/supabase-hosted-ledger-live-refresh-20260916.json";
const refreshPath = "scripts/supabase-hosted-ledger-live-refresh-20260920.json";

const EXPECTED_CANDIDATE_NAMES = [
  "scope_matter_staff_access",
  "room_factory_atomic_non_encounter",
  "country_compliance_evidence_registry",
  "payment_operational_safeguards",
  "add_room_factory_fk_indexes",
  "harden_profile_role_authority",
  "harden_commercial_review_provenance",
  "room_factory_manifest_acl_hardening",
] as const;

type Migration = { version: string; name: string };

type BaselineSnapshot = {
  captured_at: string;
  project_ref: string;
  migrations: Migration[];
};

type LiveRefreshReceipt = {
  captured_at_utc: string;
  project_ref: string;
  baseline_snapshot: string;
  previous_refresh?: string;
  migration_count: number;
  first_version: string;
  last_version: string;
  ordered_ledger_md5: string;
  matches_baseline_snapshot: boolean;
  matches_previous_refresh?: boolean;
  candidate_name_matches?: number;
  candidate_names?: string[];
  hosted_mutation_performed: boolean;
  linked_cli_inventory_proven: boolean;
  linked_db_push_dry_run_proven: boolean;
  ready_for_apply: boolean;
};

function readJson<T>(path: string): T {
  return JSON.parse(fs.readFileSync(path, "utf8")) as T;
}

function orderedLedgerMd5(migrations: Migration[]): string {
  const canonical = [...migrations]
    .sort((a, b) => a.version.localeCompare(b.version) || a.name.localeCompare(b.name))
    .map(({ version, name }) => `${version}:${name}`)
    .join("\n");

  return crypto.createHash("md5").update(canonical, "utf8").digest("hex");
}

describe("fresh Hosted migration ledger receipt", () => {
  it("proves the latest read-only ledger fingerprint still matches the captured baseline exactly", () => {
    const baseline = readJson<BaselineSnapshot>(baselinePath);
    const previousRefresh = readJson<LiveRefreshReceipt>(previousRefreshPath);
    const refresh = readJson<LiveRefreshReceipt>(refreshPath);
    const ordered = [...baseline.migrations].sort(
      (a, b) => a.version.localeCompare(b.version) || a.name.localeCompare(b.name),
    );

    expect(refresh.project_ref).toBe("aygawkavujjmybekswrg");
    expect(refresh.baseline_snapshot).toBe(baselinePath);
    expect(refresh.previous_refresh).toBe(previousRefreshPath);
    expect(refresh.migration_count).toBe(baseline.migrations.length);
    expect(refresh.migration_count).toBe(72);
    expect(refresh.first_version).toBe(ordered.at(0)?.version);
    expect(refresh.last_version).toBe(ordered.at(-1)?.version);
    expect(refresh.ordered_ledger_md5).toBe(orderedLedgerMd5(baseline.migrations));
    expect(refresh.ordered_ledger_md5).toBe(previousRefresh.ordered_ledger_md5);
    expect(refresh.matches_baseline_snapshot).toBe(true);
    expect(refresh.matches_previous_refresh).toBe(true);
    expect(Date.parse(refresh.captured_at_utc)).toBeGreaterThan(
      Date.parse(previousRefresh.captured_at_utc),
    );
  });

  it("proves the reviewed eight migration names are still absent from the Hosted ledger", () => {
    const refresh = readJson<LiveRefreshReceipt>(refreshPath);

    expect(refresh.candidate_names).toEqual(EXPECTED_CANDIDATE_NAMES);
    expect(refresh.candidate_name_matches).toBe(0);
  });

  it("does not convert no-drift evidence into linked migration or deployment authority", () => {
    const refresh = readJson<LiveRefreshReceipt>(refreshPath);

    expect(refresh.hosted_mutation_performed).toBe(false);
    expect(refresh.linked_cli_inventory_proven).toBe(false);
    expect(refresh.linked_db_push_dry_run_proven).toBe(false);
    expect(refresh.ready_for_apply).toBe(false);
  });
});
