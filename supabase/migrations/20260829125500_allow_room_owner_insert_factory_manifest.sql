create policy room_factory_manifests_insert_owner
on public.room_factory_manifests
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.rooms r
    where r.id = room_factory_manifests.room_id
      and r.room_owner_id = auth.uid()
  )
);
