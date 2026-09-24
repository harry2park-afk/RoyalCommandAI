import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const evidence = JSON.parse(
  readFileSync(new URL('./october-first-wave-hosted-gap-matrix-20260922-1546.json', import.meta.url), 'utf8'),
);

const expectedFirstWave = [
  ['AU', 'en-AU'],
  ['US', 'en-US'],
  ['CA', 'en-CA'],
  ['KR', 'ko-KR'],
  ['JP', 'ja-JP'],
  ['GB', 'en-GB'],
];

const expectedCandidates = [
  '20260831225500',
  '20260901025800',
  '20260903075000',
  '20260903205500',
  '20260904005500',
  '20260904105500',
  '20260910030000',
  '20260911045100',
];

describe('October first-wave Hosted gap matrix 2026-09-22', () => {
  it('pins the exact Hosted ledger and keeps every reviewed rollout migration absent', () => {
    expect(evidence.capture_mode).toBe('read_only');
    expect(evidence.hosted_ledger).toEqual({
      migration_count: 80,
      head_version: '20260922021440',
      head_name: 'rcv3_preview_email_outbox',
    });

    expect(evidence.exact_linked_dry_run_candidates.map((candidate: { version: string }) => candidate.version)).toEqual(
      expectedCandidates,
    );
    expect(
      evidence.exact_linked_dry_run_candidates.every((candidate: { present_hosted: boolean }) => candidate.present_hosted === false),
    ).toBe(true);
  });

  it('keeps all six first-wave countries HOLD until exact runtime and reviewer evidence exists', () => {
    expect(evidence.first_wave.map((row: { country_code: string; locale: string }) => [row.country_code, row.locale])).toEqual(
      expectedFirstWave,
    );

    for (const row of evidence.first_wave) {
      expect(row.exact_manifest_count).toBe(0);
      expect(row.encounter_backed_count).toBe(0);
      expect(row.provider_offer_count).toBe(0);
      expect(row.recording_rows).toBe(1);
      expect(row.reviewer_proven_recording_count).toBe(0);
    }

    expect(evidence.all_first_wave_countries_hold).toBe(true);
  });

  it('records the remaining direct-write authority as a launch blocker', () => {
    expect(evidence.auth_data_isolation.room_factory_manifests).toEqual({
      anon_insert: true,
      authenticated_insert: true,
      authenticated_update: true,
      authenticated_delete: true,
      authenticated_truncate: true,
    });

    expect(evidence.auth_data_isolation.rc_customer_accounts).toEqual({
      present: true,
      authenticated_select: true,
      authenticated_insert: true,
      authenticated_update: true,
      authenticated_delete: true,
      authenticated_truncate: true,
    });
  });

  it('fails closed while country/compliance/payment operational surfaces are absent', () => {
    expect(evidence.operational_schema).toEqual({
      country_terms_table_present: false,
      country_compliance_evidence_table_present: false,
      payment_provider_registry_present: false,
      payment_event_ledger_present: false,
      service_order_idempotency_column_present: false,
    });

    expect(evidence.hosted_mutation_performed_by_this_capture).toBe(false);
    expect(evidence.trusted_80_row_baseline_established).toBe(false);
    expect(evidence.linked_dry_run_authorized).toBe(false);
    expect(evidence.production_deploy_authorized).toBe(false);
  });
});
