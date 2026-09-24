import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath = "scripts/room-factory-write-authority-readback-20260923-2346.json";
const evidenceRaw = fs.readFileSync(evidencePath, "utf8");
const evidence = JSON.parse(evidenceRaw) as {
  source: {
    query_mode: string;
    hosted_mutation_performed: boolean;
    production_master_sha: string;
    pre_change_pr_head_sha: string;
    restore_ref: string;
  };
  room_factory_manifests: {
    rls_enabled: boolean;
    force_rls: boolean;
    role_privileges: Record<"anon" | "authenticated" | "service_role", string[]>;
    policies: Array<{ name: string; command: string; role: string }>;
  };
  atomic_room_factory_path: {
    private_create_function: {
      schema: string;
      name: string;
      security_definer: boolean;
      authenticated_execute_grant_observed: boolean;
    };
    public_wrapper: {
      schema: string;
      name: string;
      security_definer: boolean;
      authenticated_execute_grant_observed: boolean;
    };
  };
  acl_hardening_candidate: {
    version: string;
    name: string;
    source_sha: string;
    hosted_ledger_match_count: number;
  };
  interpretation: {
    atomic_rpc_path_exists: boolean;
    authenticated_direct_manifest_insert_still_possible_subject_to_rls: boolean;
    anonymous_table_grants_are_broad_but_no_anon_policy_was_observed: boolean;
    hosted_acl_hardening_verified: boolean;
    room_factory_write_authority_status: string;
    first_wave_disposition: string;
    country_ready_claimed: boolean;
  };
};

const allTablePrivileges = [
  "DELETE",
  "INSERT",
  "REFERENCES",
  "SELECT",
  "TRIGGER",
  "TRUNCATE",
  "UPDATE",
];

const migrationPath = "supabase/migrations/20260911045100_room_factory_manifest_acl_hardening.sql";
const migrationSql = fs.readFileSync(migrationPath, "utf8");

describe("2026-09-23 Hosted Room Factory write-authority readback", () => {
  it("preserves the read-only boundary and stable restore point", () => {
    expect(evidence.source.query_mode).toBe("READ_ONLY");
    expect(evidence.source.hosted_mutation_performed).toBe(false);
    expect(evidence.source.production_master_sha).toBe(
      "33da2a917dc6adcf266f59f0b27d18a56f1271d8",
    );
    expect(evidence.source.pre_change_pr_head_sha).toBe(
      "b9217603725dae448c8d8b003d139beba60fb5d0",
    );
    expect(evidence.source.restore_ref).toBe(
      "restore/2026-09-23-2346-pr696-pre-room-factory-write-authority",
    );
  });

  it("records the current Hosted manifest ACL exactly enough to fail closed", () => {
    expect(evidence.room_factory_manifests.rls_enabled).toBe(true);
    expect(evidence.room_factory_manifests.force_rls).toBe(false);
    expect(evidence.room_factory_manifests.role_privileges.anon).toEqual(allTablePrivileges);
    expect(evidence.room_factory_manifests.role_privileges.authenticated).toEqual(
      allTablePrivileges,
    );
    expect(evidence.room_factory_manifests.policies.map((policy) => `${policy.command}:${policy.name}`)).toEqual([
      "INSERT:room_factory_manifests_insert_owner",
      "SELECT:room_factory_manifests_select",
    ]);
  });

  it("distinguishes the intended atomic path from the still-open direct INSERT path", () => {
    expect(evidence.atomic_room_factory_path.private_create_function).toMatchObject({
      schema: "private",
      name: "create_room_factory_room_atomic",
      security_definer: true,
      authenticated_execute_grant_observed: false,
    });
    expect(evidence.atomic_room_factory_path.public_wrapper).toMatchObject({
      schema: "public",
      name: "create_room_factory_room_atomic",
      security_definer: false,
      authenticated_execute_grant_observed: true,
    });
    expect(evidence.interpretation.atomic_rpc_path_exists).toBe(true);
    expect(
      evidence.interpretation.authenticated_direct_manifest_insert_still_possible_subject_to_rls,
    ).toBe(true);
  });

  it("proves the source-only ACL hardening candidate has not been promoted to Hosted evidence", () => {
    expect(evidence.acl_hardening_candidate).toMatchObject({
      version: "20260911045100",
      name: "room_factory_manifest_acl_hardening",
      source_sha: "637f759884f099e37257c021c9dbb09badc9e799",
      hosted_ledger_match_count: 0,
    });
    expect(migrationSql).toContain("revoke select, insert, update, delete, truncate, references, trigger");
    expect(migrationSql).toContain("revoke insert, update, delete, truncate, references, trigger");
    expect(migrationSql).toContain("drop policy if exists room_factory_manifests_insert_owner");
    expect(evidence.interpretation.hosted_acl_hardening_verified).toBe(false);
  });

  it("keeps all first-wave countries fail-closed on Room Factory write authority", () => {
    expect(evidence.interpretation.room_factory_write_authority_status).toBe("NEEDS_REVIEW");
    expect(evidence.interpretation.first_wave_disposition).toBe("HOLD");
    expect(evidence.interpretation.country_ready_claimed).toBe(false);
  });

  it("does not mistake broad anonymous grants for a proven anonymous data path", () => {
    expect(evidence.interpretation.anonymous_table_grants_are_broad_but_no_anon_policy_was_observed).toBe(
      true,
    );
    expect(
      evidence.room_factory_manifests.policies.some((policy) => policy.role === "anon"),
    ).toBe(false);
  });

  it("contains no customer identifiers", () => {
    expect(evidenceRaw).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    );
    expect(evidenceRaw).not.toMatch(/\bRC\s+[0-9]{7}\b/);
  });
});
