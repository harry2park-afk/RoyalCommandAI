-- P0 security hardening: only the room owner may add room members.
-- This closes the previous self-enrolment path where any authenticated user
-- could add themselves to a known room_id and then inherit room-scoped RLS access.

drop policy if exists "room_members_insert" on public.room_members;

create policy "room_members_insert_owner_only" on public.room_members
  for insert
  with check (
    exists (
      select 1
      from public.rooms r
      where r.id = room_members.room_id
        and r.room_owner_id = auth.uid()
    )
  );
