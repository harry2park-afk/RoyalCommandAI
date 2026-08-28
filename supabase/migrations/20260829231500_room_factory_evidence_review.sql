-- RCA Room Factory V1 evidence + independent review lifecycle.
-- This phase records evidence and reviewer verdict metadata only. It does not
-- execute AI, code, tools, deployments, or production writes.

create or replace function public.submit_room_factory_lane_evidence(
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
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_lane_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not private.is_room_member(p_room_id) then
    raise exception 'Room access denied.';
  end if;

  if p_evidence is null or jsonb_typeof(p_evidence) <> 'object' or p_evidence = '{}'::jsonb then
    raise exception 'Host-verifiable evidence is required.';
  end if;

  select lane.id, lane.status
    into v_lane_id, v_status
  from public.room_work_lanes lane
  where lane.room_id = p_room_id
    and lane.work_record_id = p_work_record_id
    and lane.lane_id = btrim(p_lane_id)
  limit 1;

  if v_lane_id is null then
    raise exception 'Work Lane not found.';
  end if;

  if v_status not in ('ready', 'running', 'awaiting_review', 'fix_required') then
    raise exception 'Work Lane is not in an evidence-eligible state.';
  end if;

  if exists (
    select 1
    from public.room_resource_locks active_lock
    where active_lock.room_id = p_room_id
      and active_lock.work_record_id = p_work_record_id
      and active_lock.work_lane_id = v_lane_id
      and active_lock.state = 'acquired'
      and active_lock.lease_expires_at > now()
  ) then
    raise exception 'Active Resource Locks must be released before evidence review.';
  end if;

  update public.room_work_lanes lane
  set evidence = p_evidence,
      status = 'awaiting_review',
      updated_at = now()
  where lane.id = v_lane_id;

  return query
  select lane.id, lane.status, lane.evidence
  from public.room_work_lanes lane
  where lane.id = v_lane_id;
end;
$$;

create or replace function public.review_room_factory_lane(
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
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_lane_id uuid;
  v_writer text;
  v_reviewers text[];
  v_evidence jsonb;
  v_status text;
  v_round integer;
  v_reviewer text := lower(btrim(coalesce(p_reviewer_provider, '')));
  v_verdict text := lower(btrim(coalesce(p_verdict, '')));
  v_next_status text;
  v_next_round integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not private.is_room_member(p_room_id) then
    raise exception 'Room access denied.';
  end if;

  if v_reviewer = '' then
    raise exception 'Reviewer provider is required.';
  end if;

  if v_verdict not in ('pass', 'fix_required', 'blocked') then
    raise exception 'Review verdict must be pass, fix_required, or blocked.';
  end if;

  select lane.id, lower(lane.writer_provider), lane.reviewer_providers,
         lane.evidence, lane.status, lane.rework_round
    into v_lane_id, v_writer, v_reviewers, v_evidence, v_status, v_round
  from public.room_work_lanes lane
  where lane.room_id = p_room_id
    and lane.work_record_id = p_work_record_id
    and lane.lane_id = btrim(p_lane_id)
  limit 1;

  if v_lane_id is null then
    raise exception 'Work Lane not found.';
  end if;

  if v_reviewer = v_writer then
    raise exception 'Writer cannot review its own Work Lane.';
  end if;

  if not exists (
    select 1
    from unnest(v_reviewers) reviewer
    where lower(btrim(reviewer)) = v_reviewer
  ) then
    raise exception 'Reviewer is not assigned to this Work Lane.';
  end if;

  if v_status <> 'awaiting_review' then
    raise exception 'Work Lane is not awaiting independent review.';
  end if;

  if v_evidence is null or jsonb_typeof(v_evidence) <> 'object' or v_evidence = '{}'::jsonb then
    raise exception 'Evidence is required before review verdict.';
  end if;

  if exists (
    select 1
    from public.room_resource_locks active_lock
    where active_lock.room_id = p_room_id
      and active_lock.work_record_id = p_work_record_id
      and active_lock.work_lane_id = v_lane_id
      and active_lock.state = 'acquired'
      and active_lock.lease_expires_at > now()
  ) then
    raise exception 'Active Resource Locks prevent review completion.';
  end if;

  if v_verdict = 'pass' then
    v_next_status := 'passed';
    v_next_round := v_round;
  elsif v_verdict = 'blocked' then
    v_next_status := 'blocked';
    v_next_round := v_round;
  elsif v_round >= 2 then
    v_next_status := 'blocked';
    v_next_round := v_round;
  else
    v_next_status := 'fix_required';
    v_next_round := v_round + 1;
  end if;

  update public.room_work_lanes lane
  set status = v_next_status,
      rework_round = v_next_round,
      reviewer_verdict = jsonb_build_object(
        'reviewerProvider', v_reviewer,
        'verdict', v_verdict,
        'notes', coalesce(p_notes, '{}'::jsonb),
        'reviewedAt', now()
      ),
      updated_at = now()
  where lane.id = v_lane_id;

  return query
  select lane.id, lane.status, lane.rework_round, lane.reviewer_verdict
  from public.room_work_lanes lane
  where lane.id = v_lane_id;
end;
$$;

revoke all on function public.submit_room_factory_lane_evidence(uuid, uuid, text, jsonb) from public;
revoke execute on function public.submit_room_factory_lane_evidence(uuid, uuid, text, jsonb) from anon;
grant execute on function public.submit_room_factory_lane_evidence(uuid, uuid, text, jsonb) to authenticated;

revoke all on function public.review_room_factory_lane(uuid, uuid, text, text, text, jsonb) from public;
revoke execute on function public.review_room_factory_lane(uuid, uuid, text, text, text, jsonb) from anon;
grant execute on function public.review_room_factory_lane(uuid, uuid, text, text, text, jsonb) to authenticated;

comment on function public.submit_room_factory_lane_evidence(uuid, uuid, text, jsonb) is
  'Stores non-empty Host evidence after active locks are released and moves a lane to awaiting_review.';
comment on function public.review_room_factory_lane(uuid, uuid, text, text, text, jsonb) is
  'Records an assigned independent reviewer verdict; writer self-review and evidence-free PASS are rejected.';
