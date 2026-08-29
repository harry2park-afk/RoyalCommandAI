-- Work Queue Ticket: #468
-- Reduce the exposed SECURITY DEFINER surface for Room Factory planning.
-- Preserve the existing public RPC signature used by the app, but move the
-- privileged implementation to the non-exposed private schema and expose a
-- SECURITY INVOKER wrapper in public.
--
-- This keeps all existing auth.uid() + private.is_room_member() checks inside
-- the implementation and does not broaden direct table write policies.

alter function public.prepare_room_factory_work_plan(
  uuid, text, text, text, text, jsonb
) set schema private;

revoke all on function private.prepare_room_factory_work_plan(
  uuid, text, text, text, text, jsonb
) from public;
grant execute on function private.prepare_room_factory_work_plan(
  uuid, text, text, text, text, jsonb
) to authenticated, service_role;

create function public.prepare_room_factory_work_plan(
  p_room_id uuid,
  p_request_key text,
  p_work_id text,
  p_title text,
  p_writer text,
  p_lanes jsonb
)
returns table (
  work_record_id uuid,
  work_id text,
  lane_count integer,
  planned_lock_count integer
)
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select *
  from private.prepare_room_factory_work_plan($1, $2, $3, $4, $5, $6);
$$;

revoke all on function public.prepare_room_factory_work_plan(
  uuid, text, text, text, text, jsonb
) from public;
grant execute on function public.prepare_room_factory_work_plan(
  uuid, text, text, text, text, jsonb
) to authenticated, service_role;

comment on function private.prepare_room_factory_work_plan(
  uuid, text, text, text, text, jsonb
) is
  'Privileged Room Factory planning implementation. Not exposed through the public REST schema; retains auth.uid() and Room membership checks.';

comment on function public.prepare_room_factory_work_plan(
  uuid, text, text, text, text, jsonb
) is
  'Public SECURITY INVOKER wrapper for Room Factory planning. Delegates to the private implementation without broadening direct table write access.';
