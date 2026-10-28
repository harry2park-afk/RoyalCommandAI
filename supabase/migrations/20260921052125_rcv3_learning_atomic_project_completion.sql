create function public.rcv3_learning_preserve_pass() returns trigger language plpgsql set search_path=public as $$
begin
 if old.score>=70 then return null; end if;
 return new;
end $$;
create trigger rcv3_learning_preserve_pass before update on public.rcv3_preview_learning_projects for each row execute function public.rcv3_learning_preserve_pass();
create function public.rcv3_learning_complete_project() returns trigger language plpgsql set search_path=public as $$
begin
 if new.score>=70 then
 insert into public.rcv3_preview_learning_progress(owner_id,course,lesson) values(new.owner_id,new.course,new.lesson) on conflict do nothing;
 end if;
 return new;
end $$;
create trigger rcv3_learning_complete_project after insert or update on public.rcv3_preview_learning_projects for each row execute function public.rcv3_learning_complete_project();
revoke all on function public.rcv3_learning_preserve_pass() from public,anon,authenticated;
revoke all on function public.rcv3_learning_complete_project() from public,anon,authenticated;
grant execute on function public.rcv3_learning_preserve_pass() to service_role;
grant execute on function public.rcv3_learning_complete_project() to service_role;
