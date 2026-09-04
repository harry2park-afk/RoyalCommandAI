-- RC Layout Editor Security Gate v1
-- Server-only tables. No authenticated/anon policies are granted.

create extension if not exists pgcrypto;

create table if not exists public.layout_editor_trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key_spki text not null,
  algorithm integer not null,
  sign_count bigint not null default 0,
  device_name text not null check (char_length(device_name) between 1 and 80),
  device_cookie_hash text not null unique,
  transports text[] not null default '{}',
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists layout_editor_trusted_devices_user_active_idx
  on public.layout_editor_trusted_devices(user_id, created_at desc)
  where revoked_at is null;

create table if not exists public.layout_editor_sessions (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null references public.layout_editor_trusted_devices(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists layout_editor_sessions_user_expiry_idx
  on public.layout_editor_sessions(user_id, expires_at desc);

create table if not exists public.layout_editor_enrollment_codes (
  code_hash text primary key,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists public.layout_editor_audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  device_id uuid references public.layout_editor_trusted_devices(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.layout_editor_trusted_devices enable row level security;
alter table public.layout_editor_sessions enable row level security;
alter table public.layout_editor_enrollment_codes enable row level security;
alter table public.layout_editor_audit_log enable row level security;

revoke all on public.layout_editor_trusted_devices from anon, authenticated;
revoke all on public.layout_editor_sessions from anon, authenticated;
revoke all on public.layout_editor_enrollment_codes from anon, authenticated;
revoke all on public.layout_editor_audit_log from anon, authenticated;

-- Service role remains the only application data path for these tables.
