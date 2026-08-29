-- Work Queue Ticket: #468
-- Reduce the exposed SECURITY DEFINER surface for Room Factory resource-lock release.
-- Preserve the existing public RPC signature used by the app, but move the
-- privileged implementation to the non-exposed private schema and expose a
-- SECURITY INVOKER wrapper in public.
--
-- The private implementation retains the existing auth.uid() and
-- private.is_room_member(p_room_id) checks. This migration does not broaden
-- direct table write policies or change lock-release semantics.

alter function public.release_room_factory_lane_locks(
  uuid, uuid, text, uuid[]
) set schema private;

revoke all on function private.release_room_factory_lane_locks(
  uuid, uuid, text, uuid[]
) from public, anon, authenticated;
grant execute on function private.release_room_factory_lane_locks(
  uuid, uuid, text, uuid[]
) to authenticated, service_role;

create function public.release_room_factory_lane_locks(
  p_room_id uuid,
  p_work_record_id uuid,
  p_lane_id text,
  p_lock_tokens uuid[]
)
returns integer
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.release_room_factory_lane_locks($1, $2, $3, $4);
$$;

-- Supabase default function privileges can otherwise add PUBLIC/anon EXECUTE
-- to newly created public functions, so make the intended ACL explicit here.
revoke all on function public.release_room_factory_lane_locks(
  uuid, uuid, text, uuid[]
) from public, anon, authenticated;
grant execute on function public.release_room_factory_lane_locks(
  uuid, uuid, text, uuid[]
) to authenticated, service_role;

comment on function private.release_room_factory_lane_locks(
  uuid, uuid, text, uuid[]
) is
  'Privileged Room Factory resource-lock release implementation. Not exposed through the public REST schema; retains auth.uid(), Room membership, and complete lock-token evidence checks.';

comment on function public.release_room_factory_lane_locks(
  uuid, uuid, text, uuid[]
) is
  'Public SECURITY INVOKER wrapper for Room Factory resource-lock release. Delegates to the private implementation without broadening direct table write access.';
