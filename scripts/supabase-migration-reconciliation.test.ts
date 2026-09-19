import { describe, expect, it } from "vitest";

import { parseMigrationList, reconcileMigrationList } from "./supabase-migration-reconciliation.mjs";

const localMigrationPaths = [
  "supabase/migrations/20260831225500_scope_matter_staff_access.sql",
  "supabase/migrations/20260901025800_room_factory_atomic_non_encounter.sql",
  "supabase/migrations/20260904105500_harden_profile_role_authority.sql",
];

describe("Supabase linked migration reconciliation", () => {
  it("maps exact, local-only and remote-only versions without inferring history repair", () => {
    const migrationListText = [
      "LOCAL           │ REMOTE          │ TIME (UTC)",
      "────────────────┼─────────────────┼──────────────────────",
      "20260831225500  │                 │ 2026-08-31 22:55:00",
      "20260901025800  │ 20260901025800  │ 2026-09-01 02:58:00",
      "                │ 20260901023602  │ 2026-09-01 02:36:02",
      "20260904105500  │                 │ 2026-09-04 10:55:00",
    ].join("\n");

    expect(reconcileMigrationList({ migrationListText, localMigrationPaths })).toEqual({
      counts: { local: 3, remote: 2, exact: 1, local_only: 2, remote_only: 1 },
      exact: [
        {
          version: "20260901025800",
          basename: "20260901025800_room_factory_atomic_non_encounter.sql",
        },
      ],
      local_only: [
        {
          version: "20260831225500",
          basename: "20260831225500_scope_matter_staff_access.sql",
        },
        {
          version: "20260904105500",
          basename: "20260904105500_harden_profile_role_authority.sql",
        },
      ],
      remote_only: [{ version: "20260901023602" }],
    });
  });

  it("accepts the ASCII pipe form as well as the Unicode CLI table form", () => {
    expect(
      parseMigrationList(
        [
          "LOCAL | REMOTE | TIME (UTC)",
          "20260831225500 | | 2026-08-31 22:55:00",
          "| 20260901023602 | 2026-09-01 02:36:02",
        ].join("\n"),
      ),
    ).toEqual([
      { local: "20260831225500", remote: null },
      { local: null, remote: "20260901023602" },
    ]);
  });

  it("blocks when no recognizable migration rows are present", () => {
    expect(() => parseMigrationList("Connecting to remote database...\nNo migration rows here.")).toThrow(
      /did not contain any recognizable migration rows/,
    );
  });

  it("blocks if the CLI reports a local version missing from the exact checkout", () => {
    expect(() =>
      reconcileMigrationList({
        migrationListText: "20260909999999 │ │ 2026-09-09 99:99:99",
        localMigrationPaths,
      }),
    ).toThrow(/local version not present in exact checkout/);
  });

  it("blocks duplicate versions instead of silently normalizing ambiguous output", () => {
    expect(() =>
      parseMigrationList(
        [
          "20260831225500 │ │ 2026-08-31 22:55:00",
          "20260831225500 │ │ 2026-08-31 22:55:00",
        ].join("\n"),
      ),
    ).toThrow(/duplicate local migration-list version/);
  });
});
