-- Isolated Preview test tokens. These are not cash, bank deposits or transferable credits.
create table public.rcv3_preview_token_grants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  source text not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique(owner_id,source)
);
create table public.rcv3_preview_token_rooms (
  room_id uuid primary key,
  owner_id uuid not null references auth.users(id),
  draft_id uuid not null,
  draft_snapshot jsonb not null check (jsonb_typeof(draft_snapshot)='object'),
  tokens_spent integer not null check(tokens_spent > 0),
  consent_name text not null check(length(trim(consent_name)) between 2 and 160),
  consent_version text not null check(consent_version='rcv3-preview-token-20260925'),
  activated_at timestamptz,
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  unique(owner_id,draft_id)
);
create index rcv3_preview_token_grants_owner on public.rcv3_preview_token_grants(owner_id);
create index rcv3_preview_token_rooms_owner on public.rcv3_preview_token_rooms(owner_id);
alter table public.rcv3_preview_token_grants enable row level security;
alter table public.rcv3_preview_token_rooms enable row level security;
revoke all on public.rcv3_preview_token_grants,public.rcv3_preview_token_rooms from public,anon,authenticated;
grant select,insert on public.rcv3_preview_token_grants to service_role;
grant select,insert,update on public.rcv3_preview_token_rooms to service_role;

-- Lock the existing RC customer account to serialize concurrent room openings.
-- The only caller is the authenticated Preview server through service_role.
create function public.rcv3_open_preview_token_room(p_owner uuid,p_draft uuid,p_room uuid,p_snapshot jsonb,p_tokens integer,p_name text,p_version text)
returns public.rcv3_preview_token_rooms
language plpgsql security invoker set search_path = '' as $$
declare v_existing public.rcv3_preview_token_rooms; v_available bigint;
begin
  if p_tokens <> 30 or jsonb_typeof(p_snapshot) <> 'object' or length(trim(p_name)) not between 2 and 160 or p_version<>'rcv3-preview-token-20260925' then raise exception 'INVALID_TOKEN_ROOM'; end if;
  perform 1 from public.rc_customer_accounts where owner_id=p_owner and customer_number='RC 0357060' for update;
  if not found then raise exception 'NOT_PREVIEW_OWNER'; end if;
  select * into v_existing from public.rcv3_preview_token_rooms where owner_id=p_owner and draft_id=p_draft;
  if found then
    if v_existing.room_id<>p_room or v_existing.draft_snapshot<>p_snapshot or v_existing.consent_name<>trim(p_name) then raise exception 'DRAFT_CHANGED'; end if;
    return v_existing;
  end if;
  select coalesce((select sum(amount) from public.rcv3_preview_token_grants where owner_id=p_owner),0)
       - coalesce((select sum(tokens_spent) from public.rcv3_preview_token_rooms where owner_id=p_owner),0) into v_available;
  if v_available < p_tokens then raise exception 'INSUFFICIENT_TOKENS'; end if;
  insert into public.rcv3_preview_token_rooms(room_id,owner_id,draft_id,draft_snapshot,tokens_spent,consent_name,consent_version)
    values(p_room,p_owner,p_draft,p_snapshot,p_tokens,trim(p_name),p_version) returning * into v_existing;
  return v_existing;
end $$;
revoke all on function public.rcv3_open_preview_token_room(uuid,uuid,uuid,jsonb,integer,text,text) from public,anon,authenticated;
grant execute on function public.rcv3_open_preview_token_room(uuid,uuid,uuid,jsonb,integer,text,text) to service_role;

-- The owner is resolved through the existing customer number and verified email,
-- never by a supplied or guessed account UUID. Reruns cannot double grant.
insert into public.rcv3_preview_token_grants(owner_id,source,amount)
select a.owner_id,'harry-preview-10000-20260925',10000
from public.rc_customer_accounts a join auth.users u on u.id=a.owner_id
where a.customer_number='RC 0357060' and lower(u.email)='harry@royalcommand.ai' and u.deleted_at is null
on conflict(owner_id,source) do nothing;
