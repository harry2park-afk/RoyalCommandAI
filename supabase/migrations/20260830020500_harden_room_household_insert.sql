-- Launch hardening: prevent an authenticated user from attaching a Room to
-- another tenant's household by supplying an arbitrary household_id.
--
-- Room ownership alone is not enough: the owner must also own or already be a
-- member of the target household. This keeps the database boundary authoritative
-- for every client, including Room Factory and future APIs.

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
