import fs from "node:fs";
import { describe, expect, it } from "vitest";

const evidencePath = "scripts/hosted-acl-readback-20260923-0650.json";
const evidenceRaw = fs.readFileSync(evidencePath, "utf8");
const evidence = JSON.parse(evidenceRaw) as {
  source: {
    query_mode: string;
    hosted_mutation_performed: boolean;
    github_candidate_sha: string;
    production_master_sha: string;
    restore_ref: string;
  };
  tables: {
    rc_customer_accounts: {
      rls_enabled: boolean;
      force_rls: boolean;
      roles: { anon: string[]; authenticated: string[] };
      policies: Array<{ name: string; role: string; command: string; qual?: string }>;
    };
    room_factory_manifests: {
      rls_enabled: boolean;
      force_rls: boolean;
      roles: { anon: string[]; authenticated: string[] };
      policies: Array<{ name: string; role: string; command: string }>;
    };
  };
  customer_number_authority: {
    role_privileges: { anon: string[]; authenticated: string[]; service_role: string[] };
    allocator_function_present: boolean;
  };
  interpretation: {
    customer_account_fixture_matches_anon_no_table_access: boolean;
    customer_account_authenticated_direct_control_is_launch_blocker: boolean;
    room_factory_client_table_privileges_are_launch_blocker: boolean;
    room_factory_hosted_acl_hardening_verified: boolean;
    hosted_remediation_candidate_applied: boolean;
    first_wave_disposition: string;
  };
};

const allTablePrivileges = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
];

describe("2026-09-23 06:50 Hosted ACL readback", () => {
  it("preserves the read-only and production restore boundary", () => {
    expect(evidence.source.query_mode).toBe("READ_ONLY");
    expect(evidence.source.hosted_mutation_performed).toBe(false);
    expect(evidence.source.github_candidate_sha).toBe(
      "df6964c18ad6afecad1b54c7ec83c7e61ce985df",
    );
    expect(evidence.source.production_master_sha).toBe(
      "33da2a917dc6adcf266f59f0b27d18a56f1271d8",
    );
    expect(evidence.source.restore_ref).toBe(
      "restore/2026-09-23-0650-pr696-pre-acl-evidence-correction",
    );
  });

  it("records the corrected customer-account Hosted authority shape", () => {
    const customer = evidence.tables.rc_customer_accounts;
    expect(customer.rls_enabled).toBe(true);
    expect(customer.force_rls).toBe(false);
    expect(customer.roles.anon).toEqual([]);
    expect(customer.roles.authenticated).toEqual(allTablePrivileges);
    expect(customer.policies).toEqual([
      {
        name: "rc_customer_accounts_read_own",
        role: "authenticated",
        command: "SELECT",
        qual: "owner_id = auth.uid()",
      },
    ]);
  });

  it("keeps the Room Factory Hosted client privilege blocker explicit", () => {
    const manifests = evidence.tables.room_factory_manifests;
    expect(manifests.rls_enabled).toBe(true);
    expect(manifests.force_rls).toBe(false);
    expect(manifests.roles.anon).toEqual(allTablePrivileges);
    expect(manifests.roles.authenticated).toEqual(allTablePrivileges);
    expect(manifests.policies.map((policy) => `${policy.command}:${policy.name}`)).toEqual([
      "INSERT:room_factory_manifests_insert_owner",
      "SELECT:room_factory_manifests_select",
    ]);
  });

  it("proves the customer allocator candidate is not present on Hosted", () => {
    expect(evidence.customer_number_authority.role_privileges.anon).toEqual([]);
    expect(evidence.customer_number_authority.role_privileges.authenticated).toEqual([]);
    expect(evidence.customer_number_authority.role_privileges.service_role).toEqual([
      "USAGE",
      "SELECT",
      "UPDATE",
    ]);
    expect(evidence.customer_number_authority.allocator_function_present).toBe(false);
    expect(evidence.interpretation.hosted_remediation_candidate_applied).toBe(false);
  });

  it("keeps first-wave launch fail-closed", () => {
    expect(evidence.interpretation.customer_account_fixture_matches_anon_no_table_access).toBe(true);
    expect(evidence.interpretation.customer_account_authenticated_direct_control_is_launch_blocker).toBe(true);
    expect(evidence.interpretation.room_factory_client_table_privileges_are_launch_blocker).toBe(true);
    expect(evidence.interpretation.room_factory_hosted_acl_hardening_verified).toBe(false);
    expect(evidence.interpretation.first_wave_disposition).toBe("HOLD");
  });

  it("contains no customer identifiers", () => {
    expect(evidenceRaw).not.toMatch(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    );
    expect(evidenceRaw).not.toMatch(/\bRC\s+[0-9]{7}\b/);
  });
});
