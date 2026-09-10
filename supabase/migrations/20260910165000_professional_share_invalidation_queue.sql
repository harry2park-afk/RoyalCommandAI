-- Professional ShareGrant derived-data invalidation queue.
--
-- SAFETY / SCOPE:
-- - additive queueing only; no external deletion, provider call, customer payload read,
--   Hosted activation, payment action, Country READY transition or Production deploy;
-- - revoked grants enqueue all eight invalidation targets automatically;
-- - expired active grants can be queued only through a trusted service-role batch call;
-- - queue creation is idempotent by the existing unique (grant_id, target) boundary;
-- - this migration does not claim that queued invalidation has actually been executed.

create or replace function private.enqueue_professional_share_invalidations(
  p_grant_id uuid,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_tenant_id uuid;
  v_status text;
  v_expires_at timestamptz;
  v_inserted integer := 0;
begin
  if p_reason not in ('revoked', 'expired') then
    raise exception 'Unsupported Professional ShareGrant invalidation reason';
  end if;

  select g.tenant_id, g.status, g.expires_at
    into v_tenant_id, v_status, v_expires_at
  from public.professional_share_grants g
  where g.id = p_grant_id;

  if not found then
    raise exception 'Professional ShareGrant not found';
  end if;

  if p_reason = 'revoked' and v_status <> 'revoked' then
    raise exception 'Revocation invalidation requires a revoked ShareGrant';
  end if;

  if p_reason = 'expired' and v_expires_at > clock_timestamp() then
    raise exception 'Expiry invalidation requires an expired ShareGrant';
  end if;

  insert into public.professional_share_invalidation_events(
    tenant_id,
    grant_id,
    target,
    status,
    attempt_count
  )
  select
    v_tenant_id,
    p_grant_id,
    target,
    'pending',
    0
  from unnest(array[
    'active_session',
    'prompt_context',
    'ai_memory',
    'cache',
    'search_index',
    'embeddings',
    'vector_db',
    'derived_copy'
  ]::text[]) as target
  on conflict (grant_id, target) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function private.enqueue_professional_share_invalidations_on_revoke()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if old.status is distinct from new.status and new.status = 'revoked' then
    perform private.enqueue_professional_share_invalidations(new.id, 'revoked');
  end if;

  return new;
end;
$$;

drop trigger if exists professional_share_grants_invalidation_on_revoke
  on public.professional_share_grants;

create trigger professional_share_grants_invalidation_on_revoke
after update of status on public.professional_share_grants
for each row
execute function private.enqueue_professional_share_invalidations_on_revoke();

create or replace function private.enqueue_expired_professional_share_invalidations(
  p_limit integer default 100
)
returns table(grant_id uuid, enqueued_count integer)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_grant_id uuid;
begin
  if p_limit < 1 or p_limit > 1000 then
    raise exception 'Professional ShareGrant expiry batch limit must be between 1 and 1000';
  end if;

  for v_grant_id in
    select g.id
    from public.professional_share_grants g
    where g.status = 'active'
      and g.revoked_at is null
      and g.expires_at <= clock_timestamp()
      and (
        select count(*)
        from public.professional_share_invalidation_events e
        where e.grant_id = g.id
      ) < 8
    order by g.expires_at, g.id
    limit p_limit
  loop
    grant_id := v_grant_id;
    enqueued_count := private.enqueue_professional_share_invalidations(
      v_grant_id,
      'expired'
    );
    return next;
  end loop;
end;
$$;

revoke all on function private.enqueue_professional_share_invalidations(uuid, text)
  from public, anon, authenticated;
revoke all on function private.enqueue_professional_share_invalidations_on_revoke()
  from public, anon, authenticated;
revoke all on function private.enqueue_expired_professional_share_invalidations(integer)
  from public, anon, authenticated;

grant execute on function private.enqueue_expired_professional_share_invalidations(integer)
  to service_role;
