import { describe, expect, it } from "vitest";

import { verifyExactApplySet } from "./supabase-dry-run-apply-set.mjs";

const localMigrationPaths = [
  "supabase/migrations/20260831225500_scope_matter_staff_access.sql",
  "supabase/migrations/20260901025800_room_factory_atomic_non_encounter.sql",
  "supabase/migrations/20260904105500_harden_profile_role_authority.sql",
];

describe("Supabase linked dry-run apply-set guard", () => {
  it("accepts only the exact allow-listed migration", () => {
    const dryRunText = [
      "DRY RUN: no migrations will be applied",
      "20260901025800_room_factory_atomic_non_encounter.sql",
    ].join("\n");

    expect(
      verifyExactApplySet({
        dryRunText,
        localMigrationPaths,
        expectedBasenames: ["20260901025800_room_factory_atomic_non_encounter.sql"],
      }),
    ).toEqual(["20260901025800_room_factory_atomic_non_encounter.sql"]);
  });

  it("blocks if an older staff-scope migration also appears pending", () => {
    const dryRunText = [
      "20260831225500_scope_matter_staff_access.sql",
      "20260901025800_room_factory_atomic_non_encounter.sql",
    ].join("\n");

    expect(() =>
      verifyExactApplySet({
        dryRunText,
        localMigrationPaths,
        expectedBasenames: ["20260901025800_room_factory_atomic_non_encounter.sql"],
      }),
    ).toThrow(/apply set mismatch/);
  });

  it("blocks when the CLI output does not expose a recognizable local migration version", () => {
    expect(() =>
      verifyExactApplySet({
        dryRunText: "Linked project is up to date.",
        localMigrationPaths,
        expectedBasenames: ["20260901025800_room_factory_atomic_non_encounter.sql"],
      }),
    ).toThrow(/did not identify any local migration version/);
  });

  it("blocks an allow-list entry that does not exist in the exact checkout", () => {
    expect(() =>
      verifyExactApplySet({
        dryRunText: "20260901025800_room_factory_atomic_non_encounter.sql",
        localMigrationPaths,
        expectedBasenames: ["20260909999999_not_in_checkout.sql"],
      }),
    ).toThrow(/not present in local checkout/);
  });
});
