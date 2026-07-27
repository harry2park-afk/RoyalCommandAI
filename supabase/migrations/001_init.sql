-- Royal Household OS Core Schema
create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  default_language text not null default 'en',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Households
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  household_type text not null default 'individual'
    check (household_type in ('individual', 'family', 'business')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('sovereign', 'steward', 'member', 'dependent')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

-- Neutral Rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  room_owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active'
    check (status in ('draft', 'open', 'active', 'waiting', 'in_review', 'resolved', 'closed', 'archived')),
  canvas_3d_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member', 'guest')),
  language_pref text,
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists public.room_access_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id)
);

-- Messages & conversation memory
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_type text not null default 'user'
    check (author_type in ('user', 'ai', 'system', 'professional')),
  content text not null,
  language text,
  original_content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx on public.messages (room_id, created_at);

-- AI runs (multi-provider orchestration)
create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  prompt text not null,
  providers text[] not null default '{}',
  responses jsonb not null default '[]'::jsonb,
  final_answer text,
  comparison jsonb not null default '{}'::jsonb,
  status text not null default 'completed'
    check (status in ('pending', 'running', 'completed', 'failed', 'partial')),
  error text,
  latency_ms integer,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Documents (immutable originals)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text not null,
  is_original boolean not null default true,
  parent_document_id uuid references public.documents(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Decisions (review gates)
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  decision_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- Activity log
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Service instances (module connections)
create table if not exists public.service_instances (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  service_class text not null
    check (service_class in ('external_ai', 'iot_smart', 'call_agency', 'professional', 'shopping', 'real_estate', 'banking', 'other')),
  service_key text not null,
  provider_binding jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'paused', 'disconnected')),
  authorised_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Voice signatures (Room Owner approval gate)
create table if not exists public.voice_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  feature_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, default_language)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'default_language', 'en')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
