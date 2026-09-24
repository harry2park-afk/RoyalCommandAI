import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const evidencePath = new URL(
  './supabase-hosted-row76-account-seed-20260923-1851.json',
  import.meta.url,
);
const rawEvidence = readFileSync(evidencePath, 'utf8');
const evidence = JSON.parse(rawEvidence);

describe('Hosted row 76 account-specific seed provenance gate 2026-09-23', () => {
  it('records the hosted structure without storing or publishing the account identifier', () => {
    expect(evidence.contract_version).toBe(1);
    expect(evidence.capture_mode).toBe('READ_ONLY');
    expect(evidence.hosted_mutation_performed).toBe(false);
    expect(evidence.hosted_row.version).toBe('20260920091809');
    expect(evidence.hosted_row.name).toBe('add_secure_rc_customer_numbers');
    expect(evidence.hosted_row.creates_reusable_sequence).toBe(true);
    expect(evidence.hosted_row.creates_customer_accounts_table).toBe(true);
    expect(evidence.hosted_row.enables_rls).toBe(true);
    expect(evidence.hosted_row.defines_security_definer_account_helper).toBe(true);
    expect(evidence.hosted_row.includes_account_specific_seed_backfill).toBe(true);
    expect(evidence.hosted_row.account_specific_identifier_stored).toBe(false);
    expect(evidence.hosted_row.account_specific_identifier_published).toBe(false);
  });

  it('keeps provenance and independent authorization unresolved when repository searches find no source', () => {
    expect(evidence.provenance.exact_version_search_match_found).toBe(false);
    expect(evidence.provenance.migration_name_search_match_found).toBe(false);
    expect(evidence.provenance.sequence_name_search_match_found).toBe(false);
    expect(evidence.provenance.legacy_candidate_filename_search_match_found).toBe(false);
    expect(evidence.provenance.original_git_source_provenance).toBe('UNRESOLVED');
    expect(evidence.provenance.independent_reviewer_or_change_record_authority).toBe('UNRESOLVED');
  });

  it('fails closed because account-specific data may not be normalized into a reusable migration baseline', () => {
    expect(evidence.safety.mixed_reusable_schema_and_account_specific_data_mutation).toBe(true);
    expect(evidence.safety.account_specific_backfill_may_be_normalized_into_reusable_baseline).toBe(false);
    expect(evidence.safety.trusted_replay_baseline).toBe('BLOCKED');
    expect(evidence.safety.linked_dry_run_authorized).toBe(false);
    expect(evidence.safety.safe_deploy_blocked).toBe(true);
    expect(evidence.launch_implication.country_ready).toBe(false);
    expect(evidence.launch_implication.first_wave_disposition).toBe('HOLD');
  });

  it('contains no raw account identifier field or SQL statement payload', () => {
    expect(rawEvidence).not.toMatch(/owner_id\s*[:=]/i);
    expect(rawEvidence).not.toMatch(/insert\s+into/i);
    expect(rawEvidence).not.toMatch(/auth\.users/i);
    expect(rawEvidence).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});
