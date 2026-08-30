-- Work Queue Ticket: #468
-- Reduce the exposed SECURITY DEFINER surface for Room Factory independent review.
-- Preserve the existing public RPC signature used by the app, but move the
-- privileged implementation to the non-exposed private schema and expose a
-- SECURITY INVOKER wrapper in public.
--
-- The private implementation retains the existing auth.uid(), Room membership,
-- reviewer assignment, evidence, lane-state, active-lock, and rework-round checks.
-- This migration does not broaden direct table write policies or change review semantics.

alter function public.review_room_factory_lane(
  uuid, uuid, text, text, text, jsonb
) set schema private;

revoke all on function private.review_room_factory_lane(
  uuid, uuid, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function private.review_room_factory_lane(
  uuid, uuid, text, text, text, jsonb
) to authenticated, service_role;

create function public.review_room_factory_lane(
  p_room_id uuid,
  p_work_record_id uuid,
  p_lane_id text,
  p_reviewer_provider text,
  p_verdict text,
  p_notes jsonb default '{}'::jsonb
)
returns table (
  lane_uuid uuid,
  lane_status text,
  rework_round integer,
  reviewer_verdict jsonb
)
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select *
  from private.review_room_factory_lane($1, $2, $3, $4, $5, $6);
$$;

-- Supabase default function privileges can otherwise add PUBLIC/anon EXECUTE
-- to newly created public functions, so make the intended ACL explicit here.
revoke all on function public.review_room_factory_lane(
  uuid, uuid, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.review_room_factory_lane(
  uuid, uuid, text, text, text, jsonb
) to authenticated, service_role;

comment on function private.review_room_factory_lane(
  uuid, uuid, text, text, text, jsonb
) is
  'Privileged Room Factory independent-review implementation. Not exposed through the public REST schema; retains auth.uid(), Room membership, reviewer assignment, evidence, lane-state, active-lock, and rework-round checks.';

comment on function public.review_room_factory_lane(
  uuid, uuid, text, text, text, jsonb
) is
  'Public SECURITY INVOKER wrapper for Room Factory independent review. Delegates to the private implementation without broadening direct table write access.';
