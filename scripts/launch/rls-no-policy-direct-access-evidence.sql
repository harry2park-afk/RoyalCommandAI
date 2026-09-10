-- October launch security evidence: classify RLS-enabled tables with no policies.
--
-- READ ONLY / evidence only. This script does not add policies, change grants,
-- mutate Hosted data/schema/Auth, or authorize Country READY.
--
-- Interpretation:
--   * RLS enabled + no policy is fail-closed for ordinary row access.
--   * A table still deserves review if anon/authenticated retain direct table ACLs.
--   * A zero-client-ACL result is evidence that the Security Advisor
--     `rls_enabled_no_policy` finding is not, by itself, a direct client exposure.
--   * Server/service-role runtime authorization remains a separate review gate.

begin transaction read only;

with rls_no_policy as (
  select
    n.nspname as schema_name,
    c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity
    and not exists (
      select 1
      from pg_policies p
      where p.schemaname = n.nspname
        and p.tablename = c.relname
    )
), privilege_matrix as (
  select
    r.schema_name,
    r.table_name,
    has_table_privilege('anon', format('%I.%I', r.schema_name, r.table_name), 'SELECT') as anon_select,
    has_table_privilege('anon', format('%I.%I', r.schema_name, r.table_name), 'INSERT') as anon_insert,
    has_table_privilege('anon', format('%I.%I', r.schema_name, r.table_name), 'UPDATE') as anon_update,
    has_table_privilege('anon', format('%I.%I', r.schema_name, r.table_name), 'DELETE') as anon_delete,
    has_table_privilege('authenticated', format('%I.%I', r.schema_name, r.table_name), 'SELECT') as authenticated_select,
    has_table_privilege('authenticated', format('%I.%I', r.schema_name, r.table_name), 'INSERT') as authenticated_insert,
    has_table_privilege('authenticated', format('%I.%I', r.schema_name, r.table_name), 'UPDATE') as authenticated_update,
    has_table_privilege('authenticated', format('%I.%I', r.schema_name, r.table_name), 'DELETE') as authenticated_delete
  from rls_no_policy r
)
select
  schema_name,
  table_name,
  anon_select,
  anon_insert,
  anon_update,
  anon_delete,
  authenticated_select,
  authenticated_insert,
  authenticated_update,
  authenticated_delete,
  case
    when anon_select or anon_insert or anon_update or anon_delete
      or authenticated_select or authenticated_insert or authenticated_update or authenticated_delete
      then 'REVIEW_DIRECT_CLIENT_ACL'
    else 'FAIL_CLOSED_NO_DIRECT_CLIENT_ACL'
  end as direct_access_classification
from privilege_matrix
order by table_name;

with rls_no_policy as (
  select
    n.nspname as schema_name,
    c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity
    and not exists (
      select 1
      from pg_policies p
      where p.schemaname = n.nspname
        and p.tablename = c.relname
    )
), privilege_matrix as (
  select
    r.schema_name,
    r.table_name,
    (
      has_table_privilege('anon', format('%I.%I', r.schema_name, r.table_name), 'SELECT')
      or has_table_privilege('anon', format('%I.%I', r.schema_name, r.table_name), 'INSERT')
      or has_table_privilege('anon', format('%I.%I', r.schema_name, r.table_name), 'UPDATE')
      or has_table_privilege('anon', format('%I.%I', r.schema_name, r.table_name), 'DELETE')
    ) as anon_any_dml,
    (
      has_table_privilege('authenticated', format('%I.%I', r.schema_name, r.table_name), 'SELECT')
      or has_table_privilege('authenticated', format('%I.%I', r.schema_name, r.table_name), 'INSERT')
      or has_table_privilege('authenticated', format('%I.%I', r.schema_name, r.table_name), 'UPDATE')
      or has_table_privilege('authenticated', format('%I.%I', r.schema_name, r.table_name), 'DELETE')
    ) as authenticated_any_dml
  from rls_no_policy r
)
select
  count(*) as rls_enabled_no_policy_count,
  count(*) filter (where anon_any_dml or authenticated_any_dml) as direct_client_acl_review_count,
  count(*) filter (where not anon_any_dml and not authenticated_any_dml) as fail_closed_no_direct_client_acl_count,
  (count(*) filter (where anon_any_dml or authenticated_any_dml) = 0) as direct_client_exposure_gate_pass
from privilege_matrix;

rollback;
