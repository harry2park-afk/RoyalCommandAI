-- Work Queue Ticket: #468
-- Supabase default function privileges granted anon EXECUTE when the public
-- SECURITY INVOKER wrapper was recreated. The private implementation still
-- rejects unauthenticated calls, but the public RPC should remain least-privilege
-- and match the previous authenticated-only contract.

revoke execute on function public.prepare_room_factory_work_plan(
  uuid, text, text, text, text, jsonb
) from anon;
