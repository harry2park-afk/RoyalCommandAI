-- RoyalCommandAI first-wave Legal Matter assignment cutover preflight
-- Scope: evidence only. No DDL/DML/Auth mutation. No customer identifiers or
-- Matter content are returned; only aggregate counts needed for a safe cutover.
--
-- Purpose:
--   The reviewed 20260831225500 migration removes broad ordinary-staff access
--   and permits staff access only to explicitly assigned Matters. Applying it
--   before assignments are understood can cause an operational lockout.
--
-- Historical message/document/read activity is only a migration-planning signal.
-- It MUST NOT be used to auto-assign staff without an explicit admin review.

BEGIN TRANSACTION READ ONLY;

-- ---------------------------------------------------------------------------
-- 1) Current assignment inventory
-- ---------------------------------------------------------------------------
WITH matter_state AS (
  SELECT
    count(*)::int AS matters_total,
    count(*) FILTER (WHERE assigned_staff_id IS NULL)::int AS matters_unassigned,
    count(*) FILTER (WHERE assigned_staff_id IS NOT NULL)::int AS matters_assigned,
    count(DISTINCT client_id)::int AS distinct_clients
  FROM public.matters
),
role_state AS (
  SELECT
    count(*) FILTER (WHERE role = 'admin')::int AS admins,
    count(*) FILTER (WHERE role = 'staff')::int AS staff
  FROM public.profiles
)
SELECT
  'matter_cutover.assignment_inventory' AS check_name,
  CASE
    WHEN matters_total = 0 THEN 'BLOCKED_PRECONDITION'
    WHEN matters_unassigned = 0 THEN 'PASS'
    ELSE 'BLOCKED_UNASSIGNED_MATTERS'
  END AS status,
  matters_total,
  matters_assigned,
  matters_unassigned,
  distinct_clients,
  admins,
  staff
FROM matter_state
CROSS JOIN role_state;

-- ---------------------------------------------------------------------------
-- 2) Aggregate historical staff-activity signal
-- ---------------------------------------------------------------------------
WITH staff_profiles AS (
  SELECT id
  FROM public.profiles
  WHERE role = 'staff'
),
matter_staff_activity AS (
  SELECT
    m.id AS matter_id,
    m.assigned_staff_id,
    count(DISTINCT activity.staff_id)::int AS distinct_staff_with_activity
  FROM public.matters m
  LEFT JOIN LATERAL (
    SELECT mm.author_id AS staff_id
    FROM public.matter_messages mm
    JOIN staff_profiles sp ON sp.id = mm.author_id
    WHERE mm.matter_id = m.id

    UNION

    SELECT md.uploaded_by AS staff_id
    FROM public.matter_documents md
    JOIN staff_profiles sp ON sp.id = md.uploaded_by
    WHERE md.matter_id = m.id

    UNION

    SELECT mr.user_id AS staff_id
    FROM public.matter_chat_reads mr
    JOIN staff_profiles sp ON sp.id = mr.user_id
    WHERE mr.matter_id = m.id
  ) activity ON true
  GROUP BY m.id, m.assigned_staff_id
),
summary AS (
  SELECT
    count(*)::int AS matters_total,
    count(*) FILTER (
      WHERE assigned_staff_id IS NULL AND distinct_staff_with_activity = 0
    )::int AS unassigned_with_no_staff_signal,
    count(*) FILTER (
      WHERE assigned_staff_id IS NULL AND distinct_staff_with_activity = 1
    )::int AS unassigned_with_one_staff_signal,
    count(*) FILTER (
      WHERE assigned_staff_id IS NULL AND distinct_staff_with_activity > 1
    )::int AS unassigned_with_multiple_staff_signals,
    max(distinct_staff_with_activity)::int AS max_staff_signals_on_one_matter
  FROM matter_staff_activity
)
SELECT
  'matter_cutover.historical_staff_signal' AS check_name,
  CASE
    WHEN matters_total = 0 THEN 'BLOCKED_PRECONDITION'
    WHEN unassigned_with_multiple_staff_signals > 0 THEN 'BLOCKED_AMBIGUOUS_MAPPING'
    WHEN unassigned_with_no_staff_signal > 0 THEN 'BLOCKED_MANUAL_MAPPING_REQUIRED'
    WHEN unassigned_with_one_staff_signal > 0 THEN 'REVIEW_REQUIRED_NOT_AUTHORITY'
    ELSE 'PASS_NO_UNASSIGNED_MATTERS'
  END AS status,
  matters_total,
  unassigned_with_no_staff_signal,
  unassigned_with_one_staff_signal,
  unassigned_with_multiple_staff_signals,
  max_staff_signals_on_one_matter
FROM summary;

-- ---------------------------------------------------------------------------
-- 3) Hosted migration/object cutover boundary
-- ---------------------------------------------------------------------------
WITH migration_state AS (
  SELECT exists (
    SELECT 1
    FROM supabase_migrations.schema_migrations sm
    WHERE sm.version = '20260831225500'
  ) AS migration_present
),
object_state AS (
  SELECT
    to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') IS NOT NULL
      AS assignment_rpc_present,
    to_regprocedure('private.is_assigned_matter_staff(uuid)') IS NOT NULL
      AS assignment_helper_present
)
SELECT
  'matter_cutover.assignment_scope_objects' AS check_name,
  CASE
    WHEN migration_present
      AND assignment_rpc_present
      AND assignment_helper_present
      THEN 'PASS'
    ELSE 'BLOCKED_SCHEMA_NOT_CUT_OVER'
  END AS status,
  migration_present,
  assignment_rpc_present,
  assignment_helper_present
FROM migration_state
CROSS JOIN object_state;

-- ---------------------------------------------------------------------------
-- 4) Post-cutover policy + protected-column posture
-- ---------------------------------------------------------------------------
WITH migration_state AS (
  SELECT exists (
    SELECT 1
    FROM supabase_migrations.schema_migrations sm
    WHERE sm.version = '20260831225500'
  ) AS migration_present
),
policy_state AS (
  SELECT
    count(*) FILTER (
      WHERE (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ILIKE '%is_staff_or_admin%'
    )::int AS global_staff_policy_count,
    count(*) FILTER (
      WHERE (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ILIKE '%is_assigned_matter_staff%'
    )::int AS assignment_scoped_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'matters',
      'matter_documents',
      'matter_messages',
      'matter_chat_reads'
    )
),
privilege_state AS (
  SELECT
    has_column_privilege(
      'authenticated', 'public.matters', 'client_id', 'UPDATE'
    ) AS authenticated_can_update_client_id,
    has_column_privilege(
      'authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE'
    ) AS authenticated_can_update_assigned_staff_id
),
execute_state AS (
  SELECT
    CASE
      WHEN to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') IS NULL
        THEN false
      ELSE has_function_privilege(
        'authenticated',
        'public.set_matter_staff_assignment(uuid,uuid)',
        'EXECUTE'
      )
    END AS authenticated_can_execute_assignment_rpc,
    CASE
      WHEN to_regprocedure('private.is_assigned_matter_staff(uuid)') IS NULL
        THEN false
      ELSE has_function_privilege(
        'authenticated',
        'private.is_assigned_matter_staff(uuid)',
        'EXECUTE'
      )
    END AS authenticated_can_execute_assignment_helper
)
SELECT
  'matter_cutover.policy_privilege_posture' AS check_name,
  CASE
    WHEN NOT migration_present THEN 'BLOCKED_SCHEMA_NOT_CUT_OVER'
    WHEN global_staff_policy_count > 0 THEN 'BLOCKED_GLOBAL_STAFF_POLICY_REMAINS'
    WHEN assignment_scoped_policy_count < 8 THEN 'BLOCKED_ASSIGNMENT_POLICIES_INCOMPLETE'
    WHEN authenticated_can_update_client_id
      OR authenticated_can_update_assigned_staff_id
      THEN 'BLOCKED_SENSITIVE_COLUMN_UPDATE'
    WHEN NOT authenticated_can_execute_assignment_rpc
      OR NOT authenticated_can_execute_assignment_helper
      THEN 'BLOCKED_EXECUTE_BOUNDARY'
    ELSE 'PASS'
  END AS status,
  migration_present,
  global_staff_policy_count,
  assignment_scoped_policy_count,
  authenticated_can_update_client_id,
  authenticated_can_update_assigned_staff_id,
  authenticated_can_execute_assignment_rpc,
  authenticated_can_execute_assignment_helper
FROM migration_state
CROSS JOIN policy_state
CROSS JOIN privilege_state
CROSS JOIN execute_state;

ROLLBACK;
