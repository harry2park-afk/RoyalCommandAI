-- RoyalCommandAI launch safety preflight: Matter test-fixture cleanup review
-- READ ONLY. This script does not delete, update, assign, or otherwise mutate data.
-- Purpose: identify the known July 28 test Matters, verify their dependent DB rows
-- and Storage-object parity, and fail closed if the fixture shape has changed.
--
-- This is evidence only. A REVIEWABLE_FIXTURE_SET result is NOT deletion approval.
-- Any real cleanup must be separately reviewed, must remove Storage objects explicitly,
-- and must be followed by fresh authenticated Matter-isolation regression evidence.

BEGIN TRANSACTION READ ONLY;

-- 1) Strict fixture candidate inventory. Keep the selector narrow so future real Matters
-- are not swept into a cleanup candidate merely because they are unassigned.
WITH fixture_candidates AS (
  SELECT m.id, m.title, m.status, m.assigned_staff_id, m.created_at
  FROM public.matters AS m
  WHERE m.created_at >= TIMESTAMPTZ '2026-07-28 06:00:00+00'
    AND m.created_at <  TIMESTAMPTZ '2026-07-28 07:00:00+00'
    AND (
      m.title ~ '^Live Supabase matter [0-9]+$'
      OR m.title ~ '^Upload test matter [0-9]+$'
      OR m.title ~ '^DL matter [0-9]+$'
    )
)
SELECT
  fc.id,
  fc.title,
  fc.status,
  (fc.assigned_staff_id IS NOT NULL) AS assigned,
  fc.created_at,
  (SELECT count(*) FROM public.matter_messages mm WHERE mm.matter_id = fc.id) AS message_count,
  (SELECT count(*) FROM public.matter_documents md WHERE md.matter_id = fc.id) AS document_count,
  (SELECT count(*) FROM public.matter_chat_reads cr WHERE cr.matter_id = fc.id) AS chat_read_count
FROM fixture_candidates fc
ORDER BY fc.created_at;

-- 2) FK inventory. Expected launch fixture dependencies are the three Matter child tables,
-- all ON DELETE CASCADE. If this inventory changes, cleanup must be re-reviewed.
SELECT
  con.conname AS constraint_name,
  nsp.nspname AS child_schema,
  cls.relname AS child_table,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class cls ON cls.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE con.contype = 'f'
  AND con.confrelid = 'public.matters'::regclass
ORDER BY child_schema, child_table, constraint_name;

-- 3) Document-to-Storage parity for fixture documents. Storage objects are not removed by
-- deleting public.matter_documents rows, so they must be treated as separate cleanup targets.
WITH fixture_candidates AS (
  SELECT m.id
  FROM public.matters AS m
  WHERE m.created_at >= TIMESTAMPTZ '2026-07-28 06:00:00+00'
    AND m.created_at <  TIMESTAMPTZ '2026-07-28 07:00:00+00'
    AND (
      m.title ~ '^Live Supabase matter [0-9]+$'
      OR m.title ~ '^Upload test matter [0-9]+$'
      OR m.title ~ '^DL matter [0-9]+$'
    )
)
SELECT
  md.id AS document_id,
  md.matter_id,
  md.filename,
  md.storage_path,
  EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'matter-documents'
      AND o.name = md.storage_path
  ) AS storage_object_present
FROM public.matter_documents md
JOIN fixture_candidates fc ON fc.id = md.matter_id
ORDER BY md.created_at;

-- 4) Fail-closed review status. The current verified fixture shape is:
-- 3 Matters, all unassigned; 3 messages; 2 documents; 2 chat-read rows;
-- both document Storage objects present; exactly 3 FK references to Matters and all cascade.
WITH fixture_candidates AS (
  SELECT m.id, m.title, m.assigned_staff_id
  FROM public.matters AS m
  WHERE m.created_at >= TIMESTAMPTZ '2026-07-28 06:00:00+00'
    AND m.created_at <  TIMESTAMPTZ '2026-07-28 07:00:00+00'
    AND (
      m.title ~ '^Live Supabase matter [0-9]+$'
      OR m.title ~ '^Upload test matter [0-9]+$'
      OR m.title ~ '^DL matter [0-9]+$'
    )
),
shape AS (
  SELECT
    count(*) AS fixture_count,
    count(*) FILTER (WHERE title ~ '^Live Supabase matter [0-9]+$') AS live_count,
    count(*) FILTER (WHERE title ~ '^Upload test matter [0-9]+$') AS upload_count,
    count(*) FILTER (WHERE title ~ '^DL matter [0-9]+$') AS download_count,
    count(*) FILTER (WHERE assigned_staff_id IS NOT NULL) AS assigned_count,
    (SELECT count(*) FROM public.matter_messages mm JOIN fixture_candidates fc2 ON fc2.id = mm.matter_id) AS message_count,
    (SELECT count(*) FROM public.matter_documents md JOIN fixture_candidates fc2 ON fc2.id = md.matter_id) AS document_count,
    (SELECT count(*) FROM public.matter_chat_reads cr JOIN fixture_candidates fc2 ON fc2.id = cr.matter_id) AS chat_read_count,
    (
      SELECT count(*)
      FROM public.matter_documents md
      JOIN fixture_candidates fc2 ON fc2.id = md.matter_id
      JOIN storage.objects o
        ON o.bucket_id = 'matter-documents'
       AND o.name = md.storage_path
    ) AS storage_object_count,
    (
      SELECT count(*)
      FROM pg_constraint con
      WHERE con.contype = 'f'
        AND con.confrelid = 'public.matters'::regclass
    ) AS matter_fk_count,
    (
      SELECT count(*)
      FROM pg_constraint con
      WHERE con.contype = 'f'
        AND con.confrelid = 'public.matters'::regclass
        AND pg_get_constraintdef(con.oid) ILIKE '%ON DELETE CASCADE%'
    ) AS cascade_fk_count
  FROM fixture_candidates
)
SELECT
  CASE
    WHEN fixture_count = 3
     AND live_count = 1
     AND upload_count = 1
     AND download_count = 1
     AND assigned_count = 0
     AND message_count = 3
     AND document_count = 2
     AND chat_read_count = 2
     AND storage_object_count = 2
     AND matter_fk_count = 3
     AND cascade_fk_count = 3
    THEN 'REVIEWABLE_FIXTURE_SET'
    ELSE 'BLOCKED_FIXTURE_SHAPE_CHANGED'
  END AS cleanup_preflight_status,
  *
FROM shape;

ROLLBACK;
