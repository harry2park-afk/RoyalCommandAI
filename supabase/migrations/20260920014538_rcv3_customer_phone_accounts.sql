-- Customer-owned carrier billing and credentials. No number purchasing/resale.
create table public.rcv3_customer_phone_accounts (
  owner_id uuid primary key references auth.users(id),
  account_sid text not null unique check (account_sid ~ '^AC[0-9a-fA-F]{32}$'),
  ciphertext text not null,
  verified_at timestamptz not null
);
create table public.rcv3_customer_phone_checks (
  owner_id uuid not null references auth.users(id),
  hour text not null,
  slot integer not null check (slot between 0 and 5),
  primary key(owner_id,hour,slot)
);
create table public.rcv3_customer_phone_bindings (
  id uuid primary key,
  owner_id uuid not null references auth.users(id),
  room_id uuid not null unique references public.rooms(id),
  account_sid text not null,
  number_sid text not null unique check (number_sid ~ '^PN[0-9a-fA-F]{32}$'),
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  ciphertext text not null,
  agent_id text not null,
  webhook_url text not null,
  prior_voice_url text not null,
  prior_voice_method text not null,
  state text not null check (state in ('binding','configured','reconcile')),
  created_at timestamptz not null default now()
);
create table public.rcv3_customer_phone_calls (
  twilio_call_sid text primary key check (twilio_call_sid ~ '^CA[0-9a-fA-F]{32}$'),
  binding_id uuid not null references public.rcv3_customer_phone_bindings(id),
  room_id uuid not null references public.rooms(id),
  agent_id text not null,
  retell_call_id text unique,
  state text not null check(state in ('registering','registered','reconcile')),
  created_at timestamptz not null default now(),
  check(state <> 'registered' or retell_call_id is not null)
);
alter table public.rcv3_customer_phone_accounts enable row level security;
alter table public.rcv3_customer_phone_checks enable row level security;
alter table public.rcv3_customer_phone_bindings enable row level security;
alter table public.rcv3_customer_phone_calls enable row level security;
revoke all on public.rcv3_customer_phone_accounts,public.rcv3_customer_phone_checks,public.rcv3_customer_phone_bindings,public.rcv3_customer_phone_calls from public,anon,authenticated;
grant select,insert,update on public.rcv3_customer_phone_accounts,public.rcv3_customer_phone_bindings,public.rcv3_customer_phone_calls to service_role;
grant select,insert on public.rcv3_customer_phone_checks to service_role;
