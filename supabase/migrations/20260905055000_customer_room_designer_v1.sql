create table if not exists public.room_ui_designs (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  design jsonb not null default '{"schemaVersion":1,"screenId":"ROOM_HEADER","updatedAt":"1970-01-01T00:00:00.000Z","elements":{}}'::jsonb,
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.room_ui_designs enable row level security;

revoke all on table public.room_ui_designs from anon;
grant select, insert, update, delete on table public.room_ui_designs to authenticated;

drop policy if exists room_ui_designs_select_member on public.room_ui_designs;
create policy room_ui_designs_select_member
on public.room_ui_designs
for select
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    where r.id = room_ui_designs.room_id
      and (
        r.room_owner_id = auth.uid()
        or private.is_room_member(r.id)
      )
  )
);

drop policy if exists room_ui_designs_insert_owner on public.room_ui_designs;
create policy room_ui_designs_insert_owner
on public.room_ui_designs
for insert
to authenticated
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.rooms r
    where r.id = room_ui_designs.room_id
      and r.room_owner_id = auth.uid()
  )
);

drop policy if exists room_ui_designs_update_owner on public.room_ui_designs;
create policy room_ui_designs_update_owner
on public.room_ui_designs
for update
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    where r.id = room_ui_designs.room_id
      and r.room_owner_id = auth.uid()
  )
)
with check (
  updated_by = auth.uid()
  and exists (
    select 1
    from public.rooms r
    where r.id = room_ui_designs.room_id
      and r.room_owner_id = auth.uid()
  )
);

drop policy if exists room_ui_designs_delete_owner on public.room_ui_designs;
create policy room_ui_designs_delete_owner
on public.room_ui_designs
for delete
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    where r.id = room_ui_designs.room_id
      and r.room_owner_id = auth.uid()
  )
);
