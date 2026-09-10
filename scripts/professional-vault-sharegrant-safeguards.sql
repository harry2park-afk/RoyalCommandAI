-- Disposable evidence for Professional Room Vault / ShareGrant foundation.
-- Run only against a disposable replay database. Never run this fixture on Hosted.

\set ON_ERROR_STOP on

begin;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'professional_vaults',
    'professional_vault_objects',
    'professional_share_grants',
    'professional_share_invalidation_events'
  ] loop
    if to_regclass('public.' || target_table) is null then
      raise exception 'Missing professional persistence table: %', target_table;
    end if;

    if not (select relrowsecurity from pg_class where oid = to_regclass('public.' || target_table)) then
      raise exception 'RLS must be enabled on %', target_table;
    end if;

    if has_table_privilege('anon', 'public.' || target_table, 'SELECT')
      or has_table_privilege('anon', 'public.' || target_table, 'INSERT')
      or has_table_privilege('anon', 'public.' || target_table, 'UPDATE')
      or has_table_privilege('anon', 'public.' || target_table, 'DELETE')
      or has_table_privilege('authenticated', 'public.' || target_table, 'SELECT')
      or has_table_privilege('authenticated', 'public.' || target_table, 'INSERT')
      or has_table_privilege('authenticated', 'public.' || target_table, 'UPDATE')
      or has_table_privilege('authenticated', 'public.' || target_table, 'DELETE') then
      raise exception '% must remain server-only', target_table;
    end if;
  end loop;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'professional_vaults',
        'professional_vault_objects',
        'professional_share_grants',
        'professional_share_invalidation_events'
      )
      and ('anon' = any(roles) or 'authenticated' = any(roles) or 'public' = any(roles))
  ) then
    raise exception 'Professional persistence tables must not expose client RLS policies in this schema-first lane';
  end if;

  if exists (select 1 from public.professional_vaults)
    or exists (select 1 from public.professional_vault_objects)
    or exists (select 1 from public.professional_share_grants)
    or exists (select 1 from public.professional_share_invalidation_events) then
    raise exception 'Professional persistence migration must seed zero rows';
  end if;

  if has_function_privilege('anon', 'private.professional_share_grant_is_active(uuid)', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.professional_share_grant_is_active(uuid)', 'EXECUTE') then
    raise exception 'ShareGrant resolver must not be callable by anon/authenticated';
  end if;

  if not has_function_privilege('service_role', 'private.professional_share_grant_is_active(uuid)', 'EXECUTE') then
    raise exception 'ShareGrant resolver must be available to the trusted service role';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'professional_vault_objects',
        'professional_share_grants',
        'professional_share_invalidation_events'
      )
      and lower(column_name) in (
        'payload_body',
        'raw_payload',
        'content',
        'content_body',
        'document_body',
        'transcript',
        'raw_transcript',
        'case_story',
        'desired_outcome',
        'ai_summary'
      )
  ) then
    raise exception 'Professional schema must not introduce protected payload-body columns into grant/invalidation metadata';
  end if;
end;
$$;

insert into auth.users(id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'vault-evidence-1@example.invalid', '{}'::jsonb, now(), now()),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'vault-evidence-2@example.invalid', '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles(id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'vault-evidence-1@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'vault-evidence-2@example.invalid')
on conflict (id) do nothing;

insert into public.households(id, owner_id, name)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Evidence Household A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Evidence Household B');

insert into public.rooms(id, household_id, room_owner_id, name)
values
  ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Evidence Professional Room A'),
  ('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Evidence Professional Room B');

do $$
declare
  legal_vault uuid;
  accounting_vault uuid;
  legal_object uuid;
  active_grant uuid;
  short_grant uuid;
  invalidation_id uuid;
  target_count integer;
begin
  insert into public.professional_vaults(
    tenant_id, room_id, domain, authority_user_id, policy_version
  ) values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'legal',
    '11111111-1111-4111-8111-111111111111',
    'v2.3-evidence'
  ) returning id into legal_vault;

  insert into public.professional_vaults(
    tenant_id, room_id, domain, authority_user_id, policy_version
  ) values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'accounting',
    '11111111-1111-4111-8111-111111111111',
    'v2.3-evidence'
  ) returning id into accounting_vault;

  begin
    insert into public.professional_vaults(
      tenant_id, room_id, domain, authority_user_id, policy_version
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
      'legal',
      '11111111-1111-4111-8111-111111111111',
      'v2.3-evidence'
    );
    raise exception '__vault_cross_tenant_not_blocked__';
  exception
    when raise_exception then
      if sqlerrm <> 'Professional vault Room/tenant boundary mismatch' then raise; end if;
  end;

  begin
    update public.professional_vaults
    set tenant_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        room_id = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
        authority_user_id = '22222222-2222-4222-8222-222222222222'
    where id = legal_vault;
    raise exception '__vault_rehome_not_blocked__';
  exception
    when raise_exception then
      if sqlerrm <> 'Professional vault tenant/Room/domain identity is immutable' then raise; end if;
  end;

  begin
    insert into public.professional_vaults(tenant_id, room_id, domain, policy_version)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      'virtual_bridge',
      'v2.3-evidence'
    );
    raise exception '__virtual_bridge_storage_not_blocked__';
  exception
    when check_violation then null;
  end;

  insert into public.professional_vault_objects(
    vault_id, tenant_id, room_id, object_key, object_type, payload_ref, payload_sha256, created_by
  ) values (
    legal_vault,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'legal-object-1',
    'document',
    'vault://evidence/legal-object-1',
    repeat('a', 64),
    '11111111-1111-4111-8111-111111111111'
  ) returning id into legal_object;

  begin
    insert into public.professional_vault_objects(
      vault_id, tenant_id, room_id, object_key, object_type, payload_ref
    ) values (
      legal_vault,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
      'bad-object',
      'document',
      'vault://evidence/bad-object'
    );
    raise exception '__object_cross_tenant_not_blocked__';
  exception
    when raise_exception then
      if sqlerrm <> 'Professional object Vault/Room/tenant boundary mismatch or inactive vault' then raise; end if;
  end;

  begin
    update public.professional_vault_objects
    set vault_id = accounting_vault,
        object_key = 'moved-object'
    where id = legal_object;
    raise exception '__object_rehome_not_blocked__';
  exception
    when raise_exception then
      if sqlerrm <> 'Professional vault object identity/content reference is immutable; create a new object version' then raise; end if;
  end;

  insert into public.professional_share_grants(
    tenant_id, source_vault_id, source_object_id, source_room_id,
    destination_room_id, destination_domain, grantor_user_id, field_scope,
    purpose, policy_version, idempotency_key, expires_at
  ) values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    legal_vault,
    legal_object,
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'accounting',
    '11111111-1111-4111-8111-111111111111',
    array['document_text'],
    'Evidence-only Legal to Accounting virtual view',
    'v2.3-evidence',
    'grant-evidence-1',
    now() + interval '1 hour'
  ) returning id into active_grant;

  if not private.professional_share_grant_is_active(active_grant) then
    raise exception 'Fresh verified ShareGrant should resolve active';
  end if;

  begin
    update public.professional_share_grants
    set field_scope = array['document_text', 'expanded_scope']
    where id = active_grant;
    raise exception '__grant_scope_mutation_not_blocked__';
  exception
    when raise_exception then
      if sqlerrm <> 'ShareGrant authority/scope is immutable; issue a new grant instead' then raise; end if;
  end;

  begin
    insert into public.professional_share_grants(
      tenant_id, source_vault_id, source_object_id, source_room_id,
      destination_room_id, destination_domain, grantor_user_id, purpose,
      policy_version, idempotency_key, expires_at
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      legal_vault,
      legal_object,
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      'legal',
      '11111111-1111-4111-8111-111111111111',
      'Invalid same-domain evidence grant',
      'v2.3-evidence',
      'grant-same-domain',
      now() + interval '1 hour'
    );
    raise exception '__same_domain_grant_not_blocked__';
  exception
    when raise_exception then
      if sqlerrm <> 'ShareGrant Virtual View must cross Legal/Accounting vault domains' then raise; end if;
  end;

  begin
    insert into public.professional_share_grants(
      tenant_id, source_vault_id, source_object_id, source_room_id,
      destination_room_id, destination_domain, grantor_user_id, purpose,
      policy_version, idempotency_key, expires_at
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      legal_vault,
      legal_object,
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
      'accounting',
      '11111111-1111-4111-8111-111111111111',
      'Invalid cross-tenant destination evidence grant',
      'v2.3-evidence',
      'grant-cross-tenant',
      now() + interval '1 hour'
    );
    raise exception '__cross_tenant_grant_not_blocked__';
  exception
    when raise_exception then
      if sqlerrm <> 'ShareGrant destination Room is outside the source tenant' then raise; end if;
  end;

  begin
    insert into public.professional_share_grants(
      tenant_id, source_vault_id, source_object_id, source_room_id,
      destination_room_id, destination_domain, grantor_user_id, purpose,
      policy_version, idempotency_key, expires_at
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      legal_vault,
      legal_object,
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
      'accounting',
      '11111111-1111-4111-8111-111111111111',
      'Duplicate idempotency evidence grant',
      'v2.3-evidence',
      'grant-evidence-1',
      now() + interval '1 hour'
    );
    raise exception '__duplicate_grant_not_blocked__';
  exception
    when unique_violation then null;
  end;

  update public.professional_share_grants
  set status = 'revoked',
      revoked_at = now(),
      revocation_reason = 'Disposable evidence revoke',
      updated_at = now()
  where id = active_grant;

  if private.professional_share_grant_is_active(active_grant) then
    raise exception 'Revoked ShareGrant remained active';
  end if;

  begin
    update public.professional_share_grants
    set status = 'active', revoked_at = null, revocation_reason = null
    where id = active_grant;
    raise exception '__revoked_grant_reactivated__';
  exception
    when raise_exception then
      if sqlerrm <> 'Revoked ShareGrant cannot be reactivated' then raise; end if;
  end;

  select id into invalidation_id
  from public.professional_share_invalidation_events
  where grant_id = active_grant
    and target = 'cache';

  if invalidation_id is null then
    raise exception 'Revocation did not automatically enqueue cache invalidation';
  end if;

  begin
    update public.professional_share_invalidation_events
    set target = 'vector_db'
    where id = invalidation_id;
    raise exception '__invalidation_identity_mutation_not_blocked__';
  exception
    when raise_exception then
      if sqlerrm <> 'ShareGrant invalidation identity is immutable' then raise; end if;
  end;

  select count(*) into target_count
  from public.professional_share_invalidation_events
  where grant_id = active_grant;

  if target_count <> 8 then
    raise exception 'Revocation must automatically enqueue all 8 invalidation target records, got %', target_count;
  end if;

  if exists (
    select required.target
    from unnest(array[
      'vector_db',
      'embeddings',
      'search_index',
      'cache',
      'prompt_context',
      'ai_memory',
      'derived_copy',
      'active_session'
    ]::text[]) as required(target)
    where not exists (
      select 1
      from public.professional_share_invalidation_events e
      where e.grant_id = active_grant
        and e.target = required.target
        and e.status = 'pending'
        and e.attempt_count = 0
    )
  ) then
    raise exception 'Revocation queue is missing a required pending invalidation target';
  end if;

  insert into public.professional_share_grants(
    tenant_id, source_vault_id, source_object_id, source_room_id,
    destination_room_id, destination_domain, grantor_user_id, purpose,
    policy_version, idempotency_key, expires_at
  ) values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    legal_vault,
    legal_object,
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    'accounting',
    '11111111-1111-4111-8111-111111111111',
    'Short-lived expiry evidence grant',
    'v2.3-evidence',
    'grant-short-expiry',
    now() + interval '2 seconds'
  ) returning id into short_grant;

  begin
    insert into public.professional_share_invalidation_events(tenant_id, grant_id, target)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', short_grant, 'cache');
    raise exception '__cross_tenant_invalidation_not_blocked__';
  exception
    when raise_exception then
      if sqlerrm <> 'ShareGrant invalidation event tenant mismatch' then raise; end if;
  end;

  create temporary table if not exists professional_evidence_ids(grant_id uuid);
  insert into professional_evidence_ids(grant_id) values (short_grant);
end;
$$;

commit;

select pg_sleep(3);

begin;

do $$
declare
  short_grant uuid;
begin
  select grant_id into short_grant from professional_evidence_ids limit 1;
  if private.professional_share_grant_is_active(short_grant) then
    raise exception 'Expired ShareGrant remained active';
  end if;
end;
$$;

rollback;
