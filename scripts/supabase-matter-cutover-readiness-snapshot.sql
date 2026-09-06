-- RoyalCommandAI Matter assignment/Auth isolation cutover readiness evidence.
-- READ-ONLY / aggregate-only / no PII. This script does not authorize assignment,
-- policy changes, migration staging, or user role changes.

begin read only;

with unassigned as (
  select id
  from public.matters
  where assigned_staff_id is null
),
activity as (
  select
    u.id,
    exists(select 1 from public.matter_messages mm where mm.matter_id = u.id) as has_messages,
    exists(select 1 from public.matter_documents md where md.matter_id = u.id) as has_documents,
    exists(select 1 from public.matter_chat_reads mr where mr.matter_id = u.id) as has_reads,
    exists(
      select 1
      from public.matter_messages mm
      join public.profiles p on p.id = mm.author_id
      where mm.matter_id = u.id and p.role in ('staff','admin')
      union all
      select 1
      from public.matter_documents md
      join public.profiles p on p.id = md.uploaded_by
      where md.matter_id = u.id and p.role in ('staff','admin')
      union all
      select 1
      from public.matter_chat_reads mr
      join public.profiles p on p.id = mr.user_id
      where mr.matter_id = u.id and p.role in ('staff','admin')
    ) as has_staff_or_admin_activity
  from unassigned u
),
staff_actors as (
  select distinct actor_id
  from (
    select mm.author_id as actor_id
    from public.matter_messages mm
    join unassigned u on u.id = mm.matter_id
    join public.profiles p on p.id = mm.author_id
    where p.role in ('staff','admin')

    union

    select md.uploaded_by
    from public.matter_documents md
    join unassigned u on u.id = md.matter_id
    join public.profiles p on p.id = md.uploaded_by
    where p.role in ('staff','admin')

    union

    select mr.user_id
    from public.matter_chat_reads mr
    join unassigned u on u.id = mr.matter_id
    join public.profiles p on p.id = mr.user_id
    where p.role in ('staff','admin')
  ) actors
),
policy_refs as (
  select count(*)::int as count
  from pg_policies
  where schemaname = 'public'
    and tablename in ('matters','matter_documents','matter_messages','matter_chat_reads')
    and (
      coalesce(qual,'') like '%is_staff_or_admin%'
      or coalesce(with_check,'') like '%is_staff_or_admin%'
    )
)
select jsonb_build_object(
  'matter_cutover', jsonb_build_object(
    'total_matters', (select count(*)::int from public.matters),
    'assigned_matters', (select count(*)::int from public.matters where assigned_staff_id is not null),
    'unassigned_matters', (select count(*)::int from unassigned),
    'unassigned_with_any_activity', (
      select count(*)::int
      from activity
      where has_messages or has_documents or has_reads
    ),
    'unassigned_with_staff_or_admin_activity', (
      select count(*)::int
      from activity
      where has_staff_or_admin_activity
    ),
    'distinct_staff_or_admin_actors_on_unassigned', (select count(*)::int from staff_actors)
  ),
  'authority_boundary', jsonb_build_object(
    'authenticated_can_update_client_id',
      has_column_privilege('authenticated','public.matters','client_id','UPDATE'),
    'authenticated_can_update_assigned_staff_id',
      has_column_privilege('authenticated','public.matters','assigned_staff_id','UPDATE'),
    'assigned_staff_helper_present',
      to_regprocedure('private.is_assigned_matter_staff(uuid)') is not null,
    'assignment_rpc_present',
      to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is not null,
    'staff_or_admin_policy_references', (select count from policy_refs)
  ),
  'cutover_blocked', (
    (select count(*) from unassigned) > 0
    or (select count(*) from activity where has_staff_or_admin_activity) > 0
    or has_column_privilege('authenticated','public.matters','client_id','UPDATE')
    or has_column_privilege('authenticated','public.matters','assigned_staff_id','UPDATE')
    or to_regprocedure('private.is_assigned_matter_staff(uuid)') is null
    or to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is null
  )
) as matter_cutover_readiness;

rollback;
