-- Preserve authenticated client diagnostic incident reporting while preventing client
-- sessions from forging trusted release/deployment provenance or resolving incidents.
-- Trusted release-provenance ingestion remains a separate server-side launch gate.

alter table public.incident_events enable row level security;

drop policy if exists "authenticated users can insert incident events"
  on public.incident_events;
drop policy if exists "authenticated users can insert diagnostic incident events"
  on public.incident_events;

create policy "authenticated users can insert diagnostic incident events"
on public.incident_events
for insert
to authenticated
with check (
  commit_sha is null
  and deployment_id is null
  and resolved = false
  and resolved_at is null
);

-- Least privilege at the table ACL layer. RLS remains the row-level boundary.
-- Client sessions may only submit diagnostic rows; they cannot read, update,
-- delete, truncate, trigger, reference, or otherwise mutate incident history.
revoke all privileges on table public.incident_events from anon, authenticated;
grant insert on table public.incident_events to authenticated;
