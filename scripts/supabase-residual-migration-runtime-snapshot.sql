-- Royal Command October rollout: READ-ONLY runtime semantics evidence for the
-- five residual timestamp-drift migrations tracked by PR #696.
--
-- Purpose: distinguish historical migration-ledger drift from the current
-- Hosted runtime state. This script MUST NOT be used to authorize migration
-- repair, db push, deployment, or Country READY.

begin read only;

-- 1) add_room_work_records: verify the current table/RLS shape produced by the
-- historical migration remains present.
select jsonb_build_object(
  'migration', 'add_room_work_records',
  'remote_version', '20260825044842',
  'history_present', exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260825044842' and name = 'add_room_work_records'
  ),
  'table_exists', to_regclass('public.room_work_records') is not null,
  'rls_enabled', coalesce((
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'room_work_records' and c.relkind = 'r'
  ), false),
  'expected_columns_present', (
    select count(*) = 10
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'room_work_records'
      and column_name in (
        'id','room_id','request_key','work_id','revision','parent_revision',
        'title','status','created_at','updated_at'
      )
  ),
  'room_created_index_present', exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'room_work_records'
      and indexname = 'room_work_records_room_created_idx'
  ),
  'three_member_scoped_policies_present', (
    select count(*) = 3
    from pg_policies
    where schemaname = 'public'
      and tablename = 'room_work_records'
      and policyname in (
        'room_work_records_select',
        'room_work_records_insert',
        'room_work_records_update'
      )
      and roles @> array['authenticated']::name[]
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%is_room_member%'
  ),
  'ledger_equivalence_claimed', false
) as evidence;

-- 2) legal_case_file_numbers: verify the current case-number primitives.
select jsonb_build_object(
  'migration', 'legal_case_file_numbers',
  'remote_version', '20260829070456',
  'history_present', exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260829070456' and name = 'legal_case_file_numbers'
  ),
  'sequence_exists', to_regclass('public.legal_case_number_seq') is not null,
  'case_number_bigint', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'legal_cases'
      and column_name = 'case_number' and data_type = 'bigint'
  ),
  'default_uses_sequence', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'legal_cases'
      and column_name = 'case_number'
      and column_default ilike '%legal_case_number_seq%'
  ),
  'unique_index_present', exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'legal_cases'
      and indexname = 'legal_cases_case_number_uidx'
      and indexdef ilike 'CREATE UNIQUE INDEX%case_number%'
  ),
  'ledger_equivalence_claimed', false
) as evidence;

-- 3) legal_story_entries: Hosted applied the base table and audio FK as two
-- ordered migrations. Verify their combined runtime effect remains present.
select jsonb_build_object(
  'migration', 'legal_story_entries',
  'remote_versions', jsonb_build_array('20260829042019','20260829042153'),
  'split_history_present', (
    select count(*) = 2
    from supabase_migrations.schema_migrations
    where (version, name) in (
      ('20260829042019','legal_story_entries'),
      ('20260829042153','legal_story_entry_audio')
    )
  ),
  'audio_document_id_present', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'legal_story_entries'
      and column_name = 'audio_document_id' and data_type = 'uuid'
  ),
  'audio_fk_set_null_present', exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'legal_story_entries'
      and con.contype = 'f'
      and pg_get_constraintdef(con.oid, true)
          = 'FOREIGN KEY (audio_document_id) REFERENCES documents(id) ON DELETE SET NULL'
  ),
  'room_recorded_index_present', exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'legal_story_entries'
      and indexname = 'legal_story_entries_room_recorded_idx'
  ),
  'rls_enabled', coalesce((
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'legal_story_entries'
  ), false),
  'owner_policies_present', (
    select count(*) = 3
    from pg_policies
    where schemaname = 'public'
      and tablename = 'legal_story_entries'
      and policyname in (
        'legal_story_entries_select_owner',
        'legal_story_entries_insert_owner',
        'legal_story_entries_update_owner'
      )
      and roles @> array['authenticated']::name[]
  ),
  'ledger_equivalence_claimed', false
) as evidence;

-- 4/5) Room Factory residuals: the historical public SECURITY DEFINER bodies
-- were later hardened into public SECURITY INVOKER wrappers plus private
-- SECURITY DEFINER implementations. Verify current wrappers and the retained
-- auth/Room/evidence/dependency/lock-token guards without claiming ledger parity.
with target(proname, expected_history_version, expected_history_name) as (
  values
    ('submit_room_factory_lane_evidence','20260828221419','room_factory_evidence_review'),
    ('review_room_factory_lane','20260828221419','room_factory_evidence_review'),
    ('start_room_factory_lane_execution','20260828222515','room_factory_start_execution'),
    ('fail_room_factory_lane_execution','20260828222515','room_factory_start_execution')
), pub as (
  select p.proname, p.oid, p.prosecdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in (select proname from target)
), priv as (
  select p.proname, p.oid, p.prosecdef, pg_get_functiondef(p.oid) as def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and p.proname in (select proname from target)
)
select jsonb_build_object(
  'migration', t.expected_history_name,
  'remote_version', t.expected_history_version,
  'function', t.proname,
  'history_present', exists (
    select 1 from supabase_migrations.schema_migrations m
    where m.version = t.expected_history_version and m.name = t.expected_history_name
  ),
  'public_wrapper_present', exists (select 1 from pub where pub.proname = t.proname),
  'public_wrapper_security_invoker', coalesce((
    select not pub.prosecdef from pub where pub.proname = t.proname
  ), false),
  'public_authenticated_execute_and_anon_denied', coalesce((
    select has_function_privilege('authenticated', pub.oid, 'EXECUTE')
       and not has_function_privilege('anon', pub.oid, 'EXECUTE')
    from pub where pub.proname = t.proname
  ), false),
  'private_impl_present', exists (select 1 from priv where priv.proname = t.proname),
  'private_security_definer', coalesce((
    select priv.prosecdef from priv where priv.proname = t.proname
  ), false),
  'private_auth_and_room_guard', coalesce((
    select position('auth.uid()' in priv.def) > 0
       and position('private.is_room_member' in priv.def) > 0
    from priv where priv.proname = t.proname
  ), false),
  'review_self_review_and_evidence_guards', case
    when t.proname = 'review_room_factory_lane' then coalesce((
      select position('Writer cannot review its own Work Lane.' in priv.def) > 0
         and position('Evidence is required before review verdict.' in priv.def) > 0
      from priv where priv.proname = t.proname
    ), false)
    else null
  end,
  'start_dependency_pass_guard', case
    when t.proname = 'start_room_factory_lane_execution' then coalesce((
      select position('All dependency Work Lanes must PASS before execution can start.' in priv.def) > 0
      from priv where priv.proname = t.proname
    ), false)
    else null
  end,
  'failure_complete_lock_token_guard', case
    when t.proname = 'fail_room_factory_lane_execution' then coalesce((
      select position('Complete lock token evidence is required for failed execution cleanup.' in priv.def) > 0
      from priv where priv.proname = t.proname
    ), false)
    else null
  end,
  'ledger_equivalence_claimed', false
) as evidence
from target t
order by t.expected_history_version, t.proname;

rollback;
