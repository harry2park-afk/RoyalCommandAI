import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const CANDIDATES = {
  matterIsolation: "supabase/migrations/20260831225500_scope_matter_staff_access.sql",
  roomFactoryNonEncounter:
    "supabase/migrations/20260901025800_room_factory_atomic_non_encounter.sql",
  complianceRegistry:
    "supabase/migrations/20260903075000_country_compliance_evidence_registry.sql",
  paymentSafeguards:
    "supabase/migrations/20260903205500_payment_operational_safeguards.sql",
  profileRoleAuthority:
    "supabase/migrations/20260904105500_harden_profile_role_authority.sql",
  manifestAcl:
    "supabase/migrations/20260911045100_room_factory_manifest_acl_hardening.sql",
} as const;

const FIRST_WAVE_SNAPSHOT = "scripts/supabase-first-wave-launch-snapshot.sql";
const AUTH_DATA_ISOLATION_SNAPSHOT = "scripts/supabase-auth-data-isolation-wave-snapshot.sql";

function migration(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("October launch Supabase candidate blocker coverage", () => {
  it("keeps the reviewed six-migration candidate set complete", () => {
    expect(Object.values(CANDIDATES)).toEqual([
      "supabase/migrations/20260831225500_scope_matter_staff_access.sql",
      "supabase/migrations/20260901025800_room_factory_atomic_non_encounter.sql",
      "supabase/migrations/20260903075000_country_compliance_evidence_registry.sql",
      "supabase/migrations/20260903205500_payment_operational_safeguards.sql",
      "supabase/migrations/20260904105500_harden_profile_role_authority.sql",
      "supabase/migrations/20260911045100_room_factory_manifest_acl_hardening.sql",
    ]);
  });

  it("keeps the first-wave Hosted snapshot aligned to the exact reviewed candidate names", () => {
    const sql = migration(FIRST_WAVE_SNAPSHOT);

    expect(sql).toContain("'scope_matter_staff_access'");
    expect(sql).toContain("'room_factory_atomic_non_encounter'");
    expect(sql).toContain("'country_compliance_evidence_registry'");
    expect(sql).toContain("'payment_operational_safeguards'");
    expect(sql).toContain("'harden_profile_role_authority'");
    expect(sql).toContain("'room_factory_manifest_acl_hardening'");
    expect(sql).not.toContain("'room_factory_manifest_atomic_only'");
  });

  it("closes profile-role escalation before the first role-gated Matter authorization is installed", () => {
    const sql = migration(CANDIDATES.matterIsolation);
    const roleGuardIndex = sql.indexOf("create or replace function private.guard_profile_role_change()");
    const signupGuardIndex = sql.indexOf("create or replace function public.handle_new_user()");
    const adminGateIndex = sql.indexOf("create or replace function private.is_admin()");

    expect(roleGuardIndex).toBeGreaterThanOrEqual(0);
    expect(signupGuardIndex).toBeGreaterThan(roleGuardIndex);
    expect(adminGateIndex).toBeGreaterThan(signupGuardIndex);
    expect(sql).toContain("new.role is distinct from old.role");
    expect(sql).toContain("revoke update on table public.profiles from anon, authenticated;");
    expect(sql).toMatch(/grant update \(full_name, default_language, avatar_url, ui_preferences, updated_at\)[\s\S]*to authenticated;/);
    expect(sql).toContain("'client'");
    expect(sql).not.toContain("raw_user_meta_data->>'role'");
  });

  it("covers Matter tenant and assignment authority without broad untrusted UPDATE", () => {
    const sql = migration(CANDIDATES.matterIsolation);

    expect(sql).toContain("revoke update on table public.matters from anon, authenticated;");
    expect(sql).toMatch(/grant update \(service_line, title, summary, status, updated_at\)[\s\S]*to authenticated;/);
    expect(sql).toContain("public.set_matter_staff_assignment");
    expect(sql).toContain("matter assignment requires admin role");
    expect(sql).toContain("client_id = auth.uid()");
    expect(sql).toContain("private.is_assigned_matter_staff(id)");
  });

  it("keeps auth/data-isolation read-back fail-closed for anon and authenticated sensitive columns", () => {
    const sql = migration(AUTH_DATA_ISOLATION_SNAPSHOT);

    expect(sql).toContain("'profiles_role_anon_update'");
    expect(sql).toContain("'profiles_role_authenticated_update'");
    expect(sql).toContain("'matters_client_id_anon_update'");
    expect(sql).toContain("'matters_client_id_authenticated_update'");
    expect(sql).toContain("'matters_assigned_staff_id_anon_update'");
    expect(sql).toContain("'matters_assigned_staff_id_authenticated_update'");
    expect(sql).toMatch(/'profile_role_direct_update_blocked'[\s\S]*not has_column_privilege\('anon',[\s\S]*and not has_column_privilege\('authenticated'/);
    expect(sql).toMatch(/'matter_identity_assignment_direct_update_blocked'[\s\S]*not has_column_privilege\('anon',[\s\S]*and not has_column_privilege\('authenticated'/);
  });

  it("covers authenticated atomic non-encounter Room creation and keeps encounter identity strict", () => {
    const sql = migration(CANDIDATES.roomFactoryNonEncounter);

    expect(sql).toContain("if v_user_id is null then");
    expect(sql).toContain("Non-encounter Room creation must not persist an encounterSessionId.");
    expect(sql).toContain("Manifest encounterSessionId does not match the authoritative encounter key.");
    expect(sql).toContain("if p_encounter_session_id is not null then");
    expect(sql).toContain("insert into public.room_factory_manifests");
  });

  it("closes direct manifest writes before installing non-encounter Room creation", () => {
    const sql = migration(CANDIDATES.roomFactoryNonEncounter);
    const anonRevokeIndex = sql.indexOf(
      "revoke select, insert, update, delete, truncate, references, trigger",
    );
    const authenticatedRevokeIndex = sql.indexOf(
      "revoke insert, update, delete, truncate, references, trigger",
      anonRevokeIndex + 1,
    );
    const legacyPolicyDropIndex = sql.indexOf(
      "drop policy if exists room_factory_manifests_insert_owner",
    );
    const nonEncounterFunctionIndex = sql.indexOf(
      "create or replace function private.create_room_factory_room_atomic(",
    );

    expect(anonRevokeIndex).toBeGreaterThanOrEqual(0);
    expect(authenticatedRevokeIndex).toBeGreaterThan(anonRevokeIndex);
    expect(legacyPolicyDropIndex).toBeGreaterThan(authenticatedRevokeIndex);
    expect(nonEncounterFunctionIndex).toBeGreaterThan(legacyPolicyDropIndex);
    expect(sql).toMatch(/grant select[\s\S]*on table public\.room_factory_manifests[\s\S]*to authenticated;/);
  });

  it("covers a server-owned fail-closed compliance evidence registry without verified seed data", () => {
    const sql = migration(CANDIDATES.complianceRegistry);

    expect(sql).toContain("create table if not exists public.country_compliance_evidence");
    expect(sql).toContain("review_status text not null default 'NEEDS_REVIEW'");
    expect(sql).toContain("country_compliance_evidence_verified_check");
    expect(sql).toContain("revoke all on table public.country_compliance_evidence from anon;");
    expect(sql).toContain("revoke all on table public.country_compliance_evidence from authenticated;");
    expect(sql).not.toMatch(/insert\s+into\s+public\.country_compliance_evidence/i);
  });

  it("covers payment provider fail-closed state, timestamped verified webhooks and order idempotency", () => {
    const sql = migration(CANDIDATES.paymentSafeguards);

    expect(sql).toContain("status text not null default 'disabled'");
    expect(sql).toContain("rc_payment_provider_registry_status_environment_match");
    expect(sql).toMatch(/status = 'disabled'[\s\S]*environment = 'sandbox' and status = 'sandbox_ready'[\s\S]*environment = 'production' and status = 'production_ready'/);
    expect(sql).toContain("rc_payment_provider_registry_production_capabilities");
    expect(sql).toContain("signature_verified_at timestamptz");
    expect(sql).toContain("rc_payment_provider_events_signature_verification_provenance");
    expect(sql).toMatch(/signature_verified and signature_verified_at is not null/);
    expect(sql).toContain("rc_payment_provider_events_processing_requires_verified_signature");
    expect(sql).toContain("add column if not exists idempotency_key text");
    expect(sql).toContain("rc_service_connection_orders_owner_idempotency_uidx");
    expect(sql).not.toMatch(/insert\s+into\s+public\.rc_payment_provider_registry/i);
  });

  it("covers profile role authority and removes direct authenticated role updates", () => {
    const sql = migration(CANDIDATES.profileRoleAuthority);

    expect(sql).toContain("private.guard_profile_role_change");
    expect(sql).toContain("new.role is distinct from old.role");
    expect(sql).toContain("revoke update on table public.profiles from anon, authenticated;");
    expect(sql).toMatch(/grant update \(full_name, default_language, avatar_url, ui_preferences, updated_at\)[\s\S]*to authenticated;/);
    expect(sql).toContain("'client'");
  });

  it("covers Room Factory manifest ACL hardening without restoring client writes", () => {
    const sql = migration(CANDIDATES.manifestAcl);

    expect(sql).toMatch(/revoke select, insert, update, delete, truncate, references, trigger[\s\S]*from anon;/);
    expect(sql).toMatch(/revoke insert, update, delete, truncate, references, trigger[\s\S]*from authenticated;/);
    expect(sql).toMatch(/grant select[\s\S]*to authenticated;/);
    expect(sql).toContain("drop policy if exists room_factory_manifests_insert_owner");
    expect(sql).not.toMatch(/grant\s+(insert|update|delete)[\s\S]*room_factory_manifests[\s\S]*authenticated/i);
  });
});
