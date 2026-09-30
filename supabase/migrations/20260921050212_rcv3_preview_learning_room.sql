create table public.rcv3_preview_learning_progress (
 owner_id uuid not null references auth.users(id) on delete cascade,
 course text not null, lesson text not null, completed_at timestamptz not null default now(),
 primary key(owner_id,course,lesson)
);
create table public.rcv3_preview_learning_attempts (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 course text not null, questions jsonb not null, created_at timestamptz not null default now(),
 submitted_at timestamptz, score integer check(score between 0 and 100),
 certificate_id uuid unique, issued_name text,
 check(certificate_id is null or (score is not null and score >= 80 and submitted_at is not null))
);
create index on public.rcv3_preview_learning_attempts(owner_id,course,created_at);
create table public.rcv3_preview_learning_usage (
 owner_id uuid not null references auth.users(id) on delete cascade,
 day date not null, kind text not null check(kind in ('chat','exam')), slot integer not null check(slot between 0 and 29),
 check(kind <> 'exam' or slot < 3),
 primary key(owner_id,day,kind,slot)
);
alter table public.rcv3_preview_learning_progress enable row level security;
alter table public.rcv3_preview_learning_attempts enable row level security;
alter table public.rcv3_preview_learning_usage enable row level security;
revoke all on public.rcv3_preview_learning_progress,public.rcv3_preview_learning_attempts,public.rcv3_preview_learning_usage from public,anon,authenticated;
grant all on public.rcv3_preview_learning_progress,public.rcv3_preview_learning_attempts,public.rcv3_preview_learning_usage to service_role;
-- Access is through authenticated, owner-scoped server routes only. No browser writes or answer-key reads.
