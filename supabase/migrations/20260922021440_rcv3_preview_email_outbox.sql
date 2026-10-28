-- RC V3 Preview only. Additive, no changes to customer/Gmail/billing tables.
create table public.rcv3_preview_email_notices (
 id uuid primary key,
 envelope jsonb not null,
 sender text not null,
 kind text not null check (kind in ('notice','card_expiring','card_expired')),
 order_id uuid references public.rcv3_preview_orders(id),
 approval jsonb,
 status text not null default 'pending' check (status in ('pending','approved','sending','accepted','rejected','review_required','cancelled')),
 created_by uuid,
 created_at timestamptz not null default now(),
 first_attempt_at timestamptz,
 lease_until timestamptz,
 claim_token uuid,
 provider_id text,
 last_error text,
 reviewed_by uuid,
 reviewed_at timestamptz,
 check (envelope->>'id' = id::text),
 check (jsonb_array_length(envelope->'recipients') = 1),
 check (kind = 'notice' or order_id is not null)
);
alter table public.rcv3_preview_email_notices enable row level security;
revoke all on public.rcv3_preview_email_notices from public, anon, authenticated;
grant select, insert, update on public.rcv3_preview_email_notices to service_role;
create index rcv3_email_pending_idx on public.rcv3_preview_email_notices(status,created_at);
create table public.rcv3_preview_email_worker_state (
 id text primary key check (id='card_sweep'),
 cursor_id uuid,
 last_error text,
 updated_at timestamptz not null default now()
);
alter table public.rcv3_preview_email_worker_state enable row level security;
revoke all on public.rcv3_preview_email_worker_state from public, anon, authenticated;
grant select, insert, update on public.rcv3_preview_email_worker_state to service_role;
insert into public.rcv3_preview_email_worker_state(id) values ('card_sweep');
