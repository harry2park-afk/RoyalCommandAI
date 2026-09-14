-- Work Queue Ticket: #690
--
-- Authorization roles are server-controlled security state. End-user profile
-- editing and auth signup metadata must never be able to mint staff/admin.
--
-- Keep normal own-profile edits intact, but reject privileged role inserts and
-- any role change made from a JWT-backed end-user session. Trusted service/admin
-- database contexts have no auth.uid() and remain able to provision privileged
-- roles deliberately.

create or replace function private.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' and new.role is distinct from 'client' then
      raise exception using
        errcode = '42501',
        message = 'Profile role inserts require trusted administrative context.';
    elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception using
        errcode = '42501',
        message = 'Profile role changes require trusted administrative context.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_profile_role_change() from public, anon, authenticated;

drop trigger if exists guard_profile_role_change on public.profiles;
create trigger guard_profile_role_change
before insert or update of role on public.profiles
for each row
execute function private.guard_profile_role_change();

-- User-supplied raw_user_meta_data is profile preference input, not an
-- authorization channel. New users always start non-privileged, and an auth
-- user refresh/upsert must never overwrite an already provisioned role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.profiles (id, email, full_name, default_language, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'default_language', 'en-AU'),
    'client'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    default_language = coalesce(excluded.default_language, public.profiles.default_language),
    updated_at = now();

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Profiles are auth-owned identity rows. Ordinary API users need read access
-- through RLS plus a narrow set of preference/profile columns to update. They do
-- not need direct INSERT/DELETE/TRUNCATE/TRIGGER/REFERENCES privileges, and they
-- must not be able to update identity/authorization columns at the SQL privilege
-- boundary. The role trigger remains defense in depth for any other JWT-backed
-- path that reaches the table.
revoke insert, delete, truncate, references, trigger on table public.profiles from anon, authenticated;
revoke update on table public.profiles from anon, authenticated;
grant update (full_name, default_language, avatar_url, ui_preferences, updated_at)
on table public.profiles
to authenticated;

comment on function private.guard_profile_role_change() is
  'Rejects JWT-backed end-user privileged role inserts and role changes on public.profiles. Trusted service/admin contexts may provision roles deliberately.';

comment on function public.handle_new_user() is
  'Creates non-privileged client profiles from auth.users. User-controlled raw metadata cannot assign staff/admin and conflict updates never overwrite role.';
