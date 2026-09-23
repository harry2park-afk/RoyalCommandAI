import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const evidence = JSON.parse(
  readFileSync(
    new URL('./supabase-hosted-ledger-actor-continuity-20260923-1747.json', import.meta.url),
    'utf8',
  ),
);

describe('Hosted ledger actor continuity evidence 2026-09-23', () => {
  it('records rows 76 and 80 without exposing raw deployment identity', () => {
    expect(evidence.contract_version).toBe(1);
    expect(evidence.capture_mode).toBe('READ_ONLY');
    expect(evidence.hosted_mutation_performed).toBe(false);
    expect(evidence.rows).toHaveLength(2);

    const row76 = evidence.rows[0];
    const row80 = evidence.rows[1];

    expect(row76.version).toBe('20260920091809');
    expect(row76.name).toBe('add_secure_rc_customer_numbers');
    expect(row76.statements_md5).toBe('9b70e55a43515314977d1f12de9149e1');
    expect(row76.created_by_present).toBe(true);
    expect(row76.created_by_value_published).toBe(false);

    expect(row80.version).toBe('20260922021440');
    expect(row80.name).toBe('rcv3_preview_email_outbox');
    expect(row80.statements_md5).toBe('2f983fe4614f793e935835f370c1ea10');
    expect(row80.created_by_present).toBe(true);
    expect(row80.created_by_value_published).toBe(false);
  });

  it('proves only same-actor continuity and keeps source/reviewer authority fail-closed', () => {
    const row76 = evidence.rows[0];
    const row80 = evidence.rows[1];

    expect(row76.created_by_md5).toBe(row80.created_by_md5);
    expect(evidence.continuity.same_created_by_fingerprint).toBe(true);
    expect(evidence.continuity.same_deployer_actor_continuity_narrowed).toBe(true);

    expect(row76.original_git_source_provenance_verified).toBe(false);
    expect(row76.independent_reviewer_or_change_record_verified).toBe(false);
    expect(row80.original_git_source_provenance_verified).toBe(true);
    expect(row80.independent_reviewer_or_change_record_verified).toBe(false);

    expect(evidence.continuity.proves_row76_source_artifact).toBe(false);
    expect(evidence.continuity.proves_row76_reviewer_authority).toBe(false);
    expect(evidence.continuity.proves_row80_deployment_authority).toBe(false);
  });

  it('keeps replay and deployment blocked because rollback/idempotency and approval evidence are absent', () => {
    for (const row of evidence.rows) {
      expect(row.idempotency_key_present).toBe(false);
      expect(row.rollback_count).toBe(0);
    }

    expect(evidence.safety_observations.both_rows_have_idempotency_key).toBe(false);
    expect(evidence.safety_observations.both_rows_have_rollback_statements).toBe(false);
    expect(evidence.continuity.trusted_80_row_baseline_may_advance).toBe(false);
    expect(evidence.continuity.linked_dry_run_authorized).toBe(false);
    expect(evidence.continuity.safe_deploy_blocked).toBe(true);
    expect(evidence.launch_implication.country_ready).toBe(false);
    expect(evidence.launch_implication.first_wave_disposition).toBe('HOLD');
  });
});
