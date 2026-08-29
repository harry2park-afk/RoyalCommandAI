alter table public.rc_service_catalog
  drop constraint if exists rc_service_catalog_connection_scope_check;

alter table public.rc_service_catalog
  add constraint rc_service_catalog_connection_scope_check
  check (connection_scope in ('room','rca_chat','both'));

comment on column public.rc_service_catalog.connection_scope is
  'Internal RC scope: room, rca_chat, or both. Not a customer-facing choice.';

update public.rc_service_catalog
set connection_scope = 'both', updated_at = now()
where service_key in ('translation','advanced_files','advanced_ai');
