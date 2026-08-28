-- RCA Room Factory V1: atomically persist a validated control plan.
-- This function creates planning metadata only. It does NOT acquire active locks
-- and does NOT execute code, tools, deployments or production mutations.

create or replace function public.prepare_room_factory_work_plan(
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
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_work_record_id uuid;
  v_lane jsonb;
  v_lane_row_id uuid;
  v_resource text;
  v_lane_count integer := 0;
  v_lock_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not private.is_room_member(p_room_id) then
    raise exception 'Room access denied.';
  end if;

  if length(btrim(coalesce(p_request_key, ''))) < 8 then
    raise exception 'A valid request key is required.';
  end if;

  if length(btrim(coalesce(p_work_id, ''))) < 8 then
    raise exception 'A valid Work ID is required.';
  end if;

  if length(btrim(coalesce(p_writer, ''))) < 1 then
    raise exception 'Writer is required.';
  end if;

  if jsonb_typeof(p_lanes) <> 'array' or jsonb_array_length(p_lanes) < 1 or jsonb_array_length(p_lanes) > 20 then
    raise exception 'Work Lanes must be an array containing 1 to 20 lanes.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_lanes) lane
    where btrim(coalesce(lane->>'id', '')) = ''
       or btrim(coalesce(lane->>'title', '')) = ''
       or btrim(coalesce(lane->>'writer', '')) <> btrim(p_writer)
       or jsonb_typeof(coalesce(lane->'reviewers', '[]'::jsonb)) <> 'array'
       or jsonb_typeof(coalesce(lane->'resources', '[]'::jsonb)) <> 'array'
       or jsonb_typeof(coalesce(lane->'dependsOn', '[]'::jsonb)) <> 'array'
       or jsonb_typeof(coalesce(lane->'evidence', '[]'::jsonb)) <> 'array'
  ) then
    raise exception 'Invalid Work Lane structure or Writer mismatch.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_lanes) lane,
         jsonb_array_elements_text(coalesce(lane->'reviewers', '[]'::jsonb)) reviewer
    where btrim(reviewer) = btrim(p_writer)
  ) then
    raise exception 'Writer cannot also be a Reviewer.';
  end if;

  if exists (
    select 1
    from (
      select lower(btrim(resource)) as resource_key, count(*) as ownership_count
      from jsonb_array_elements(p_lanes) lane,
           jsonb_array_elements_text(coalesce(lane->'resources', '[]'::jsonb)) resource
      where btrim(resource) <> ''
      group by lower(btrim(resource))
      having count(*) > 1
    ) collision
  ) then
    raise exception 'A resource may have only one Work Lane owner.';
  end if;

  insert into public.room_work_records (
    room_id,
    request_key,
    work_id,
    revision,
    title,
    status
  ) values (
    p_room_id,
    btrim(p_request_key),
    btrim(p_work_id),
    1,
    nullif(btrim(coalesce(p_title, '')), ''),
    'planning'
  )
  returning id into v_work_record_id;

  for v_lane in select * from jsonb_array_elements(p_lanes)
  loop
    insert into public.room_work_lanes (
      room_id,
      work_record_id,
      lane_id,
      title,
      writer_provider,
      reviewer_providers,
      resources,
      depends_on,
      parallel_group,
      required_evidence,
      status
    ) values (
      p_room_id,
      v_work_record_id,
      btrim(v_lane->>'id'),
      btrim(v_lane->>'title'),
      btrim(p_writer),
      array(select btrim(value) from jsonb_array_elements_text(coalesce(v_lane->'reviewers', '[]'::jsonb)) value where btrim(value) <> ''),
      array(select btrim(value) from jsonb_array_elements_text(coalesce(v_lane->'resources', '[]'::jsonb)) value where btrim(value) <> ''),
      array(select btrim(value) from jsonb_array_elements_text(coalesce(v_lane->'dependsOn', '[]'::jsonb)) value where btrim(value) <> ''),
      nullif(btrim(coalesce(v_lane->>'parallelGroup', '')), ''),
      array(select btrim(value) from jsonb_array_elements_text(coalesce(v_lane->'evidence', '[]'::jsonb)) value where btrim(value) <> ''),
      'planned'
    )
    returning id into v_lane_row_id;

    v_lane_count := v_lane_count + 1;

    for v_resource in
      select btrim(value)
      from jsonb_array_elements_text(coalesce(v_lane->'resources', '[]'::jsonb)) value
      where btrim(value) <> ''
    loop
      insert into public.room_resource_locks (
        room_id,
        work_record_id,
        work_lane_id,
        resource_key,
        owner_provider,
        state
      ) values (
        p_room_id,
        v_work_record_id,
        v_lane_row_id,
        v_resource,
        btrim(p_writer),
        'planned'
      );
      v_lock_count := v_lock_count + 1;
    end loop;
  end loop;

  return query
  select v_work_record_id, btrim(p_work_id), v_lane_count, v_lock_count;
end;
$$;

revoke all on function public.prepare_room_factory_work_plan(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.prepare_room_factory_work_plan(uuid, text, text, text, text, jsonb) to authenticated;

comment on function public.prepare_room_factory_work_plan(uuid, text, text, text, text, jsonb) is
  'Atomically persists a validated RCA Room Factory Work record, Work Lanes and planned Resource Locks. Does not acquire locks or execute work.';
