-- RoyalCommandAI customer-account authority remediation candidate.
--
-- IMPORTANT:
--   Evidence/staging candidate only. Do not apply to Hosted/Production until the
--   unresolved 20260920091809 deployment/reviewer provenance is closed and the
--   linked dry-run gate has passed.
--
-- Goals:
--   * preserve owner-scoped authenticated read-back through existing RLS;
--   * remove direct anon/authenticated control-plane writes;
--   * provide one trusted, idempotent server allocator;
--   * keep allocation concurrency-safe without exposing sequence access to clients.

begin;

do $$
declare
  v_rls_enabled boolean;
  v_read_policy_count integer;
begin
  if to_regclass('public.rc_customer_accounts') is null then
    raise exception 'RC_CUSTOMER_ACCOUNT_PREFLIGHT: public.rc_customer_accounts is missing';
  end if;

  if to_regclass('public.rc_customer_number_seq') is null then
    raise exception 'RC_CUSTOMER_ACCOUNT_PREFLIGHT: public.rc_customer_number_seq is missing';
  end if;

  select c.relrowsecurity
  into v_rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'rc_customer_accounts';

  if v_rls_enabled is distinct from true then
    raise exception 'RC_CUSTOMER_ACCOUNT_PREFLIGHT: RLS must already be enabled';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rc_customer_accounts'
      and column_name = 'owner_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rc_customer_accounts'
      and column_name = 'customer_number'
      and data_type = 'text'
      and is_nullable = 'NO'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rc_customer_accounts'
      and column_name = 'customer_sequence'
      and data_type = 'bigint'
      and is_nullable = 'NO'
  ) then
    raise exception 'RC_CUSTOMER_ACCOUNT_PREFLIGHT: verified authority columns do not match';
  end if;

  select count(*)::integer
  into v_read_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'rc_customer_accounts'
    and policyname = 'rc_customer_accounts_read_own'
    and cmd = 'SELECT';

  if v_read_policy_count <> 1 then
    raise exception 'RC_CUSTOMER_ACCOUNT_PREFLIGHT: expected owner-read policy is missing or ambiguous';
  end if;
end;
$$;

-- Client roles must not control customer-account identity rows directly.
revoke all privileges on table public.rc_customer_accounts from anon, authenticated;
grant select on table public.rc_customer_accounts to authenticated;

-- Keep the sequence unavailable to clients. Existing trusted server-role usage is
-- intentionally not broadened or removed by this narrow candidate.
revoke all privileges on sequence public.rc_customer_number_seq from public, anon, authenticated;

create or replace function public.ensure_rc_customer_account(p_owner_id uuid)
returns public.rc_customer_accounts
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_account public.rc_customer_accounts%rowtype;
  v_sequence bigint;
  v_customer_number text;
begin
  if p_owner_id is null then
    raise exception 'RC_CUSTOMER_ACCOUNT_OWNER_REQUIRED';
  end if;

  -- Serialize allocation for one owner so concurrent retries return one identity
  -- without consuming multiple sequence values for the same owner.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text, 0)
  );

  select *
  into v_account
  from public.rc_customer_accounts
  where owner_id = p_owner_id;

  if found then
    return v_account;
  end if;

  v_sequence := pg_catalog.nextval('public.rc_customer_number_seq'::regclass);

  if v_sequence < 357060 or v_sequence > 9999999 then
    raise exception 'RC_CUSTOMER_NUMBER_CAPACITY_EXHAUSTED';
  end if;

  v_customer_number := 'RC ' || pg_catalog.lpad(v_sequence::text, 7, '0');

  insert into public.rc_customer_accounts (
    owner_id,
    customer_number,
    customer_sequence,
    created_at,
    updated_at
  ) values (
    p_owner_id,
    v_customer_number,
    v_sequence,
    pg_catalog.now(),
    pg_catalog.now()
  )
  returning * into v_account;

  return v_account;
end;
$$;

revoke all privileges on function public.ensure_rc_customer_account(uuid)
  from public, anon, authenticated;
grant execute on function public.ensure_rc_customer_account(uuid) to service_role;

commit;
