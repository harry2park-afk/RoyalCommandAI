alter table public.rcv3_preview_learning_attempts drop constraint rcv3_preview_learning_attempts_check;
alter table public.rcv3_preview_learning_attempts add constraint rcv3_preview_learning_certificate_pass check(certificate_id is null or (score is not null and score>=70 and submitted_at is not null));
create table public.rcv3_preview_learning_projects (
 owner_id uuid not null references auth.users(id) on delete cascade,
 course text not null,lesson text not null,artifact text not null check(length(artifact)<=6000),feedback text not null,score integer not null check(score between 0 and 100),
 primary key(owner_id,course,lesson)
);
alter table public.rcv3_preview_learning_projects enable row level security;
revoke all on public.rcv3_preview_learning_projects from public,anon,authenticated;
grant all on public.rcv3_preview_learning_projects to service_role;
