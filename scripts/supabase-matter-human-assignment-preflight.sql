-- RoyalCommandAI October launch: Matter human-assignment cutover preflight.
--
-- READ-ONLY / aggregate-only / no PII.
-- This script exists because applying the staff-scoping migration while active
-- unassigned Matters remain can revoke ordinary-staff access before an approved
-- assignment decision has been made.
--
-- IMPORTANT:
-- * Historical staff activity is evidence of cutover impact, not permission to
--   auto-assign a Matter.
-- * This script never changes Matter assignment, profile roles, RLS, or schema.
-- * A green result here is not Country READY or Production deployment approval.

begin read only;

with unassigned as (
  select id
  from public.matters
  where assigned_staff_id is null
),
ordinary_staff_activity as (
  select mm.matter_id, mm.author_id as actor_id, 'message'::text as activity_kind
  from public.matter_messages mm
  join unassigned u on u.id = mm.matter_id
  join public.profiles p on p.id = mm.author_id
  where p.role = 'staff'

  union all

  select md.matter_id, md.uploaded_by, 'document'
  from public.matter_documents md
  join unassigned u on u.id = md.matter_id
  join public.profiles p on p.id = md.uploaded_by
  where p.role = 'staff'

  union all

  select mr.matter_id, mr.user_id, 'read'
  from public.matter_chat_reads mr
  join unassigned u on u.id = mr.matter_id
  join public.profiles p on p.id = mr.user_id
  where p.role = 'staff'
),
staff_actor_counts as (
  select
    u.id,
    count(distinct osa.actor_id)::int as staff_actor_count
  from unassigned u
  left join ordinary_staff_activity osa on osa.matter_id = u.id
  group by u.id
),
role_counts as (
  select
    count(*) filter (where role = 'admin')::int as admin_profiles,
    count(*) filter (where role = 'staff')::int as staff_profiles,
    count(*) filter (where role = 'client')::int as client_profiles
  from public.profiles
),
cutover as (
  select
    (select count(*)::int from public.matters) as total_matters,
    (select count(*)::int from public.matters where assigned_staff_id is not null) as assigned_matters,
    (select count(*)::int from unassigned) as unassigned_matters,
    (select count(distinct matter_id)::int from ordinary_staff_activity) as unassigned_with_ordinary_staff_activity,
    (select count(*)::int from ordinary_staff_activity where activity_kind = 'message') as ordinary_staff_message_rows,
    (select count(*)::int from ordinary_staff_activity where activity_kind = 'document') as ordinary_staff_document_rows,
    (select count(*)::int from ordinary_staff_activity where activity_kind = 'read') as ordinary_staff_read_rows,
    (select count(*)::int from staff_actor_counts where staff_actor_count = 0) as unassigned_with_no_staff_actor_signal,
    (select count(*)::int from staff_actor_counts where staff_actor_count = 1) as unassigned_with_single_staff_actor_signal,
    (select count(*)::int from staff_actor_counts where staff_actor_count > 1) as unassigned_with_multiple_staff_actor_signals
)
select jsonb_build_object(
  'role_counts', jsonb_build_object(
    'admin_profiles', rc.admin_profiles,
    'staff_profiles', rc.staff_profiles,
    'client_profiles', rc.client_profiles
  ),
  'matter_counts', jsonb_build_object(
    'total', c.total_matters,
    'assigned', c.assigned_matters,
    'unassigned', c.unassigned_matters
  ),
  'ordinary_staff_activity_on_unassigned', jsonb_build_object(
    'matters_with_activity', c.unassigned_with_ordinary_staff_activity,
    'message_rows', c.ordinary_staff_message_rows,
    'document_rows', c.ordinary_staff_document_rows,
    'read_rows', c.ordinary_staff_read_rows,
    'no_staff_actor_signal', c.unassigned_with_no_staff_actor_signal,
    'single_staff_actor_signal', c.unassigned_with_single_staff_actor_signal,
    'multiple_staff_actor_signals', c.unassigned_with_multiple_staff_actor_signals
  ),
  'authority_boundary', jsonb_build_object(
    'authenticated_can_update_client_id',
      has_column_privilege('authenticated','public.matters','client_id','UPDATE'),
    'authenticated_can_update_assigned_staff_id',
      has_column_privilege('authenticated','public.matters','assigned_staff_id','UPDATE'),
    'authenticated_can_update_profile_role',
      has_column_privilege('authenticated','public.profiles','role','UPDATE'),
    'assigned_staff_helper_present',
      to_regprocedure('private.is_assigned_matter_staff(uuid)') is not null,
    'assignment_rpc_present',
      to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is not null
  ),
  'human_assignment_decision_required',
    c.unassigned_matters > 0 and rc.staff_profiles > 0,
  'historical_activity_may_inform_review_but_must_not_auto_assign', true,
  'auto_assignment_authorized', false,
  'matter_scope_migration_cutover_ready', (
    c.unassigned_matters = 0
    and rc.admin_profiles > 0
    and not has_column_privilege('authenticated','public.matters','client_id','UPDATE')
    and not has_column_privilege('authenticated','public.matters','assigned_staff_id','UPDATE')
    and not has_column_privilege('authenticated','public.profiles','role','UPDATE')
    and to_regprocedure('private.is_assigned_matter_staff(uuid)') is not null
    and to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is not null
  ),
  'note',
    'Do not infer assignment from activity. Existing unassigned Matters require an approved human cutover decision before staff-scoping migration promotion.'
) as matter_human_assignment_preflight
from cutover c
cross join role_counts rc;

rollback;
