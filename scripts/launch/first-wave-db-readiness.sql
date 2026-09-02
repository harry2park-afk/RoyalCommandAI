-- Royal Command October first-wave database readiness preflight.
-- READ ONLY: this script must not mutate schema, data, Auth, payment, or launch state.
-- First wave: Australia, United States, Canada, South Korea, Japan, United Kingdom.
-- PASS means only that the individual database evidence below is present.
-- A country is not launch-ready until the independent GitHub/deployment/Auth/legal/payment gates also pass.

with first_wave(country_code) as (
  values ('AU'), ('US'), ('CA'), ('KR'), ('JP'), ('GB')
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

  select
    'auth.matter_assignment_table',
    case
      when to_regclass('public.matter_staff_assignments') is not null then 'PASS'
      else 'BLOCKED'
    end,
    coalesce(to_regclass('public.matter_staff_assignments')::text, 'missing')

  union all

  select
    'auth.matter_staff_scope_policy',
    case
      when exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'matters'
          and coalesce(qual, '') ~* '(matter_staff_assignments|assigned_staff)'
      ) then 'PASS'
      else 'BLOCKED'
    end,
    coalesce(
      (
        select string_agg(policyname || ': ' || coalesce(qual, ''), ' | ' order by policyname)
        from pg_policies
        where schemaname = 'public'
          and tablename = 'matters'
          and cmd = 'SELECT'
      ),
      'no SELECT policy'
    )

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
        select count(distinct country_code)
        from public.rc_service_country_terms
        where country_code in ('AU', 'US', 'CA', 'KR', 'JP', 'GB')
      ) = 6 then 'PASS'
      else 'BLOCKED'
    end,
    'countries_present=' || coalesce(
      (
        select string_agg(distinct country_code, ',' order by country_code)
        from public.rc_service_country_terms
        where country_code in ('AU', 'US', 'CA', 'KR', 'JP', 'GB')
      ),
      'none'
    )

  union all

  select
    'payments.confirmed_catalog_prices',
    case
      when (
        select count(*)
        from public.rc_service_catalog
        where active
          and customer_selectable
          and price_minor > 0
          and price_status = 'confirmed'
      ) > 0 then 'PASS'
      else 'BLOCKED'
    end,
    'confirmed_positive=' || (
      select count(*)::text
      from public.rc_service_catalog
      where active
        and customer_selectable
        and price_minor > 0
        and price_status = 'confirmed'
    ) || ', active_selectable=' || (
      select count(*)::text
      from public.rc_service_catalog
      where active and customer_selectable
    ) || ', currencies=' || coalesce(
      (
        select string_agg(distinct currency, ',' order by currency)
        from public.rc_service_catalog
        where active
          and customer_selectable
          and currency is not null
      ),
      'none'
    )

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
  'recording.' || fw.country_code,
  case
    when p.review_status = 'approved'
      and p.recording_policy <> 'blocked' then 'PASS'
    else 'BLOCKED'
  end,
  'review=' || coalesce(p.review_status, 'missing')
    || ', policy=' || coalesce(p.recording_policy, 'missing')
    || ', consent=' || coalesce(p.consent_required::text, 'missing')
    || ', notice=' || coalesce(p.notice_required::text, 'missing')
from first_wave fw
left join public.communication_recording_policies p
  on p.country_code = fw.country_code
 and p.region_code is null

order by metric;
