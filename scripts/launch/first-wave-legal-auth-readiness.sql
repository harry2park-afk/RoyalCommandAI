-- Royal Command October first-wave legal/Auth isolation readiness preflight.
-- READ ONLY: this script must not mutate schema, data, Auth, legal/compliance, or launch state.
-- PASS means only that the individual database evidence below is present.
-- Static policy-shape checks do not replace authenticated cross-tenant negative tests or legal review.

with legal_tables(table_name) as (
  values
    ('legal_cases'),
    ('legal_evidence_items'),
    ('legal_room_workspaces'),
    ('legal_story_entries')
),
checks as (
  select
    'legal.critical_rls_enabled'::text as metric,
    case
      when (
        select count(*)
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in (
            'auth_consents',
            'legal_cases',
            'legal_evidence_items',
            'legal_room_workspaces',
            'legal_story_entries'
          )
          and c.relrowsecurity
      ) = 5 then 'PASS'
      else 'BLOCKED'
    end as status,
    'rls_enabled=' || (
      select count(*)::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
          'auth_consents',
          'legal_cases',
          'legal_evidence_items',
          'legal_room_workspaces',
          'legal_story_entries'
        )
        and c.relrowsecurity
    ) || '/5' as detail

  union all

  select
    'auth.consent_select_owner_scope',
    case
      when exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'auth_consents'
          and cmd = 'SELECT'
          and coalesce(qual, '') ~* 'auth\.uid\(\).*user_id|user_id.*auth\.uid\(\)'
      ) then 'PASS'
      else 'BLOCKED'
    end,
    coalesce(
      (
        select string_agg(policyname || ': ' || coalesce(qual, ''), ' | ' order by policyname)
        from pg_policies
        where schemaname = 'public'
          and tablename = 'auth_consents'
          and cmd = 'SELECT'
      ),
      'no SELECT policy'
    )

  union all

  select
    'auth.consent_inventory',
    'INFO',
    'total=' || count(*)::text
      || ', user_scoped=' || count(*) filter (where user_id is not null)::text
      || ', anonymous=' || count(*) filter (where user_id is null)::text
      || ', locales=' || count(distinct locale)::text
      || ', purposes=' || count(distinct purpose)::text
  from public.auth_consents

  union all

  select
    'legal.data_integrity',
    case
      when (
        select count(*)
        from public.legal_cases lc
        left join public.rooms r on r.id = lc.room_id
        where r.id is null
          or r.room_owner_id is distinct from lc.owner_id
      ) = 0
      and (
        select count(*)
        from public.legal_evidence_items le
        left join public.rooms r on r.id = le.room_id
        where r.id is null
          or r.room_owner_id is distinct from le.owner_id
      ) = 0
      and (
        select count(*)
        from public.legal_room_workspaces lw
        left join public.rooms r on r.id = lw.room_id
        where r.id is null
          or r.room_owner_id is distinct from lw.owner_id
      ) = 0
      and (
        select count(*)
        from public.legal_story_entries ls
        left join public.rooms r on r.id = ls.room_id
        where r.id is null
          or r.room_owner_id is distinct from ls.owner_id
      ) = 0 then 'PASS'
      else 'BLOCKED'
    end,
    'cases_bad=' || (
      select count(*)::text
      from public.legal_cases lc
      left join public.rooms r on r.id = lc.room_id
      where r.id is null
        or r.room_owner_id is distinct from lc.owner_id
    ) || ', evidence_bad=' || (
      select count(*)::text
      from public.legal_evidence_items le
      left join public.rooms r on r.id = le.room_id
      where r.id is null
        or r.room_owner_id is distinct from le.owner_id
    ) || ', workspaces_bad=' || (
      select count(*)::text
      from public.legal_room_workspaces lw
      left join public.rooms r on r.id = lw.room_id
      where r.id is null
        or r.room_owner_id is distinct from lw.owner_id
    ) || ', stories_bad=' || (
      select count(*)::text
      from public.legal_story_entries ls
      left join public.rooms r on r.id = ls.room_id
      where r.id is null
        or r.room_owner_id is distinct from ls.owner_id
    )
)
select metric, status, detail
from checks

union all

select
  'legal.policy.' || lt.table_name,
  case
    when exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = lt.table_name
        and p.cmd = 'SELECT'
        and coalesce(p.qual, '') ~* 'owner_id.*auth\.uid|auth\.uid.*owner_id'
        and coalesce(p.qual, '') ~* 'room_owner_id.*auth\.uid|auth\.uid.*room_owner_id'
    )
    and exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = lt.table_name
        and p.cmd = 'INSERT'
        and coalesce(p.with_check, '') ~* 'owner_id.*auth\.uid|auth\.uid.*owner_id'
        and coalesce(p.with_check, '') ~* 'room_owner_id.*auth\.uid|auth\.uid.*room_owner_id'
    )
    and exists (
      select 1
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = lt.table_name
        and p.cmd = 'UPDATE'
        and coalesce(p.qual, '') ~* 'owner_id.*auth\.uid|auth\.uid.*owner_id'
        and coalesce(p.with_check, '') ~* 'owner_id.*auth\.uid|auth\.uid.*owner_id'
    ) then 'PASS'
    else 'BLOCKED'
  end,
  'owner+room scoped SELECT/INSERT/UPDATE policy shape'
from legal_tables lt

order by metric;
