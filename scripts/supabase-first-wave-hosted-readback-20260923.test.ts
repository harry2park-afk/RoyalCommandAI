import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const evidence = JSON.parse(
  readFileSync(new URL('./supabase-first-wave-hosted-readback-20260923-1050.json', import.meta.url), 'utf8'),
);

const countries = ['AU', 'US', 'CA', 'KR', 'JP', 'GB'] as const;

describe('first-wave Hosted launch readback 2026-09-23', () => {
  it('is a read-only capture bound to the protected Production baseline', () => {
    expect(evidence.verification_mode).toBe('READ_ONLY_SUPABASE_PLUS_GITHUB');
    expect(evidence.hosted_mutation_performed_by_this_capture).toBe(false);
    expect(evidence.production_master_mutated_by_this_capture).toBe(false);
    expect(evidence.production_master_sha).toBe('33da2a917dc6adcf266f59f0b27d18a56f1271d8');
    expect(evidence.restore_ref).toBe('restore/2026-09-23-1050-pr696-pre-first-wave-hosted-readback');
  });

  it('keeps migration reconciliation fail-closed until row 76 and deployment authority are proven', () => {
    expect(evidence.migration_ledger.count).toBe(80);
    expect(evidence.migration_ledger.head_version).toBe('20260922021440');
    expect(evidence.migration_ledger.row76_original_git_source_verified).toBe(false);
    expect(evidence.migration_ledger.row80_original_git_source_verified).toBe(true);
    expect(evidence.migration_ledger.row80_deployment_authority_verified).toBe(false);
    expect(evidence.migration_ledger.trusted_80_row_baseline_verified).toBe(false);
  });

  it('keeps every first-wave country on HOLD when exact runtime, terms or reviewer evidence is missing', () => {
    for (const code of countries) {
      const country = evidence.first_wave[code];
      expect(country.launch_disposition).toBe('HOLD');
      expect(country.service_country_terms).toBe(0);
      expect(country.recording_reviewed_by_present).toBe(false);
      for (const locale of country.expected_locales) {
        expect(country.exact_runtime_counts[locale]).toBe(0);
        expect(country.encounter_backed_counts[locale]).toBe(0);
      }
    }
  });

  it('does not treat AU Korean manifests as Australia English runtime evidence', () => {
    expect(evidence.first_wave.AU.expected_locales).toEqual(['en-AU']);
    expect(evidence.first_wave.AU.exact_runtime_counts['en-AU']).toBe(0);
    expect(evidence.first_wave.AU.observed_other_manifest_locales).toEqual({ ko: 5, 'ko-KR': 2 });
  });

  it('keeps auth, Room Factory, compliance and payments fail-closed on the current Hosted shape', () => {
    expect(evidence.non_production_staging.supabase_development_branch_count).toBe(0);
    expect(evidence.non_production_staging.verified).toBe(false);
    expect(evidence.hosted_launch_tables.country_compliance_evidence_present).toBe(false);
    expect(evidence.hosted_launch_tables.payment_provider_registry_present).toBe(false);
    expect(evidence.hosted_launch_tables.payment_provider_events_present).toBe(false);
    expect(evidence.hosted_acl.rc_customer_accounts.authenticated_privileges).toContain('INSERT');
    expect(evidence.hosted_acl.rc_customer_accounts.authenticated_privileges).toContain('DELETE');
    expect(evidence.hosted_acl.room_factory_manifests.anon_privileges).toContain('INSERT');
    expect(evidence.hosted_acl.room_factory_manifests.authenticated_privileges).toContain('DELETE');
    expect(evidence.safe_deploy_blocked).toBe(true);
    expect(evidence.country_ready_claimed).toBe(false);
  });

  it('records Security Advisor INFO findings without overstating them as exploit proof', () => {
    expect(evidence.security_advisor.rls_enabled_no_policy_level).toBe('INFO');
    expect(evidence.security_advisor.rls_enabled_no_policy_count).toBe(21);
    expect(evidence.security_advisor.treated_as_exploitable_access_proof).toBe(false);
  });
});
