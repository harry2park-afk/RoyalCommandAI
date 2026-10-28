-- Additive Preview-only ledger. No changes to existing room policies or data.
create table public.rcv3_preview_orders (
 id uuid primary key,
 owner_id uuid not null references auth.users(id),
 draft_id uuid not null,
 room_id uuid not null unique,
 snapshot jsonb not null,
 session_id text unique,
 subscription_id text unique,
 activated_at timestamptz,
 created_at timestamptz not null default now(),
 unique(owner_id,draft_id),
 check (jsonb_typeof(snapshot) = 'object')
);
create table public.rcv3_preview_legacy_rooms (
 room_id uuid primary key,
 owner_id uuid not null references auth.users(id)
);
-- This one-time snapshot is immutable to clients. A client-writable room marker
-- or creation timestamp must never grant grandfathered access.
insert into public.rcv3_preview_legacy_rooms(room_id,owner_id)
 select id,room_owner_id from public.rooms
 where description = 'rcv3-private-preview-v1' and status = 'draft';
alter table public.rcv3_preview_orders enable row level security;
alter table public.rcv3_preview_legacy_rooms enable row level security;
revoke all on public.rcv3_preview_orders, public.rcv3_preview_legacy_rooms from public,anon,authenticated;
grant select,insert,update on public.rcv3_preview_orders to service_role;
grant select on public.rcv3_preview_legacy_rooms to service_role;
