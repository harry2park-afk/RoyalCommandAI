import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const MIGRATION =
  "supabase/migrations/20260901025800_room_factory_atomic_non_encounter.sql";

function migration(): string {
  return readFileSync(resolve(process.cwd(), MIGRATION), "utf8");
}

describe("Room Factory manifest identity binding", () => {
  it("fails closed when persisted manifest identity/localization disagrees with authoritative columns", () => {
    const sql = migration();

    expect(sql).toContain(
      "p_manifest->>'version' is distinct from btrim(p_factory_version)",
    );
    expect(sql).toContain(
      "p_manifest#>>'{room,templateId}' is distinct from btrim(p_template_id)",
    );
    expect(sql).toContain(
      "p_manifest#>>'{locale,countryCode}' is distinct from btrim(p_country_code)",
    );
    expect(sql).toContain(
      "p_manifest#>>'{locale,languageTag}' is distinct from btrim(p_language_tag)",
    );
    expect(sql).toContain(
      "p_manifest#>>'{locale,countryProfileStatus}' is distinct from p_country_profile_status",
    );

    expect(sql).toContain(
      "Manifest version does not match the authoritative factory version.",
    );
    expect(sql).toContain(
      "Manifest templateId does not match the authoritative template id.",
    );
    expect(sql).toContain(
      "Manifest countryCode does not match the authoritative country code.",
    );
    expect(sql).toContain(
      "Manifest languageTag does not match the authoritative language tag.",
    );
    expect(sql).toContain(
      "Manifest countryProfileStatus does not match the authoritative country profile status.",
    );
  });

  it("checks manifest identity before any owner lock or Room/manifest write", () => {
    const sql = migration();
    const identityGuardIndex = sql.indexOf(
      "Manifest version does not match the authoritative factory version.",
    );
    const ownerLockIndex = sql.indexOf("pg_catalog.pg_advisory_xact_lock");
    const roomInsertIndex = sql.indexOf("insert into public.rooms");
    const manifestInsertIndex = sql.indexOf("insert into public.room_factory_manifests");

    expect(identityGuardIndex).toBeGreaterThanOrEqual(0);
    expect(ownerLockIndex).toBeGreaterThan(identityGuardIndex);
    expect(roomInsertIndex).toBeGreaterThan(ownerLockIndex);
    expect(manifestInsertIndex).toBeGreaterThan(roomInsertIndex);
  });
});
