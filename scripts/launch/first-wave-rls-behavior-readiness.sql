-- RoyalCommandAI first-wave authenticated RLS behavior preflight
-- Scope: evidence only. No DDL/DML. Each section runs in a READ ONLY transaction
-- and rolls back session-local role/JWT settings.
--
-- This complements static pg_policies inspection by exercising RLS as the
-- `authenticated` role. PASS is scoped only to the check shown and is never
-- country-launch approval.

-- ---------------------------------------------------------------------------
-- 1) Matter client negative-isolation behavior
-- Expected: a non-staff client with at least one Matter can see own Matter rows
-- and zero Matter rows owned by another client.
-- ---------------------------------------------------------------------------
BEGIN TRANSACTION READ ONLY;

SELECT set_config(
  'request.jwt.claim.sub',
  coalesce((
    SELECT m.client_id::text
    FROM public.matters m
    LEFT JOIN public.profiles p ON p.id = m.client_id
    WHERE coalesce(p.role, 'client') NOT IN ('staff', 'admin')
    GROUP BY m.client_id
    ORDER BY m.client_id
    LIMIT 1
  ), ''),
  true
);

SET LOCAL ROLE authenticated;

SELECT
  'matter_client_cross_tenant_negative' AS check_name,
  CASE
    WHEN auth.uid() IS NULL THEN 'BLOCKED_PRECONDITION'
    WHEN count(*) FILTER (WHERE client_id = auth.uid()) = 0 THEN 'BLOCKED_PRECONDITION'
    WHEN count(*) FILTER (WHERE client_id <> auth.uid()) = 0 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  count(*) FILTER (WHERE client_id = auth.uid())::int AS own_visible_rows,
  count(*) FILTER (WHERE client_id <> auth.uid())::int AS foreign_visible_rows
FROM public.matters;

ROLLBACK;

-- ---------------------------------------------------------------------------
-- 2) Unrelated-user Room / membership / Room Factory manifest isolation
-- Expected: an authenticated user who owns no Room and is not a Room member
-- can see zero rows across all three protected surfaces.
-- ---------------------------------------------------------------------------
BEGIN TRANSACTION READ ONLY;

SELECT set_config(
  'request.jwt.claim.sub',
  coalesce((
    SELECT m.client_id::text
    FROM public.matters m
    LEFT JOIN public.profiles p ON p.id = m.client_id
    WHERE coalesce(p.role, 'client') NOT IN ('staff', 'admin')
      AND NOT EXISTS (
        SELECT 1 FROM public.rooms r WHERE r.room_owner_id = m.client_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.room_members rm WHERE rm.user_id = m.client_id
      )
    ORDER BY m.client_id
    LIMIT 1
  ), ''),
  true
);

SET LOCAL ROLE authenticated;

WITH visible AS (
  SELECT
    (SELECT count(*) FROM public.rooms)::int AS rooms,
    (SELECT count(*) FROM public.room_members)::int AS room_members,
    (SELECT count(*) FROM public.room_factory_manifests)::int AS manifests
)
SELECT
  'unrelated_user_room_surfaces_negative' AS check_name,
  CASE
    WHEN auth.uid() IS NULL THEN 'BLOCKED_PRECONDITION'
    WHEN rooms = 0 AND room_members = 0 AND manifests = 0 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  rooms AS visible_rooms,
  room_members AS visible_room_members,
  manifests AS visible_manifests
FROM visible;

ROLLBACK;

-- ---------------------------------------------------------------------------
-- 3) Matter staff/admin blast-radius behavior
-- Expected for launch readiness: staff/admin access should be assignment scoped.
-- Any non-owned Matter visible to a generic staff/admin identity is BLOCKED.
-- This intentionally exposes the current broad private.is_staff_or_admin() path
-- until the assignment-scope migration is applied and verified.
-- ---------------------------------------------------------------------------
BEGIN TRANSACTION READ ONLY;

SELECT set_config(
  'request.jwt.claim.sub',
  coalesce((
    SELECT p.id::text
    FROM public.profiles p
    WHERE p.role IN ('staff', 'admin')
    ORDER BY p.id
    LIMIT 1
  ), ''),
  true
);

SET LOCAL ROLE authenticated;

SELECT
  'matter_staff_assignment_scope' AS check_name,
  CASE
    WHEN auth.uid() IS NULL THEN 'BLOCKED_PRECONDITION'
    WHEN count(*) FILTER (WHERE client_id <> auth.uid()) = 0 THEN 'PASS'
    ELSE 'BLOCKED'
  END AS status,
  count(*)::int AS visible_matters,
  count(*) FILTER (WHERE client_id <> auth.uid())::int AS non_owned_visible_matters
FROM public.matters;

ROLLBACK;
