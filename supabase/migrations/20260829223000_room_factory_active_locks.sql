-- RCA Room Factory V1 persistent Resource Lock lifecycle.
-- These RPCs only acquire/release DB leases. They do NOT execute AI, code,
-- tools, deployments, or production writes.

create or replace function public.acquire_room_factory_lane_locks(
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
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_work_lane_id uuid;
  v_lease_seconds integer := least(greatest(coalesce(p_lease_seconds, 900), 60), 3600);
  v_updated integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not private.is_room_member(p_room_id) then
    raise exception 'Room access denied.';
  end if;

  select lane.id
    into v_work_lane_id
  from public.room_work_lanes lane
  where lane.room_id = p_room_id
    and lane.work_record_id = p_work_record_id
    and lane.lane_id = btrim(p_lane_id)
  limit 1;

  if v_work_lane_id is null then
    raise exception 'Work Lane not found.';
  end if;

  -- Expired leases must stop blocking the unique active-resource index.
  update public.room_resource_locks lock_row
  set state = 'expired',
      updated_at = now()
  where lock_row.room_id = p_room_id
    and lock_row.state = 'acquired'
    and lock_row.lease_expires_at <= now();

  -- Idempotent retry: return this lane's still-active leases unchanged.
  if exists (
    select 1
    from public.room_resource_locks existing
    where existing.room_id = p_room_id
      and existing.work_record_id = p_work_record_id
      and existing.work_lane_id = v_work_lane_id
      and existing.state = 'acquired'
      and existing.lease_expires_at > now()
  ) then
    return query
    select existing.id, existing.lock_token, existing.resource_key,
           existing.owner_provider, existing.lease_expires_at
    from public.room_resource_locks existing
    where existing.room_id = p_room_id
      and existing.work_record_id = p_work_record_id
      and existing.work_lane_id = v_work_lane_id
      and existing.state = 'acquired'
      and existing.lease_expires_at > now()
    order by existing.resource_key;
    return;
  end if;

  begin
    update public.room_resource_locks lock_row
    set state = 'acquired',
        lock_token = gen_random_uuid(),
        acquired_at = now(),
        lease_expires_at = now() + make_interval(secs => v_lease_seconds),
        released_at = null,
        updated_at = now()
    where lock_row.room_id = p_room_id
      and lock_row.work_record_id = p_work_record_id
      and lock_row.work_lane_id = v_work_lane_id
      and lock_row.state in ('planned', 'released', 'expired');

    get diagnostics v_updated = row_count;
  exception
    when unique_violation then
      raise exception 'Resource is already locked by another active Work Lane.';
  end;

  if v_updated < 1 then
    raise exception 'No planned Resource Lock is available for this Work Lane.';
  end if;

  return query
  select acquired.id, acquired.lock_token, acquired.resource_key,
         acquired.owner_provider, acquired.lease_expires_at
  from public.room_resource_locks acquired
  where acquired.room_id = p_room_id
    and acquired.work_record_id = p_work_record_id
    and acquired.work_lane_id = v_work_lane_id
    and acquired.state = 'acquired'
  order by acquired.resource_key;
end;
$$;

create or replace function public.release_room_factory_lane_locks(
  p_room_id uuid,
  p_work_record_id uuid,
  p_lane_id text,
  p_lock_tokens uuid[]
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_work_lane_id uuid;
  v_active_count integer := 0;
  v_matching_count integer := 0;
  v_released integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not private.is_room_member(p_room_id) then
    raise exception 'Room access denied.';
  end if;

  if coalesce(array_length(p_lock_tokens, 1), 0) < 1 then
    raise exception 'Lock token evidence is required.';
  end if;

  select lane.id
    into v_work_lane_id
  from public.room_work_lanes lane
  where lane.room_id = p_room_id
    and lane.work_record_id = p_work_record_id
    and lane.lane_id = btrim(p_lane_id)
  limit 1;

  if v_work_lane_id is null then
    raise exception 'Work Lane not found.';
  end if;

  select count(*) into v_active_count
  from public.room_resource_locks active_lock
  where active_lock.room_id = p_room_id
    and active_lock.work_record_id = p_work_record_id
    and active_lock.work_lane_id = v_work_lane_id
    and active_lock.state = 'acquired';

  if v_active_count < 1 then
    return 0;
  end if;

  select count(*) into v_matching_count
  from public.room_resource_locks matching_lock
  where matching_lock.room_id = p_room_id
    and matching_lock.work_record_id = p_work_record_id
    and matching_lock.work_lane_id = v_work_lane_id
    and matching_lock.state = 'acquired'
    and matching_lock.lock_token = any(p_lock_tokens);

  if v_matching_count <> v_active_count then
    raise exception 'Complete lock token evidence is required to release this Work Lane.';
  end if;

  update public.room_resource_locks release_lock
  set state = 'released',
      released_at = now(),
      updated_at = now()
  where release_lock.room_id = p_room_id
    and release_lock.work_record_id = p_work_record_id
    and release_lock.work_lane_id = v_work_lane_id
    and release_lock.state = 'acquired'
    and release_lock.lock_token = any(p_lock_tokens);

  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

revoke all on function public.acquire_room_factory_lane_locks(uuid, uuid, text, integer) from public;
revoke execute on function public.acquire_room_factory_lane_locks(uuid, uuid, text, integer) from anon;
grant execute on function public.acquire_room_factory_lane_locks(uuid, uuid, text, integer) to authenticated;

revoke all on function public.release_room_factory_lane_locks(uuid, uuid, text, uuid[]) from public;
revoke execute on function public.release_room_factory_lane_locks(uuid, uuid, text, uuid[]) from anon;
grant execute on function public.release_room_factory_lane_locks(uuid, uuid, text, uuid[]) to authenticated;

comment on function public.acquire_room_factory_lane_locks(uuid, uuid, text, integer) is
  'Acquires expiring DB leases for one prepared Room Factory Work Lane. No execution occurs.';
comment on function public.release_room_factory_lane_locks(uuid, uuid, text, uuid[]) is
  'Releases one Work Lane only when complete lock-token evidence is supplied. No execution occurs.';
