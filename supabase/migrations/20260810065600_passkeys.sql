-- Royal Command passkey credential storage
-- Stores public WebAuthn credential material only. Never stores face, fingerprint,
-- device PIN, biometric images, or biometric templates.

create table if not exists public.passkey_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0 check (counter >= 0),
  transports text[] not null default '{}',
  device_type text,
  backed_up boolean not null default false,
  friendly_name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists passkey_credentials_user_id_idx
  on public.passkey_credentials(user_id);

create index if not exists passkey_credentials_active_user_idx
  on public.passkey_credentials(user_id)
  where revoked_at is null;

alter table public.passkey_credentials enable row level security;

-- A signed-in customer may view only their own credential metadata.
drop policy if exists "passkeys_select_own" on public.passkey_credentials;
create policy "passkeys_select_own"
  on public.passkey_credentials
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Registration/verification writes are deliberately NOT granted directly to
-- browser clients. They must go through Royal Command server-side WebAuthn
-- verification before a credential is inserted, updated, or revoked.

comment on table public.passkey_credentials is
  'WebAuthn public credential records for Royal Command. No biometric data is stored.';
comment on column public.passkey_credentials.public_key is
  'Verified public credential key only; never a private key or biometric template.';
