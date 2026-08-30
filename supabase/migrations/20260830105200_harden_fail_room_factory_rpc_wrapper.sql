-- Work Queue Ticket: #468
-- Reduce the exposed SECURITY DEFINER surface for Room Factory failed-execution cleanup.
-- Preserve the existing public RPC signature used by the app, but move the
-- privileged implementation to the non-exposed private schema and expose a
-- SECURITY INVOKER wrapper in public.
--
-- The private implementation retains the existing auth.uid(), Room membership,
-- and complete lock-token evidence checks. This migration does not broaden
-- direct table write policies or change failure-cleanup semantics.

alter function public.fail_room_factory_lane_execution(
  uuid, uuid, text, uuid[], text
) set schema private;

revoke all on function private.fail_room_factory_lane_execution(
  uuid, uuid, text, uuid[], text
) from public, anon, authenticated;
grant execute on function private.fail_room_factory_lane_execution(
  uuid, uuid, text, uuid[], text
) to authenticated, service_role;

create function public.fail_room_factory_lane_execution(
  p_room_id uuid,
  p_work_record_id uuid,
  p_lane_id text,
  p_lock_tokens uuid[],
  p_error text
)
returns text
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.fail_room_factory_lane_execution($1, $2, $3, $4, $5);
$$;

-- Supabase default function privileges can otherwise add PUBLIC/anon EXECUTE
-- to newly created public functions, so make the intended ACL explicit here.
revoke all on function public.fail_room_factory_lane_execution(
  uuid, uuid, text, uuid[], text
) from public, anon, authenticated;
grant execute on function public.fail_room_factory_lane_execution(
  uuid, uuid, text, uuid[], text
) to authenticated, service_role;

comment on function private.fail_room_factory_lane_execution(
  uuid, uuid, text, uuid[], text
) is
  'Privileged Room Factory failed-execution cleanup implementation. Not exposed through the public REST schema; retains auth.uid(), Room membership, and complete lock-token evidence checks.';

comment on function public.fail_room_factory_lane_execution(
  uuid, uuid, text, uuid[], text
) is
  'Public SECURITY INVOKER wrapper for Room Factory failed-execution cleanup. Delegates to the private implementation without broadening direct table write access.';
