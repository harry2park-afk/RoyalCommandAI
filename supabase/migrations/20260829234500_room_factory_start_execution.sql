-- RCA Room Factory V1 execution-start gate.
-- Starts exactly one prepared Work Lane after dependencies have passed and
-- atomically acquires its persistent Resource Locks. It does not itself run AI,
-- code, tools, deployments, or production writes.

create or replace function public.start_room_factory_lane_execution(
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
  lease_expires_at timestamptz,
  lane_status text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_work_lane_id uuid;
  v_status text;
  v_depends_on text[];
  v_lease_seconds integer := least(greatest(coalesce(p_lease_seconds, 900), 60), 3600);
  v_updated integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not private.is_room_member(p_room_id) then
    raise exception 'Room access denied.';
  end if;

  select lane.id, lane.status, lane.depends_on
    into v_work_lane_id, v_status, v_depends_on
  from public.room_work_lanes lane
  where lane.room_id = p_room_id
    and lane.work_record_id = p_work_record_id
    and lane.lane_id = btrim(p_lane_id)
  limit 1;

  if v_work_lane_id is null then
    raise exception 'Work Lane not found.';
  end if;

  if v_status not in ('planned', 'ready', 'fix_required', 'running') then
    raise exception 'Work Lane is not executable from its current state.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(v_depends_on, '{}'::text[])) dep(lane_id)
    left join public.room_work_lanes dependency
      on dependency.room_id = p_room_id
     and dependency.work_record_id = p_work_record_id
     and dependency.lane_id = dep.lane_id
    where dependency.id is null or dependency.status <> 'passed'
  ) then
    raise exception 'All dependency Work Lanes must PASS before execution can start.';
  end if;

  update public.room_resource_locks lock_row
  set state = 'expired',
      updated_at = now()
  where lock_row.room_id = p_room_id
    and lock_row.state = 'acquired'
    and lock_row.lease_expires_at <= now();

  if exists (
    select 1
    from public.room_resource_locks existing
    where existing.room_id = p_room_id
      and existing.work_record_id = p_work_record_id
      and existing.work_lane_id = v_work_lane_id
      and existing.state = 'acquired'
      and existing.lease_expires_at > now()
  ) then
    update public.room_work_lanes
    set status = 'running', updated_at = now()
    where id = v_work_lane_id;

    return query
    select existing.id, existing.lock_token, existing.resource_key,
           existing.owner_provider, existing.lease_expires_at, 'running'::text
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

  update public.room_work_lanes
  set status = 'running', updated_at = now()
  where id = v_work_lane_id;

  return query
  select acquired.id, acquired.lock_token, acquired.resource_key,
         acquired.owner_provider, acquired.lease_expires_at, 'running'::text
  from public.room_resource_locks acquired
  where acquired.room_id = p_room_id
    and acquired.work_record_id = p_work_record_id
    and acquired.work_lane_id = v_work_lane_id
    and acquired.state = 'acquired'
  order by acquired.resource_key;
end;
$$;

revoke all on function public.start_room_factory_lane_execution(uuid, uuid, text, integer) from public;
revoke execute on function public.start_room_factory_lane_execution(uuid, uuid, text, integer) from anon;
grant execute on function public.start_room_factory_lane_execution(uuid, uuid, text, integer) to authenticated;

comment on function public.start_room_factory_lane_execution(uuid, uuid, text, integer) is
  'Checks dependency PASS state, acquires one Work Lane persistent locks, and marks that lane running. No code execution occurs inside this RPC.';
