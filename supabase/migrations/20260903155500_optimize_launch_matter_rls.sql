-- October rollout follow-up: preserve the merged Legal Matter isolation semantics
-- while removing launch-path RLS initplan warnings and adding the narrowly missing
-- foreign-key indexes reported by the Hosted Supabase Performance Advisor.
--
-- SAFETY:
--   * no tenant-access rule is broadened;
--   * clients remain scoped to their own Matters;
--   * admins retain operational/triage access;
--   * ordinary staff remain scoped to explicitly assigned Matters;
--   * client_id / assigned_staff_id protection remains unchanged;
--   * child Matter objects continue to inherit the parent Matter boundary.
--
-- This is source-only until the controlled Hosted migration gate is separately
-- approved and verified. It does not activate any country or mutate payment/Auth.

-- Matter rows: same access semantics, but evaluate auth.uid() once per statement.
drop policy if exists matters_select_own_or_staff on public.matters;
create policy matters_select_own_or_staff
on public.matters
for select
to authenticated
using (
  client_id = (select auth.uid())
  or private.is_admin()
  or private.is_assigned_matter_staff(id)
);

drop policy if exists matters_insert_own on public.matters;
create policy matters_insert_own
on public.matters
for insert
to authenticated
with check (
  private.is_admin()
  or (
    client_id = (select auth.uid())
    and assigned_staff_id is null
  )
);

drop policy if exists matters_update_own_or_staff on public.matters;
create policy matters_update_own_or_staff
on public.matters
for update
to authenticated
using (
  client_id = (select auth.uid())
  or private.is_admin()
  or private.is_assigned_matter_staff(id)
)
with check (
  client_id = (select auth.uid())
  or private.is_admin()
  or private.is_assigned_matter_staff(id)
);

-- Child writes: preserve the parent Matter check; only cache caller identity.
drop policy if exists matter_documents_insert on public.matter_documents;
create policy matter_documents_insert
on public.matter_documents
for insert
to authenticated
with check (
  uploaded_by = (select auth.uid())
  and (
    private.is_matter_client(matter_id)
    or private.is_admin()
    or private.is_assigned_matter_staff(matter_id)
  )
);

drop policy if exists matter_messages_insert on public.matter_messages;
create policy matter_messages_insert
on public.matter_messages
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (
    private.is_matter_client(matter_id)
    or private.is_admin()
    or private.is_assigned_matter_staff(matter_id)
  )
);

-- Chat read tracking remains user-owned. Insert additionally inherits Matter scope.
drop policy if exists matter_chat_reads_select on public.matter_chat_reads;
create policy matter_chat_reads_select
on public.matter_chat_reads
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists matter_chat_reads_insert on public.matter_chat_reads;
create policy matter_chat_reads_insert
on public.matter_chat_reads
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    private.is_matter_client(matter_id)
    or private.is_admin()
    or private.is_assigned_matter_staff(matter_id)
  )
);

drop policy if exists matter_chat_reads_update on public.matter_chat_reads;
create policy matter_chat_reads_update
on public.matter_chat_reads
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Cover only the launch-path foreign keys that the fresh Hosted advisor reported
-- as missing. Existing matter_id indexes on documents/messages are retained.
create index if not exists matter_chat_reads_matter_id_idx
  on public.matter_chat_reads (matter_id);

create index if not exists matter_documents_uploaded_by_idx
  on public.matter_documents (uploaded_by);

create index if not exists matter_messages_author_id_idx
  on public.matter_messages (author_id);
