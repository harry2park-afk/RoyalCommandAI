-- RoyalCommandAI first-wave country compliance hook evidence
-- READ-ONLY / fail-closed. This script verifies the server-owned compliance
-- registry hook without treating schema presence as legal/compliance approval.
-- Recording policy and end-user consent remain separate sources of truth.

begin read only;

with registry as (
  select to_regclass('public.country_compliance_evidence') as oid
)
select jsonb_build_object(
  'country_compliance_evidence_registry', jsonb_build_object(
    'migration_rows', (
      select count(*)::int
      from supabase_migrations.schema_migrations
      where name = 'country_compliance_evidence_registry'
    ),
    'table_present', (select oid is not null from registry),
    'rls_enabled', coalesce((
      select relation.relrowsecurity
      from pg_class relation
      where relation.oid = (select oid from registry)
    ), false),
    'authenticated_direct_dml', case
      when (select oid from registry) is null then null
      else has_table_privilege(
        'authenticated',
        (select oid from registry),
        'SELECT,INSERT,UPDATE,DELETE'
      )
    end,
    'anon_direct_dml', case
      when (select oid from registry) is null then null
      else has_table_privilege(
        'anon',
        (select oid from registry),
        'SELECT,INSERT,UPDATE,DELETE'
      )
    end,
    'required_columns_present', (
      select count(*)::int
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'country_compliance_evidence'
        and column_name in (
          'id',
          'country_code',
          'subdivision_code',
          'evidence_kind',
          'review_status',
          'evidence_version',
          'evidence_ref',
          'evidence_sha256',
          'reviewed_at',
          'reviewed_by',
          'valid_from',
          'valid_until',
          'blocker_reason',
          'superseded_at',
          'created_at',
          'updated_at'
        )
    ),
    'verified_provenance_constraint_present', exists(
      select 1
      from pg_constraint constraint_row
      join pg_class relation on relation.oid = constraint_row.conrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = 'country_compliance_evidence'
        and constraint_row.conname = 'country_compliance_evidence_verified_check'
    ),
    'blocked_reason_constraint_present', exists(
      select 1
      from pg_constraint constraint_row
      join pg_class relation on relation.oid = constraint_row.conrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = 'country_compliance_evidence'
        and constraint_row.conname = 'country_compliance_evidence_blocked_check'
    ),
    'current_unique_index_present', to_regclass(
      'public.country_compliance_evidence_current_unique'
    ) is not null,
    'version_unique_index_present', to_regclass(
      'public.country_compliance_evidence_version_unique'
    ) is not null
  ),
  'separate_evidence_sources', jsonb_build_object(
    'recording_policy_table_present',
      to_regclass('public.communication_recording_policies') is not null,
    'auth_consent_table_present',
      to_regclass('public.auth_consents') is not null
  )
) as country_compliance_hook_snapshot;

rollback;
