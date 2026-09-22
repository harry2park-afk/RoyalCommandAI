import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const evidence = JSON.parse(
  readFileSync(new URL('./supabase-hosted-ledger-drift-20260922-1250.json', import.meta.url), 'utf8'),
);

describe('Hosted ledger drift evidence 2026-09-22', () => {
  it('records the new 80th Hosted migration without treating source recovery as approval', () => {
    expect(evidence.previous_observed_migration_count).toBe(79);
    expect(evidence.migration_count).toBe(80);
    expect(evidence.last_version).toBe('20260922021440');
    expect(evidence.last_name).toBe('rcv3_preview_email_outbox');
    expect(evidence.source_provenance.source_pr).toBe(748);
    expect(evidence.source_provenance.source_commit).toBe('6a5fcb6579df5e0f739dac73ecd2ce0795e3f791');
    expect(evidence.source_provenance.source_blob_sha).toBe('b95f5429860dac1b717c797b3bcd8e53d67d5b0c');
    expect(evidence.source_provenance_proves_deployment_authority).toBe(false);
    expect(evidence.independent_reviewer_or_change_record_verified).toBe(false);
  });

  it('binds the recovered source artifact to the observed Hosted schema shape', () => {
    const readback = evidence.hosted_source_shape_readback;
    expect(evidence.source_artifact_matches_observed_hosted_shape).toBe(true);
    expect(readback.migration_row_exact_match).toBe(true);
    expect(readback.notices_table_present).toBe(true);
    expect(readback.notices_rls_enabled).toBe(true);
    expect(readback.notices_expected_columns_match).toBe(true);
    expect(readback.notices_anon_any_table_privilege).toBe(false);
    expect(readback.notices_authenticated_any_table_privilege).toBe(false);
    expect(readback.notices_service_role_select_insert_update).toBe(true);
    expect(readback.worker_state_table_present).toBe(true);
    expect(readback.worker_state_rls_enabled).toBe(true);
    expect(readback.worker_state_anon_any_table_privilege).toBe(false);
    expect(readback.worker_state_authenticated_any_table_privilege).toBe(false);
    expect(readback.worker_state_service_role_select_insert_update).toBe(true);
    expect(readback.card_sweep_seed_present).toBe(true);
    expect(readback.pending_index_present).toBe(true);
  });

  it('keeps reconciliation and deployment fail-closed after source/shape matching', () => {
    expect(evidence.hosted_mutation_performed_by_this_capture).toBe(false);
    expect(evidence.rollout_candidate_name_matches).toBe(0);
    expect(evidence.trusted_hosted_baseline_may_advance).toBe(false);
    expect(evidence.ledger_reconciliation_required).toBe(true);
    expect(evidence.linked_dry_run_authorized).toBe(false);
    expect(evidence.safe_deploy_blocked).toBe(true);
  });
});
