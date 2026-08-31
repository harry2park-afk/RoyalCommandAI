-- Allow an authenticated Room owner to delete their own Room.
-- Child Room records use ON DELETE CASCADE from public.rooms.
drop policy if exists "rooms_delete_owner" on public.rooms;
create policy "rooms_delete_owner" on public.rooms
  for delete using (room_owner_id = auth.uid());
