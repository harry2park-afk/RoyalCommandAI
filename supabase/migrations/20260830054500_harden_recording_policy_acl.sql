-- Keep country recording-policy metadata server-only until a reviewed runtime
-- adapter exposes only the minimum fields required for a call decision.
-- RLS already exists on this table; this migration makes the ACL fail-closed too.

alter table public.communication_recording_policies enable row level security;

revoke all privileges on table public.communication_recording_policies
  from public, anon, authenticated;

comment on table public.communication_recording_policies is
  'Server-only country recording policy metadata. Client access must go through a reviewed runtime adapter; direct anon/authenticated table access is denied.';
