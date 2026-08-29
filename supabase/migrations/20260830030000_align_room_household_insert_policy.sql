-- Launch migration reconciliation.
--
-- PR #464 hardened Room creation. Production verification confirmed the final
-- deployed policy uses an explicit authenticated-only household membership
-- check. Keep fresh environments convergent with that verified production
-- policy rather than weakening production to match an earlier equivalent form.

drop policy if exists rooms_insert on public.rooms;

create policy rooms_insert
on public.rooms
for insert
to authenticated
with check (
  room_owner_id = auth.uid()
  and (
    exists (
      select 1
      from public.households h
      where h.id = rooms.household_id
        and h.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.household_members hm
      where hm.household_id = rooms.household_id
        and hm.user_id = auth.uid()
    )
  )
);
