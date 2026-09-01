-- Issue #446: scope Legal Matter access for ordinary staff to explicit assignments.
--
-- This migration is intentionally fail-closed for ordinary staff:
--   * clients retain access to their own matters
--   * admins retain global operational/triage access
--   * ordinary staff may read/update only matters explicitly assigned to them
--   * ordinary staff may not create a matter for an arbitrary client
--   * client_id / assigned_staff_id cannot be changed through ordinary authenticated UPDATE
--   * clients cannot self-assign staff while creating a matter
--   * documents/messages/chat reads follow the parent matter boundary
--
-- Deployment remains blocked until the unassigned-intake / assignment workflow is
-- explicitly approved and authenticated regression tests pass. This file is a
-- candidate only; do not treat its presence in a PR as production approval.

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function private.is_assigned_matter_staff(m_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matters m
    join public.profiles p on p.id = auth.uid()
    where m.id = m_id
      and m.assigned_staff_id = auth.uid()
      and p.role = 'staff'
  );
$$;

-- Helpers are available only to authenticated callers because RLS evaluates them
-- as the authenticated user. service_role bypasses RLS and does not need direct
-- EXECUTE on these helpers.
revoke all on function private.is_admin() from public, anon, authenticated, service_role;
revoke all on function private.is_assigned_matter_staff(uuid) from public, anon, authenticated, service_role;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_assigned_matter_staff(uuid) to authenticated;

-- Explicit staff assignment is a privileged workflow. The public RPC is callable
-- only by authenticated users and then independently proves that the caller is an
-- admin. Clients and ordinary staff cannot assign or unassign matters, and only a
-- profile whose current role is exactly `staff` may be assigned. Tenant transfer
-- (`client_id`) deliberately remains outside this RPC.
create or replace function public.set_matter_staff_assignment(
  p_matter_id uuid,
  p_staff_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) then
    raise exception 'matter assignment requires admin role'
      using errcode = '42501';
  end if;

  if p_staff_id is not null and not exists (
    select 1
    from public.profiles p
    where p.id = p_staff_id
      and p.role = 'staff'
  ) then
    raise exception 'assigned profile must have staff role'
      using errcode = '23514';
  end if;

  update public.matters
  set assigned_staff_id = p_staff_id,
      updated_at = now()
  where id = p_matter_id;

  if not found then
    raise exception 'matter not found'
      using errcode = 'P0002';
  end if;

  return p_matter_id;
end;
$$;

revoke all on function public.set_matter_staff_assignment(uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.set_matter_staff_assignment(uuid, uuid)
to authenticated;

-- Matter rows: client, explicitly assigned staff, or admin.
drop policy if exists matters_select_own_or_staff on public.matters;
create policy matters_select_own_or_staff
on public.matters
for select
to authenticated
using (
  client_id = auth.uid()
  or private.is_admin()
  or private.is_assigned_matter_staff(id)
);

-- Current production policy allows every staff/admin identity to insert a matter
-- for any client. Ordinary staff are deliberately removed from that path until
-- the intake/assignment workflow is approved. Clients may create only an
-- unassigned matter for themselves; admins retain triage/recovery creation.
drop policy if exists matters_insert_own on public.matters;
create policy matters_insert_own
on public.matters
for insert
to authenticated
with check (
  private.is_admin()
  or (
    client_id = auth.uid()
    and assigned_staff_id is null
  )
);

-- Protect tenant ownership and staff assignment at the SQL privilege boundary.
-- RLS WITH CHECK cannot compare OLD and NEW rows, so relying on RLS alone would
-- let an allowed updater rewrite client_id or assigned_staff_id. Authenticated
-- users keep UPDATE only on mutable matter fields. Assignment/transfer must use a
-- separately reviewed privileged workflow (or service_role) rather than direct
-- authenticated table updates.
revoke update on table public.matters from authenticated;
grant update (service_line, title, summary, status, updated_at)
on table public.matters
to authenticated;

drop policy if exists matters_update_own_or_staff on public.matters;
create policy matters_update_own_or_staff
on public.matters
for update
to authenticated
using (
  client_id = auth.uid()
  or private.is_admin()
  or private.is_assigned_matter_staff(id)
)
with check (
  client_id = auth.uid()
  or private.is_admin()
  or private.is_assigned_matter_staff(id)
);

-- Matter documents follow the parent matter boundary.
drop policy if exists matter_documents_select on public.matter_documents;
create policy matter_documents_select
on public.matter_documents
for select
to authenticated
using (
  private.is_matter_client(matter_id)
  or private.is_admin()
  or private.is_assigned_matter_staff(matter_id)
);

drop policy if exists matter_documents_insert on public.matter_documents;
create policy matter_documents_insert
on public.matter_documents
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and (
    private.is_matter_client(matter_id)
    or private.is_admin()
    or private.is_assigned_matter_staff(matter_id)
  )
);

drop policy if exists matter_documents_update_staff on public.matter_documents;
create policy matter_documents_update_staff
on public.matter_documents
for update
to authenticated
using (
  private.is_admin()
  or private.is_assigned_matter_staff(matter_id)
)
with check (
  private.is_admin()
  or private.is_assigned_matter_staff(matter_id)
);

-- Matter messages follow the same parent boundary.
drop policy if exists matter_messages_select on public.matter_messages;
create policy matter_messages_select
on public.matter_messages
for select
to authenticated
using (
  private.is_matter_client(matter_id)
  or private.is_admin()
  or private.is_assigned_matter_staff(matter_id)
);

drop policy if exists matter_messages_insert on public.matter_messages;
create policy matter_messages_insert
on public.matter_messages
for insert
to authenticated
with check (
  author_id = auth.uid()
  and (
    private.is_matter_client(matter_id)
    or private.is_admin()
    or private.is_assigned_matter_staff(matter_id)
  )
);

-- Chat-read inserts are allowed only for the current user and an authorized matter.
drop policy if exists matter_chat_reads_insert on public.matter_chat_reads;
create policy matter_chat_reads_insert
on public.matter_chat_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    private.is_matter_client(matter_id)
    or private.is_admin()
    or private.is_assigned_matter_staff(matter_id)
  )
);
