import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  assessKnownLedgerForApplySet,
  reconcileHostedLedger,
} from "./supabase-hosted-ledger-reconciliation.mjs";

const snapshotPath = "scripts/supabase-hosted-ledger-snapshot-20260908.json";
const migrationDir = "supabase/migrations";
const expectedMigration = "20260831225500_scope_matter_staff_access.sql";

function loadCurrentEvidence() {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const localMigrationPaths = fs
    .readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => path.join(migrationDir, entry.name));
  return reconcileHostedLedger({ snapshot, localMigrationPaths });
}

describe("captured Hosted migration ledger reconciliation", () => {
  it("fails closed on the current #696 checkout instead of treating the credential blocker as the only blocker", () => {
    const reconciliation = loadCurrentEvidence();

    expect(reconciliation.counts).toEqual({
      local_timestamped: 42,
      hosted: 72,
      exact_by_version: 0,
      local_only_by_version: 42,
      remote_only_by_version: 72,
      same_name_timestamp_drift: 35,
      unresolved_local_names: 7,
      unresolved_hosted_names: 36,
    });

    expect(reconciliation.local_only).toContainEqual({
      version: "20260831225500",
      name: "scope_matter_staff_access",
      basename: expectedMigration,
    });
    expect(reconciliation.remote_only).toContainEqual({
      version: "20260831053602",
      name: "allow_room_owner_delete",
    });
    expect(reconciliation.same_name_timestamp_drift).toContainEqual({
      local_version: "20260831084700",
      local_basename: "20260831084700_atomic_room_factory_encounter_creation.sql",
      name: "atomic_room_factory_encounter_creation",
      remote_versions: ["20260901021811"],
    });

    const assessment = assessKnownLedgerForApplySet({
      reconciliation,
      expectedBasenames: [expectedMigration],
    });

    expect(assessment.ready).toBe(false);
    expect(assessment.missing_expected).toEqual([]);
    expect(assessment.unexpected_local_only).toHaveLength(41);
    expect(assessment.blockers).toEqual([
      "known Hosted ledger has 72 REMOTE-only version(s); source/Hosted parity is unresolved",
      "known checkout has 41 LOCAL-only migration(s) outside the explicit allow-list",
    ]);
  });

  it("allows only a clean known ledger with exactly the explicit local-only apply set", () => {
    const snapshot = {
      contract_version: 1,
      captured_at: "synthetic",
      project_ref: "test",
      migrations: [{ version: "20260901000000", name: "already_applied" }],
    };
    const reconciliation = reconcileHostedLedger({
      snapshot,
      localMigrationPaths: [
        "supabase/migrations/20260901000000_already_applied.sql",
        "supabase/migrations/20260902000000_candidate.sql",
      ],
    });

    expect(
      assessKnownLedgerForApplySet({
        reconciliation,
        expectedBasenames: ["20260902000000_candidate.sql"],
      }),
    ).toEqual({
      ready: true,
      expected_apply_migrations: ["20260902000000_candidate.sql"],
      blockers: [],
      unexpected_local_only: [],
      missing_expected: [],
    });
  });
});
