-- Explicitly remove anonymous access from the Room Factory SECURITY DEFINER RPC.
-- Signed-in callers still must pass the function's auth.uid() + Room membership checks.

revoke execute on function public.prepare_room_factory_work_plan(uuid, text, text, text, text, jsonb) from anon;
revoke execute on function public.prepare_room_factory_work_plan(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.prepare_room_factory_work_plan(uuid, text, text, text, text, jsonb) to authenticated;
