-- Server-only encrypted credentials. No browser role may read ciphertext or
-- create a credential/verification record, including for its own account.
create table public.rcv3_customer_ai_credentials (
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai','anthropic','google','xai')),
  ciphertext text not null check (length(ciphertext) between 58 and 2800),
  verified_at timestamptz not null,
  primary key (owner_id, provider)
);
alter table public.rcv3_customer_ai_credentials enable row level security;
revoke all on public.rcv3_customer_ai_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.rcv3_customer_ai_credentials to service_role;

create table public.rcv3_customer_ai_attempts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  hour text not null check (hour ~ '^\d{4}-\d{2}-\d{2}T\d{2}$'),
  slot integer not null check (slot between 0 and 9),
  primary key (owner_id, hour, slot)
);
alter table public.rcv3_customer_ai_attempts enable row level security;
revoke all on public.rcv3_customer_ai_attempts from public, anon, authenticated;
grant select, insert, delete on public.rcv3_customer_ai_attempts to service_role;
