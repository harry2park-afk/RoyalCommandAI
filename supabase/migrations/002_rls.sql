-- Row Level Security
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_access_requests enable row level security;
alter table public.messages enable row level security;
alter table public.ai_runs enable row level security;
alter table public.documents enable row level security;
alter table public.decisions enable row level security;
alter table public.activity_events enable row level security;
alter table public.service_instances enable row level security;
alter table public.voice_signatures enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Helper: household membership
create or replace function public.is_household_member(h_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = h_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_room_member(r_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.room_members
    where room_id = r_id and user_id = auth.uid()
  );
$$;

-- Households
create policy "households_select_member" on public.households
  for select using (owner_id = auth.uid() or public.is_household_member(id));
create policy "households_insert_owner" on public.households
  for insert with check (owner_id = auth.uid());
create policy "households_update_owner" on public.households
  for update using (owner_id = auth.uid());

create policy "household_members_select" on public.household_members
  for select using (public.is_household_member(household_id) or user_id = auth.uid());
create policy "household_members_insert" on public.household_members
  for insert with check (public.is_household_member(household_id));

-- Rooms
create policy "rooms_select_member" on public.rooms
  for select using (public.is_room_member(id) or room_owner_id = auth.uid() or public.is_household_member(household_id));
create policy "rooms_insert" on public.rooms
  for insert with check (room_owner_id = auth.uid());
create policy "rooms_update_owner" on public.rooms
  for update using (room_owner_id = auth.uid());

create policy "room_members_select" on public.room_members
  for select using (public.is_room_member(room_id) or user_id = auth.uid());
create policy "room_members_insert" on public.room_members
  for insert with check (user_id = auth.uid() or public.is_room_member(room_id));

-- Messages / AI / Documents / Decisions / Activity / Services
create policy "messages_select" on public.messages for select using (public.is_room_member(room_id));
create policy "messages_insert" on public.messages for insert with check (public.is_room_member(room_id));

create policy "ai_runs_select" on public.ai_runs for select using (public.is_room_member(room_id));
create policy "ai_runs_insert" on public.ai_runs for insert with check (public.is_room_member(room_id));

create policy "documents_select" on public.documents for select using (public.is_room_member(room_id));
create policy "documents_insert" on public.documents for insert with check (public.is_room_member(room_id));

create policy "decisions_select" on public.decisions for select using (public.is_room_member(room_id));
create policy "decisions_insert" on public.decisions for insert with check (public.is_room_member(room_id));
create policy "decisions_update" on public.decisions for update using (public.is_room_member(room_id));

create policy "activity_select" on public.activity_events for select using (
  (room_id is not null and public.is_room_member(room_id))
  or (household_id is not null and public.is_household_member(household_id))
);
create policy "activity_insert" on public.activity_events for insert with check (actor_id = auth.uid());

create policy "services_select" on public.service_instances for select using (public.is_room_member(room_id));
create policy "services_insert" on public.service_instances for insert with check (public.is_room_member(room_id));
create policy "services_update" on public.service_instances for update using (public.is_room_member(room_id));

create policy "voice_select_own" on public.voice_signatures for select using (user_id = auth.uid());
create policy "voice_insert_own" on public.voice_signatures for insert with check (user_id = auth.uid());
create policy "voice_update_own" on public.voice_signatures for update using (user_id = auth.uid());
