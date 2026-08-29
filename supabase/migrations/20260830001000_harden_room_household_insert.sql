-- Launch hardening: prevent an authenticated user from attaching a Room to
-- another tenant's household by supplying an arbitrary household_id.
--
-- The application also checks household visibility before Room Factory inserts,
-- but this RLS rule is the authoritative database boundary for all clients.

drop policy if exists rooms_insert on public.rooms;

create policy rooms_insert
on public.rooms
for insert
to public
with check (
  room_owner_id = auth.uid()
  and (
    private.is_household_member(household_id)
    or exists (
      select 1
      from public.households h
      where h.id = rooms.household_id
        and h.owner_id = auth.uid()
    )
  )
);
