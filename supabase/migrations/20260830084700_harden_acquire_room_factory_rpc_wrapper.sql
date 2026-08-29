-- Work Queue Ticket: #468
-- Reduce the exposed SECURITY DEFINER surface for Room Factory resource-lock acquisition.
-- Preserve the existing public RPC signature used by the app, but move the
-- privileged implementation to the non-exposed private schema and expose a
-- SECURITY INVOKER wrapper in public.
--
-- The private implementation retains the existing auth.uid() and
-- private.is_room_member(p_room_id) checks. This migration does not broaden
-- direct table write policies or change lock semantics.

alter function public.acquire_room_factory_lane_locks(
  uuid, uuid, text, integer
) set schema private;

revoke all on function private.acquire_room_factory_lane_locks(
  uuid, uuid, text, integer
) from public, anon, authenticated;
grant execute on function private.acquire_room_factory_lane_locks(
  uuid, uuid, text, integer
) to authenticated, service_role;

create function public.acquire_room_factory_lane_locks(
  p_room_id uuid,
  p_work_record_id uuid,
  p_lane_id text,
  p_lease_seconds integer default 900
)
returns table (
  resource_lock_id uuid,
  lock_token uuid,
  resource_key text,
  owner_provider text,
  lease_expires_at timestamptz
)
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select *
  from private.acquire_room_factory_lane_locks($1, $2, $3, $4);
$$;

-- Supabase default function privileges can otherwise re-add PUBLIC/anon EXECUTE
-- to newly created public functions, so make the intended ACL explicit here.
revoke all on function public.acquire_room_factory_lane_locks(
  uuid, uuid, text, integer
) from public, anon, authenticated;
grant execute on function public.acquire_room_factory_lane_locks(
  uuid, uuid, text, integer
) to authenticated, service_role;

comment on function private.acquire_room_factory_lane_locks(
  uuid, uuid, text, integer
) is
  'Privileged Room Factory resource-lock acquisition implementation. Not exposed through the public REST schema; retains auth.uid() and Room membership checks.';

comment on function public.acquire_room_factory_lane_locks(
  uuid, uuid, text, integer
) is
  'Public SECURITY INVOKER wrapper for Room Factory resource-lock acquisition. Delegates to the private implementation without broadening direct table write access.';
