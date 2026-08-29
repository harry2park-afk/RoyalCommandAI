-- Issue #446: scope matter access for ordinary staff to explicit assignments.
--
-- IMPORTANT DEPLOYMENT NOTE:
-- Production currently contains unassigned matters. Do not deploy this migration
-- until those matters have been triaged/assigned or the intended unassigned
-- intake workflow has been explicitly approved. Admin access remains global so
-- an administrator can assign/triage matters after this policy is enabled.
--
-- This migration intentionally preserves:
--   * client access to the client's own matter
--   * global admin access for operational recovery/triage
-- It removes global read/write access for ordinary staff and instead requires
-- matters.assigned_staff_id = auth.uid().

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

revoke all on function private.is_admin() from public, anon;
revoke all on function private.is_assigned_matter_staff(uuid) from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.is_assigned_matter_staff(uuid) to authenticated, service_role;

-- Matter rows: client, assigned staff, or admin only.
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

-- Matter chat follows the same boundary.
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
