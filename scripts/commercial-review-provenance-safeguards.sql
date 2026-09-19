\set ON_ERROR_STOP on

begin;

-- The migration must create explicit review provenance without silently granting
-- approval or weakening the existing server-owned provider boundary.
do $$
declare
  terms_default text;
  offers_default text;
begin
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rc_service_country_terms'
      and column_name in ('review_status', 'reviewed_by', 'reviewed_at')
  ) <> 3 then
    raise exception 'country terms review provenance columns are incomplete';
  end if;

  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rc_service_provider_offers'
      and column_name in ('review_status', 'reviewed_by', 'reviewed_at')
  ) <> 3 then
    raise exception 'provider offer review provenance columns are incomplete';
  end if;

  select column_default into terms_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'rc_service_country_terms'
    and column_name = 'review_status';

  select column_default into offers_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'rc_service_provider_offers'
    and column_name = 'review_status';

  if terms_default is null or position('needs_review' in terms_default) = 0 then
    raise exception 'country terms must default fail-closed to needs_review';
  end if;

  if offers_default is null or position('unverified' in offers_default) = 0 then
    raise exception 'provider offers must default fail-closed to unverified';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('rc_service_country_terms', 'rc_service_provider_offers')
      and column_name = 'review_status'
      and is_nullable <> 'NO'
  ) then
    raise exception 'review_status must be NOT NULL';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rc_service_country_terms'::regclass
      and conname = 'rc_service_country_terms_review_status_check'
      and convalidated
  ) then
    raise exception 'country terms review status constraint is missing or unvalidated';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rc_service_country_terms'::regclass
      and conname = 'rc_service_country_terms_approval_provenance_check'
      and convalidated
  ) then
    raise exception 'country terms approval provenance constraint is missing or unvalidated';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rc_service_provider_offers'::regclass
      and conname = 'rc_service_provider_offers_review_status_check'
      and convalidated
  ) then
    raise exception 'provider offer review status constraint is missing or unvalidated';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rc_service_provider_offers'::regclass
      and conname = 'rc_service_provider_offers_approval_provenance_check'
      and convalidated
  ) then
    raise exception 'provider offer approval provenance constraint is missing or unvalidated';
  end if;

  if exists (
    select 1 from public.rc_service_country_terms
    where review_status = 'approved'
      and (reviewed_by is null or reviewed_at is null)
  ) then
    raise exception 'country terms contain an approval without reviewer provenance';
  end if;

  if exists (
    select 1 from public.rc_service_provider_offers
    where review_status = 'approved'
      and (reviewed_by is null or reviewed_at is null)
  ) then
    raise exception 'provider offers contain an approval without reviewer provenance';
  end if;
end
$$;

-- Prove the approval constraint behavior against the real replayed tables. The
-- transaction rolls every synthetic row back and therefore creates no evidence.
do $$
declare
  v_service_key text;
begin
  select service_key into v_service_key
  from public.rc_service_catalog
  order by service_key
  limit 1;

  if v_service_key is null then
    raise exception 'service catalog is empty; cannot prove commercial provenance constraint';
  end if;

  begin
    insert into public.rc_service_country_terms (
      service_key, country_code, currency, review_status
    ) values (
      v_service_key, 'ZZ', 'ZZZ', 'approved'
    );
    raise exception 'country terms accepted APPROVED without reviewer provenance';
  exception
    when check_violation then null;
  end;

  insert into public.rc_service_country_terms (
    service_key, country_code, currency, review_status, reviewed_by, reviewed_at
  ) values (
    v_service_key,
    'ZZ',
    'ZZZ',
    'approved',
    '00000000-0000-0000-0000-000000000001'::uuid,
    now()
  );

  insert into public.rc_service_providers (
    provider_key, provider_name, category, active
  ) values (
    '__commercial_provenance_safeguard__',
    'Commercial provenance safeguard',
    'test',
    false
  );

  begin
    insert into public.rc_service_provider_offers (
      service_key,
      provider_key,
      country_code,
      commercial_model,
      currency,
      active,
      review_status
    ) values (
      v_service_key,
      '__commercial_provenance_safeguard__',
      'ZZ',
      'custom_quote',
      'ZZZ',
      false,
      'approved'
    );
    raise exception 'provider offer accepted APPROVED without reviewer provenance';
  exception
    when check_violation then null;
  end;

  insert into public.rc_service_provider_offers (
    service_key,
    provider_key,
    country_code,
    commercial_model,
    currency,
    active,
    review_status,
    reviewed_by,
    reviewed_at
  ) values (
    v_service_key,
    '__commercial_provenance_safeguard__',
    'ZZ',
    'custom_quote',
    'ZZZ',
    false,
    'approved',
    '00000000-0000-0000-0000-000000000001'::uuid,
    now()
  );
end
$$;

rollback;
