-- Royal Command October first-wave database readiness preflight.
-- READ ONLY: this script must not mutate schema, data, Auth, payment, or launch state.
-- First wave: Australia, United States, Canada, South Korea, Japan, United Kingdom.
-- PASS means only that the individual database evidence below is present.
-- A country is not launch-ready until the independent GitHub/deployment/Auth/legal/payment gates also pass.

begin transaction read only;

with first_wave(country_code, expected_currency) as (
  values
    ('AU', 'AUD'),
    ('US', 'USD'),
    ('CA', 'CAD'),
    ('KR', 'KRW'),
    ('JP', 'JPY'),
    ('GB', 'GBP')
),
checks as (
  select
    'schema.tenant_assignment_migration'::text as metric,
    case
      when exists (
        select 1
        from supabase_migrations.schema_migrations
        where version = '20260831225500'
      ) then 'PASS'
      else 'BLOCKED'
    end as status,
    'expected migration 20260831225500_scope_matter_staff_access'::text as detail

  union all

  select
    'schema.room_factory_non_encounter_migration',
    case
      when exists (
        select 1
        from supabase_migrations.schema_migrations
        where version = '20260901025800'
      ) then 'PASS'
      else 'BLOCKED'
    end,
    'expected migration 20260901025800_room_factory_atomic_non_encounter'

  union all

  -- The reviewed Matter cutover design uses matters.assigned_staff_id plus an
  -- admin-controlled assignment RPC/helper. A separate assignment table is not
  -- part of the current source contract.
  select
    'auth.matter_assignment_objects',
    case
      when exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'matters'
          and column_name = 'assigned_staff_id'
      )
      and to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is not null
      and to_regprocedure('private.is_assigned_matter_staff(uuid)') is not null
      then 'PASS'
      else 'BLOCKED'
    end,
    'assigned_staff_id=' || exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'matters'
        and column_name = 'assigned_staff_id'
    )::text
      || ', assignment_rpc=' || (to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is not null)::text
      || ', assignment_helper=' || (to_regprocedure('private.is_assigned_matter_staff(uuid)') is not null)::text

  union all

  select
    'auth.matter_staff_scope_policy',
    case
      when not exists (
        select 1
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename in ('matters','matter_documents','matter_messages','matter_chat_reads')
          and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ilike '%is_staff_or_admin%'
      )
      and (
        select count(*)
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename in ('matters','matter_documents','matter_messages','matter_chat_reads')
          and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ilike '%is_assigned_matter_staff%'
      ) >= 8
      then 'PASS'
      else 'BLOCKED'
    end,
    'legacy_global_staff_policies=' || (
      select count(*)::text
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename in ('matters','matter_documents','matter_messages','matter_chat_reads')
        and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ilike '%is_staff_or_admin%'
    )
      || ', assignment_scoped_policies=' || (
        select count(*)::text
        from pg_policies p
        where p.schemaname = 'public'
          and p.tablename in ('matters','matter_documents','matter_messages','matter_chat_reads')
          and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ilike '%is_assigned_matter_staff%'
      )

  union all

  select
    'auth.critical_rls_enabled',
    case
      when (
        select count(*)
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in (
            'matters',
            'rooms',
            'room_members',
            'room_factory_manifests',
            'rc_service_connection_orders'
          )
          and c.relrowsecurity
      ) = 5 then 'PASS'
      else 'BLOCKED'
    end,
    'rls_enabled=' || (
      select count(*)::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
          'matters',
          'rooms',
          'room_members',
          'room_factory_manifests',
          'rc_service_connection_orders'
        )
        and c.relrowsecurity
    ) || '/5'

  union all

  select
    'auth.room_scope_policy_shape',
    case
      when exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'rooms'
          and cmd = 'SELECT'
          and coalesce(qual, '') ~* '(is_room_member|room_owner_id|is_household_member)'
      )
      and exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'room_members'
          and cmd = 'SELECT'
          and coalesce(qual, '') ~* '(is_room_member|user_id)'
      )
      and exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'room_factory_manifests'
          and cmd = 'SELECT'
          and coalesce(qual, '') ~* 'is_room_member'
      ) then 'PASS'
      else 'BLOCKED'
    end,
    'rooms_select_scoped=' || exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'rooms'
        and cmd = 'SELECT'
        and coalesce(qual, '') ~* '(is_room_member|room_owner_id|is_household_member)'
    )::text
      || ', room_members_select_scoped=' || exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'room_members'
          and cmd = 'SELECT'
          and coalesce(qual, '') ~* '(is_room_member|user_id)'
      )::text
      || ', manifests_select_member=' || exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'room_factory_manifests'
          and cmd = 'SELECT'
          and coalesce(qual, '') ~* 'is_room_member'
      )::text

  union all

  select
    'room_factory.manifest_integrity',
    case
      when (
        select count(*)
        from public.room_factory_manifests m
        left join public.rooms r on r.id = m.room_id
        where r.id is null
      ) = 0
      and (
        select count(*)
        from public.room_factory_manifests m
        join public.rooms r on r.id = m.room_id
        where r.room_owner_id is distinct from m.owner_id
      ) = 0
      and (
        select count(*)
        from public.room_factory_manifests m
        where not exists (
          select 1
          from public.room_members rm
          where rm.room_id = m.room_id
            and rm.user_id = m.owner_id
            and rm.role = 'owner'
        )
      ) = 0 then 'PASS'
      else 'BLOCKED'
    end,
    'orphans=' || (
      select count(*)::text
      from public.room_factory_manifests m
      left join public.rooms r on r.id = m.room_id
      where r.id is null
    ) || ', owner_mismatch=' || (
      select count(*)::text
      from public.room_factory_manifests m
      join public.rooms r on r.id = m.room_id
      where r.room_owner_id is distinct from m.owner_id
    ) || ', missing_owner_membership=' || (
      select count(*)::text
      from public.room_factory_manifests m
      where not exists (
        select 1
        from public.room_members rm
        where rm.room_id = m.room_id
          and rm.user_id = m.owner_id
          and rm.role = 'owner'
      )
    )

  union all

  select
    'room_factory.null_encounter_inventory',
    'INFO',
    'null_encounter=' || (
      select count(*)::text
      from public.room_factory_manifests
      where encounter_session_id is null
    ) || ', total=' || (
      select count(*)::text
      from public.room_factory_manifests
    ) || ', null encounter IDs are valid for non-encounter creation after migration 20260901025800'

  union all

  select
    'payments.first_wave_country_terms',
    case
      when (
        select count(*)
        from first_wave fw
        where exists (
          select 1
          from public.rc_service_country_terms t
          where upper(t.country_code) = fw.country_code
            and upper(t.currency) = fw.expected_currency
            and lower(t.availability_status) not in ('blocked','unavailable','disabled')
        )
      ) = 6 then 'PASS'
      else 'BLOCKED'
    end,
    'expected-country/currency nonblocked terms=' || (
      select count(*)::text
      from first_wave fw
      where exists (
        select 1
        from public.rc_service_country_terms t
        where upper(t.country_code) = fw.country_code
          and upper(t.currency) = fw.expected_currency
          and lower(t.availability_status) not in ('blocked','unavailable','disabled')
      )
    ) || '/6'

  union all

  select
    'payments.fixed_positive_catalog_prices',
    case
      when (
        select count(*)
        from first_wave fw
        where exists (
          select 1
          from public.rc_service_catalog c
          where c.active
            and c.customer_selectable
            and c.price_status = 'fixed'
            and coalesce(c.price_minor, 0) > 0
            and upper(c.currency) = fw.expected_currency
        )
      ) = 6 then 'PASS'
      else 'BLOCKED'
    end,
    'expected currencies with >=1 active/selectable fixed positive service=' || (
      select count(*)::text
      from first_wave fw
      where exists (
        select 1
        from public.rc_service_catalog c
        where c.active
          and c.customer_selectable
          and c.price_status = 'fixed'
          and coalesce(c.price_minor, 0) > 0
          and upper(c.currency) = fw.expected_currency
      )
    ) || '/6'

  union all

  select
    'payments.order_owner_isolation_policy',
    case
      when exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'rc_service_connection_orders'
          and cmd = 'SELECT'
          and coalesce(qual, '') ~* '(owner_id.*auth[.]uid|auth[.]uid.*owner_id)'
      )
      and exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'rc_service_connection_orders'
          and cmd = 'INSERT'
          and coalesce(with_check, '') ~* '(owner_id.*auth[.]uid|auth[.]uid.*owner_id)'
      ) then 'PASS'
      else 'BLOCKED'
    end,
    'owner_select=' || exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'rc_service_connection_orders'
        and cmd = 'SELECT'
        and coalesce(qual, '') ~* '(owner_id.*auth[.]uid|auth[.]uid.*owner_id)'
    )::text
      || ', owner_insert=' || exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'rc_service_connection_orders'
          and cmd = 'INSERT'
          and coalesce(with_check, '') ~* '(owner_id.*auth[.]uid|auth[.]uid.*owner_id)'
      )::text

  union all

  select
    'payments.orders',
    'INFO',
    'existing_orders=' || (
      select count(*)::text
      from public.rc_service_connection_orders
    )
)
select metric, status, detail
from checks

union all

select
  'payments.terms.' || fw.country_code,
  case
    when exists (
      select 1
      from public.rc_service_country_terms t
      where upper(t.country_code) = fw.country_code
        and upper(t.currency) = fw.expected_currency
        and lower(t.availability_status) not in ('blocked','unavailable','disabled')
    ) then 'PASS'
    else 'BLOCKED'
  end,
  'expected_currency=' || fw.expected_currency
    || ', matching_nonblocked_terms=' || (
      select count(*)::text
      from public.rc_service_country_terms t
      where upper(t.country_code) = fw.country_code
        and upper(t.currency) = fw.expected_currency
        and lower(t.availability_status) not in ('blocked','unavailable','disabled')
    )
    || ', any_terms=' || (
      select count(*)::text
      from public.rc_service_country_terms t
      where upper(t.country_code) = fw.country_code
    )
from first_wave fw

union all

select
  'recording.' || fw.country_code,
  case
    when p.review_status = 'approved'
      and p.recording_policy <> 'blocked'
      and p.reviewed_by is not null
      and p.reviewed_at is not null
      and length(btrim(coalesce(p.legal_basis, ''))) > 0
      then 'PASS'
    else 'BLOCKED'
  end,
  'review=' || coalesce(p.review_status, 'missing')
    || ', policy=' || coalesce(p.recording_policy, 'missing')
    || ', reviewer_present=' || (p.reviewed_by is not null)::text
    || ', reviewed_at_present=' || (p.reviewed_at is not null)::text
    || ', legal_basis_present=' || (length(btrim(coalesce(p.legal_basis, ''))) > 0)::text
    || ', consent=' || coalesce(p.consent_required::text, 'missing')
    || ', notice=' || coalesce(p.notice_required::text, 'missing')
from first_wave fw
left join public.communication_recording_policies p
  on upper(p.country_code) = fw.country_code
 and p.region_code is null

order by metric;

rollback;
