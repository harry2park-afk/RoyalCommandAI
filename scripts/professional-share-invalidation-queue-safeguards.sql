-- Disposable evidence for Professional ShareGrant revocation/expiry invalidation queue.
-- Never run this fixture against Hosted Supabase.

\set ON_ERROR_STOP on

begin;

do $$
begin
  if to_regprocedure('private.enqueue_professional_share_invalidations(uuid,text)') is null then
    raise exception 'Missing internal Professional ShareGrant invalidation enqueue function';
  end if;

  if to_regprocedure('private.enqueue_expired_professional_share_invalidations(integer)') is null then
    raise exception 'Missing trusted expired Professional ShareGrant enqueue function';
  end if;

  if not exists (
    select 1
    from pg_trigger tg
    join pg_class c on c.oid = tg.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'professional_share_grants'
      and tg.tgname = 'professional_share_grants_invalidation_on_revoke'
      and not tg.tgisinternal
      and tg.tgenabled <> 'D'
  ) then
    raise exception 'Missing active ShareGrant revocation invalidation trigger';
  end if;

  if has_function_privilege(
      'anon',
      'private.enqueue_expired_professional_share_invalidations(integer)',
      'EXECUTE'
    )
    or has_function_privilege(
      'authenticated',
      'private.enqueue_expired_professional_share_invalidations(integer)',
      'EXECUTE'
    ) then
    raise exception 'Expired ShareGrant invalidation enqueue must remain server-only';
  end if;

  if not has_function_privilege(
    'service_role',
    'private.enqueue_expired_professional_share_invalidations(integer)',
    'EXECUTE'
  ) then
    raise exception 'Trusted service role must be able to enqueue expired ShareGrant invalidations';
  end if;
end;
$$;

insert into auth.users(id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('31111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'invalidation-evidence@example.invalid', '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles(id, email)
values
  ('31111111-1111-4111-8111-111111111111', 'invalidation-evidence@example.invalid')
on conflict (id) do nothing;

insert into public.households(id, owner_id, name)
values
  ('caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '31111111-1111-4111-8111-111111111111', 'Invalidation Evidence Household');

insert into public.rooms(id, household_id, room_owner_id, name)
values
  ('caaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '31111111-1111-4111-8111-111111111111', 'Invalidation Legal Room'),
  ('caaaaaaa-2222-4222-8222-aaaaaaaaaaaa', 'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '31111111-1111-4111-8111-111111111111', 'Invalidation Accounting Room');

insert into public.professional_vaults(
  id,
  tenant_id,
  room_id,
  domain,
  authority_user_id,
  policy_version
)
values (
  'caaaaaaa-3333-4333-8333-aaaaaaaaaaaa',
  'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'caaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'legal',
  '31111111-1111-4111-8111-111111111111',
  'evidence-v1'
);

insert into public.professional_vault_objects(
  id,
  vault_id,
  tenant_id,
  room_id,
  object_key,
  object_type,
  payload_ref,
  payload_sha256,
  created_by
)
values (
  'caaaaaaa-4444-4444-8444-aaaaaaaaaaaa',
  'caaaaaaa-3333-4333-8333-aaaaaaaaaaaa',
  'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'caaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'evidence/object-1',
  'document',
  'vault://evidence/object-1',
  repeat('a', 64),
  '31111111-1111-4111-8111-111111111111'
);

insert into public.professional_share_grants(
  id,
  tenant_id,
  source_vault_id,
  source_object_id,
  source_room_id,
  destination_room_id,
  destination_domain,
  grantor_user_id,
  purpose,
  policy_version,
  idempotency_key,
  expires_at
)
values (
  'caaaaaaa-5555-4555-8555-aaaaaaaaaaaa',
  'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'caaaaaaa-3333-4333-8333-aaaaaaaaaaaa',
  'caaaaaaa-4444-4444-8444-aaaaaaaaaaaa',
  'caaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'caaaaaaa-2222-4222-8222-aaaaaaaaaaaa',
  'accounting',
  '31111111-1111-4111-8111-111111111111',
  'Revocation queue evidence',
  'evidence-v1',
  'revocation-evidence',
  clock_timestamp() + interval '1 hour'
);

do $$
begin
  if exists (
    select 1
    from public.professional_share_invalidation_events
    where grant_id = 'caaaaaaa-5555-4555-8555-aaaaaaaaaaaa'
  ) then
    raise exception 'Active non-expired ShareGrant must not enqueue invalidation work';
  end if;
end;
$$;

update public.professional_share_grants
set status = 'revoked',
    revoked_at = clock_timestamp(),
    revocation_reason = 'Disposable evidence revocation'
where id = 'caaaaaaa-5555-4555-8555-aaaaaaaaaaaa';

do $$
declare
  v_count integer;
  v_pending integer;
  v_wrong_tenant integer;
  v_reenqueue integer;
begin
  select count(*),
         count(*) filter (where status = 'pending' and attempt_count = 0),
         count(*) filter (where tenant_id <> 'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    into v_count, v_pending, v_wrong_tenant
  from public.professional_share_invalidation_events
  where grant_id = 'caaaaaaa-5555-4555-8555-aaaaaaaaaaaa';

  if v_count <> 8 or v_pending <> 8 or v_wrong_tenant <> 0 then
    raise exception 'Revocation must enqueue exactly eight tenant-bound pending invalidation targets';
  end if;

  if exists (
    select required.target
    from unnest(array[
      'active_session',
      'prompt_context',
      'ai_memory',
      'cache',
      'search_index',
      'embeddings',
      'vector_db',
      'derived_copy'
    ]::text[]) as required(target)
    where not exists (
      select 1
      from public.professional_share_invalidation_events e
      where e.grant_id = 'caaaaaaa-5555-4555-8555-aaaaaaaaaaaa'
        and e.target = required.target
    )
  ) then
    raise exception 'Revocation invalidation queue is missing a required derived-data target';
  end if;

  select private.enqueue_professional_share_invalidations(
    'caaaaaaa-5555-4555-8555-aaaaaaaaaaaa',
    'revoked'
  ) into v_reenqueue;

  if v_reenqueue <> 0 then
    raise exception 'Revocation invalidation queue must be idempotent';
  end if;
end;
$$;

insert into public.professional_share_grants(
  id,
  tenant_id,
  source_vault_id,
  source_object_id,
  source_room_id,
  destination_room_id,
  destination_domain,
  grantor_user_id,
  purpose,
  policy_version,
  idempotency_key,
  expires_at
)
values (
  'caaaaaaa-6666-4666-8666-aaaaaaaaaaaa',
  'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'caaaaaaa-3333-4333-8333-aaaaaaaaaaaa',
  'caaaaaaa-4444-4444-8444-aaaaaaaaaaaa',
  'caaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  'caaaaaaa-2222-4222-8222-aaaaaaaaaaaa',
  'accounting',
  '31111111-1111-4111-8111-111111111111',
  'Expiry queue evidence',
  'evidence-v1',
  'expiry-evidence',
  clock_timestamp() + interval '250 milliseconds'
);

select pg_sleep(0.40);

do $$
declare
  v_enqueued integer;
  v_count integer;
  v_second_pass integer;
begin
  select coalesce(sum(enqueued_count), 0)
    into v_enqueued
  from private.enqueue_expired_professional_share_invalidations(10)
  where grant_id = 'caaaaaaa-6666-4666-8666-aaaaaaaaaaaa';

  if v_enqueued <> 8 then
    raise exception 'Expired ShareGrant must enqueue exactly eight invalidation targets';
  end if;

  select count(*)
    into v_count
  from public.professional_share_invalidation_events
  where grant_id = 'caaaaaaa-6666-4666-8666-aaaaaaaaaaaa'
    and status = 'pending'
    and attempt_count = 0;

  if v_count <> 8 then
    raise exception 'Expired ShareGrant invalidation events must begin pending with zero attempts';
  end if;

  if not exists (
    select 1
    from public.professional_share_grants
    where id = 'caaaaaaa-6666-4666-8666-aaaaaaaaaaaa'
      and status = 'active'
      and revoked_at is null
  ) then
    raise exception 'Expiry enqueue must not rewrite grant authority state';
  end if;

  select coalesce(sum(enqueued_count), 0)
    into v_second_pass
  from private.enqueue_expired_professional_share_invalidations(10)
  where grant_id = 'caaaaaaa-6666-4666-8666-aaaaaaaaaaaa';

  if v_second_pass <> 0 then
    raise exception 'Expired ShareGrant queue must not duplicate completed queue creation';
  end if;
end;
$$;

do $$
begin
  begin
    perform private.enqueue_professional_share_invalidations(
      'caaaaaaa-6666-4666-8666-aaaaaaaaaaaa',
      'revoked'
    );
    raise exception 'Active ShareGrant must not accept revocation invalidation reason';
  exception
    when others then
      if sqlerrm = 'Active ShareGrant must not accept revocation invalidation reason' then
        raise;
      end if;
  end;

  begin
    perform * from private.enqueue_expired_professional_share_invalidations(0);
    raise exception 'Invalid expiry batch limit must fail closed';
  exception
    when others then
      if sqlerrm = 'Invalid expiry batch limit must fail closed' then
        raise;
      end if;
  end;
end;
$$;

rollback;
