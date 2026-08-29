-- Harden matter access so unauthenticated callers cannot evaluate matter policies
-- through public SECURITY DEFINER helpers.

-- Matter messages are authenticated-only and use the private helper functions.
drop policy if exists matter_messages_select on public.matter_messages;
create policy matter_messages_select
on public.matter_messages
for select
to authenticated
using (private.is_matter_client(matter_id) or private.is_staff_or_admin());

drop policy if exists matter_messages_insert on public.matter_messages;
create policy matter_messages_insert
on public.matter_messages
for insert
to authenticated
with check (
  author_id = auth.uid()
  and (private.is_matter_client(matter_id) or private.is_staff_or_admin())
);

-- Chat read markers are also authenticated-only.
drop policy if exists matter_chat_reads_select on public.matter_chat_reads;
create policy matter_chat_reads_select
on public.matter_chat_reads
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists matter_chat_reads_insert on public.matter_chat_reads;
create policy matter_chat_reads_insert
on public.matter_chat_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (private.is_matter_client(matter_id) or private.is_staff_or_admin())
);

drop policy if exists matter_chat_reads_update on public.matter_chat_reads;
create policy matter_chat_reads_update
on public.matter_chat_reads
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Keep legacy public helper functions unavailable as REST RPCs.
-- Existing RLS policies use the private equivalents.
revoke all on function public.is_matter_client(uuid) from public, anon, authenticated;
revoke all on function public.is_staff_or_admin() from public, anon, authenticated;
grant execute on function public.is_matter_client(uuid) to service_role;
grant execute on function public.is_staff_or_admin() to service_role;
