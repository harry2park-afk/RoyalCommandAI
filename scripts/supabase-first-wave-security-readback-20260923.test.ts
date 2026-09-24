import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const evidence = JSON.parse(
  readFileSync(new URL('./supabase-first-wave-security-readback-20260923-1249.json', import.meta.url), 'utf8'),
);

const countries = ['AU', 'US', 'CA', 'KR', 'JP', 'GB'] as const;

describe('first-wave Hosted security readback 2026-09-23 12:49 AEST', () => {
  it('is read-only and preserves the protected Production baseline plus restore ref', () => {
    expect(evidence.verification_mode).toBe('READ_ONLY_SUPABASE_PLUS_GITHUB');
    expect(evidence.hosted_mutation_performed_by_this_capture).toBe(false);
    expect(evidence.production_master_mutated_by_this_capture).toBe(false);
    expect(evidence.production_master_sha).toBe('33da2a917dc6adcf266f59f0b27d18a56f1271d8');
    expect(evidence.restore_ref).toBe('restore/2026-09-23-1247-pr696-pre-country-config-evidence');
  });

  it('does not confuse candidate migrations in the PR with Hosted deployment', () => {
    expect(evidence.migration_ledger.count).toBe(80);
    expect(evidence.migration_ledger.head_version).toBe('20260922021440');
    for (const migration of Object.values(evidence.migration_ledger.required_candidate_migrations) as Array<{
      hosted_rows: number;
      candidate_present_in_pr: boolean;
    }>) {
      expect(migration.candidate_present_in_pr).toBe(true);
      expect(migration.hosted_rows).toBe(0);
    }
    expect(evidence.migration_ledger.trusted_80_row_baseline_verified).toBe(false);
  });

  it('keeps Legal tenant isolation fail-closed on the current Hosted state', () => {
    expect(evidence.legal_matter_isolation.client_id_updateable_by_authenticated).toBe(true);
    expect(evidence.legal_matter_isolation.assigned_staff_id_updateable_by_authenticated).toBe(true);
    expect(evidence.legal_matter_isolation.private_is_admin_present).toBe(false);
    expect(evidence.legal_matter_isolation.private_is_assigned_matter_staff_present).toBe(false);
    expect(evidence.legal_matter_isolation.set_matter_staff_assignment_present).toBe(false);
    expect(evidence.legal_matter_isolation.policies_using_broad_staff_helper).toBe(3);
    expect(evidence.legal_matter_isolation.policies_using_assignment_helper).toBe(0);
    expect(evidence.legal_matter_isolation.broad_staff_policy_names).toEqual([
      'matters_insert_own',
      'matters_select_own_or_staff',
      'matters_update_own_or_staff',
    ]);
    expect(evidence.legal_matter_isolation.hosted_scope_matter_staff_access_rows).toBe(0);
    expect(evidence.legal_matter_isolation.verified).toBe(false);
  });

  it('keeps profile role authority fail-closed on the current Hosted authority path', () => {
    expect(evidence.profile_role_authority.authenticated_role_update_privilege).toBe(true);
    expect(evidence.profile_role_authority.authenticated_profile_update_privilege).toBe(true);
    expect(evidence.profile_role_authority.role_guard_trigger_count).toBe(0);
    expect(evidence.profile_role_authority.handle_new_user_uses_raw_metadata_role).toBe(true);
    expect(evidence.profile_role_authority.profile_update_policy_count).toBe(1);
    expect(evidence.profile_role_authority.hosted_harden_profile_role_authority_rows).toBe(0);
    expect(evidence.profile_role_authority.verified).toBe(false);
  });

  it('keeps Room Factory and customer-account authority fail-closed on broad Hosted writes', () => {
    expect(evidence.room_factory.rls_enabled).toBe(true);
    expect(evidence.room_factory.force_rls).toBe(false);
    expect(evidence.room_factory.anon_direct_manifest_insert).toBe(true);
    expect(evidence.room_factory.authenticated_direct_manifest_insert).toBe(true);
    expect(evidence.room_factory.authenticated_direct_manifest_update).toBe(true);
    expect(evidence.room_factory.authenticated_direct_manifest_delete).toBe(true);
    expect(evidence.customer_account_authority.anon_direct_insert).toBe(false);
    expect(evidence.customer_account_authority.authenticated_direct_insert).toBe(true);
    expect(evidence.customer_account_authority.authenticated_direct_update).toBe(true);
    expect(evidence.customer_account_authority.authenticated_direct_delete).toBe(true);
    expect(evidence.room_factory.verified).toBe(false);
    expect(evidence.customer_account_authority.verified).toBe(false);
  });

  it('keeps the first-wave runtime and country launch state on HOLD', () => {
    for (const code of countries) {
      const runtime = evidence.room_factory.first_wave_runtime[code];
      expect(runtime.exact_locale_rows).toBe(0);
      expect(runtime.encounter_backed_exact_runtime_rows).toBe(0);
      expect(evidence.commercial_compliance_payment.first_wave_country_term_rows[code]).toBe(0);
      expect(evidence.commercial_compliance_payment.reviewer_proven_recording_rows[code]).toBe(0);
      expect(evidence.first_wave_disposition[code]).toBe('HOLD');
    }
    expect(evidence.room_factory.au_observed_other_locales).toEqual({ ko: 5, 'ko-KR': 2 });
  });

  it('requires controlled non-Production staging and real compliance/payment evidence', () => {
    expect(evidence.non_production_staging.supabase_development_branch_count).toBe(0);
    expect(evidence.non_production_staging.verified).toBe(false);
    expect(evidence.commercial_compliance_payment.country_compliance_evidence_present).toBe(false);
    expect(evidence.commercial_compliance_payment.payment_provider_registry_present).toBe(false);
    expect(evidence.commercial_compliance_payment.payment_provider_events_present).toBe(false);
    expect(evidence.commercial_compliance_payment.verified).toBe(false);
    expect(evidence.safe_deploy_blocked).toBe(true);
    expect(evidence.country_ready_claimed).toBe(false);
  });

  it('records Security Advisor INFO findings without overstating them as exploit proof', () => {
    expect(evidence.security_advisor.rls_enabled_no_policy_level).toBe('INFO');
    expect(evidence.security_advisor.rls_enabled_no_policy_count).toBe(21);
    expect(evidence.security_advisor.treated_as_exploitable_access_proof).toBe(false);
  });
});
