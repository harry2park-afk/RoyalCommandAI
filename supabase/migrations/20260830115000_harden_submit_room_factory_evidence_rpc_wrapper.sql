-- Work Queue Ticket: #468
-- Reduce the exposed SECURITY DEFINER surface for Room Factory evidence submission.
-- Preserve the existing public RPC signature used by the app, but move the
-- privileged implementation to the non-exposed private schema and expose a
-- SECURITY INVOKER wrapper in public.
--
-- The private implementation retains the existing auth.uid(), Room membership,
-- evidence-shape, lane-state, and active-resource-lock checks. This migration
-- does not broaden direct table write policies or change evidence semantics.

alter function public.submit_room_factory_lane_evidence(
  uuid, uuid, text, jsonb
) set schema private;

revoke all on function private.submit_room_factory_lane_evidence(
  uuid, uuid, text, jsonb
) from public, anon, authenticated;
grant execute on function private.submit_room_factory_lane_evidence(
  uuid, uuid, text, jsonb
) to authenticated, service_role;

create function public.submit_room_factory_lane_evidence(
  p_room_id uuid,
  p_work_record_id uuid,
  p_lane_id text,
  p_evidence jsonb
)
returns table (
  lane_uuid uuid,
  lane_status text,
  evidence jsonb
)
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select *
  from private.submit_room_factory_lane_evidence($1, $2, $3, $4);
$$;

-- Supabase default function privileges can otherwise add PUBLIC/anon EXECUTE
-- to newly created public functions, so make the intended ACL explicit here.
revoke all on function public.submit_room_factory_lane_evidence(
  uuid, uuid, text, jsonb
) from public, anon, authenticated;
grant execute on function public.submit_room_factory_lane_evidence(
  uuid, uuid, text, jsonb
) to authenticated, service_role;

comment on function private.submit_room_factory_lane_evidence(
  uuid, uuid, text, jsonb
) is
  'Privileged Room Factory evidence-submission implementation. Not exposed through the public REST schema; retains auth.uid(), Room membership, evidence, lane-state, and active-lock checks.';

comment on function public.submit_room_factory_lane_evidence(
  uuid, uuid, text, jsonb
) is
  'Public SECURITY INVOKER wrapper for Room Factory evidence submission. Delegates to the private implementation without broadening direct table write access.';
