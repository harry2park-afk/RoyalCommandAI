-- Room Factory manifest ACL hardening.
--
-- The manifest is host/compiler-owned evidence. Authenticated callers create
-- manifests through the atomic SECURITY DEFINER implementation; they do not
-- need direct table mutation privileges. Keep member-scoped SELECT for the
-- application, remove the obsolete direct INSERT path, and fail closed for
-- anonymous access and destructive/control-plane table privileges.

begin;

alter table public.room_factory_manifests enable row level security;

-- Anonymous clients have no direct manifest-table access.
revoke select, insert, update, delete, truncate, references, trigger
  on table public.room_factory_manifests
  from anon;

-- Authenticated clients may read only through RLS. All writes are mediated by
-- the Room Factory atomic RPC implementation.
revoke insert, update, delete, truncate, references, trigger
  on table public.room_factory_manifests
  from authenticated;
grant select
  on table public.room_factory_manifests
  to authenticated;

-- This older owner-insert path predates atomic manifest creation. Keeping it
-- would make the host-compiled manifest boundary ambiguous even after the
-- table-level INSERT privilege is removed.
drop policy if exists room_factory_manifests_insert_owner
  on public.room_factory_manifests;

commit;
