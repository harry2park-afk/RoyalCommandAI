\set ON_ERROR_STOP on

begin;

-- This evidence runs only against the disposable Supabase stack created by CI.
-- All fixture rows and authenticated-session checks are rolled back at the end.

do $$
declare
  broad_matter_policies integer;
begin
  if to_regprocedure('private.is_admin()') is null then
    raise exception 'private.is_admin() is missing';
  end if;
  if to_regprocedure('private.is_assigned_matter_staff(uuid)') is null then
    raise exception 'private.is_assigned_matter_staff(uuid) is missing';
  end if;
  if to_regprocedure('public.set_matter_staff_assignment(uuid,uuid)') is null then
    raise exception 'public.set_matter_staff_assignment(uuid,uuid) is missing';
  end if;

  if has_column_privilege('authenticated', 'public.matters', 'client_id', 'UPDATE') then
    raise exception 'authenticated must not directly UPDATE matters.client_id';
  end if;
  if has_column_privilege('authenticated', 'public.matters', 'assigned_staff_id', 'UPDATE') then
    raise exception 'authenticated must not directly UPDATE matters.assigned_staff_id';
  end if;
  if not has_column_privilege('authenticated', 'public.matters', 'title', 'UPDATE') then
    raise exception 'authenticated must retain UPDATE on mutable matter fields';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.set_matter_staff_assignment(uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated assignment RPC execute privilege is missing';
  end if;
  if has_function_privilege(
    'anon',
    'public.set_matter_staff_assignment(uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute matter assignment RPC';
  end if;

  select count(*)
    into broad_matter_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = 'matters'
    and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ilike '%is_staff_or_admin%';
  if broad_matter_policies <> 0 then
    raise exception 'matters policies still contain broad is_staff_or_admin access';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'matters'
      and policyname = 'matters_select_own_or_staff'
      and qual ilike '%is_assigned_matter_staff%'
      and qual ilike '%is_admin%'
  ) then
    raise exception 'matter SELECT policy is not assignment-scoped';
  end if;
end
$$;

-- Create deterministic disposable identities. auth.users requires only id in the
-- current Supabase schema; profiles are upserted explicitly so the test does not
-- depend on signup metadata behavior.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000101'::uuid),
  ('00000000-0000-0000-0000-000000000102'::uuid),
  ('00000000-0000-0000-0000-000000000201'::uuid),
  ('00000000-0000-0000-0000-000000000202'::uuid),
  ('00000000-0000-0000-0000-000000000301'::uuid);

insert into public.profiles (id, role) values
  ('00000000-0000-0000-0000-000000000101'::uuid, 'client'),
  ('00000000-0000-0000-0000-000000000102'::uuid, 'client'),
  ('00000000-0000-0000-0000-000000000201'::uuid, 'staff'),
  ('00000000-0000-0000-0000-000000000202'::uuid, 'staff'),
  ('00000000-0000-0000-0000-000000000301'::uuid, 'admin')
on conflict (id) do update set role = excluded.role;

insert into public.matters (
  id, client_id, service_line, title, assigned_staff_id
) values
  (
    '00000000-0000-0000-0000-000000001001'::uuid,
    '00000000-0000-0000-0000-000000000101'::uuid,
    'legal', 'Client A assigned to Staff A',
    '00000000-0000-0000-0000-000000000201'::uuid
  ),
  (
    '00000000-0000-0000-0000-000000001002'::uuid,
    '00000000-0000-0000-0000-000000000102'::uuid,
    'legal', 'Client B assigned to Staff B',
    '00000000-0000-0000-0000-000000000202'::uuid
  ),
  (
    '00000000-0000-0000-0000-000000001003'::uuid,
    '00000000-0000-0000-0000-000000000101'::uuid,
    'legal', 'Client A unassigned intake', null
  );

insert into public.matter_documents (
  id, matter_id, uploaded_by, filename, size_bytes
) values
  (
    '00000000-0000-0000-0000-000000002001'::uuid,
    '00000000-0000-0000-0000-000000001001'::uuid,
    '00000000-0000-0000-0000-000000000201'::uuid,
    'client-a-evidence.pdf', 1
  ),
  (
    '00000000-0000-0000-0000-000000002002'::uuid,
    '00000000-0000-0000-0000-000000001002'::uuid,
    '00000000-0000-0000-0000-000000000202'::uuid,
    'client-b-evidence.pdf', 1
  );

insert into public.matter_messages (
  id, matter_id, author_id, body
) values
  (
    '00000000-0000-0000-0000-000000003001'::uuid,
    '00000000-0000-0000-0000-000000001001'::uuid,
    '00000000-0000-0000-0000-000000000201'::uuid,
    'fixture-a'
  ),
  (
    '00000000-0000-0000-0000-000000003002'::uuid,
    '00000000-0000-0000-0000-000000001002'::uuid,
    '00000000-0000-0000-0000-000000000202'::uuid,
    'fixture-b'
  );

-- Client A sees only Client A matters and child rows.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

do $$
begin
  if (select count(*) from public.matters where id in (
    '00000000-0000-0000-0000-000000001001'::uuid,
    '00000000-0000-0000-0000-000000001002'::uuid,
    '00000000-0000-0000-0000-000000001003'::uuid
  )) <> 2 then
    raise exception 'Client A matter visibility is not tenant-scoped';
  end if;
  if exists (
    select 1 from public.matters
    where id = '00000000-0000-0000-0000-000000001002'::uuid
  ) then
    raise exception 'Client A can see Client B matter';
  end if;
  if (select count(*) from public.matter_documents where id in (
    '00000000-0000-0000-0000-000000002001'::uuid,
    '00000000-0000-0000-0000-000000002002'::uuid
  )) <> 1 then
    raise exception 'Client A document visibility is not parent-matter scoped';
  end if;
  if (select count(*) from public.matter_messages where id in (
    '00000000-0000-0000-0000-000000003001'::uuid,
    '00000000-0000-0000-0000-000000003002'::uuid
  )) <> 1 then
    raise exception 'Client A message visibility is not parent-matter scoped';
  end if;
end
$$;

-- Clients cannot directly reassign staff or create a self-assigned matter.
do $$
begin
  begin
    update public.matters
    set assigned_staff_id = '00000000-0000-0000-0000-000000000202'::uuid
    where id = '00000000-0000-0000-0000-000000001001'::uuid;
    raise exception 'Client directly changed assigned_staff_id';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.matters (
      id, client_id, service_line, title, assigned_staff_id
    ) values (
      '00000000-0000-0000-0000-000000001011'::uuid,
      '00000000-0000-0000-0000-000000000101'::uuid,
      'legal', 'forbidden client self assignment',
      '00000000-0000-0000-0000-000000000201'::uuid
    );
    raise exception 'Client self-assigned staff during matter creation';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

-- A normal unassigned self-intake remains possible for the client.
insert into public.matters (
  id, client_id, service_line, title
) values (
  '00000000-0000-0000-0000-000000001012'::uuid,
  '00000000-0000-0000-0000-000000000101'::uuid,
  'legal', 'allowed client self intake'
);

-- Staff A sees only the explicitly assigned matter, can mutate allowed fields,
-- cannot see Staff B's matter, and cannot create an arbitrary-client matter.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);

do $$
declare
  changed integer;
begin
  if not exists (
    select 1 from public.matters
    where id = '00000000-0000-0000-0000-000000001001'::uuid
  ) then
    raise exception 'Assigned Staff A cannot see assigned matter';
  end if;
  if exists (
    select 1 from public.matters
    where id = '00000000-0000-0000-0000-000000001002'::uuid
  ) then
    raise exception 'Staff A can see Staff B matter';
  end if;
  if exists (
    select 1 from public.matters
    where id = '00000000-0000-0000-0000-000000001003'::uuid
  ) then
    raise exception 'Staff A can see unassigned intake without assignment';
  end if;

  update public.matters
  set title = 'Staff A permitted title update'
  where id = '00000000-0000-0000-0000-000000001001'::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 then
    raise exception 'Assigned Staff A could not update mutable field';
  end if;

  update public.matters
  set title = 'must not update'
  where id = '00000000-0000-0000-0000-000000001002'::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'Staff A updated Staff B matter';
  end if;

  begin
    insert into public.matters (
      id, client_id, service_line, title
    ) values (
      '00000000-0000-0000-0000-000000001021'::uuid,
      '00000000-0000-0000-0000-000000000102'::uuid,
      'legal', 'forbidden arbitrary client matter'
    );
    raise exception 'Ordinary staff created matter for arbitrary client';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.set_matter_staff_assignment(
      '00000000-0000-0000-0000-000000001001'::uuid,
      '00000000-0000-0000-0000-000000000202'::uuid
    );
    raise exception 'Ordinary staff used privileged assignment RPC';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

-- Child write boundary follows the assigned parent matter.
insert into public.matter_chat_reads (user_id, matter_id) values (
  '00000000-0000-0000-0000-000000000201'::uuid,
  '00000000-0000-0000-0000-000000001001'::uuid
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);

do $$
begin
  begin
    insert into public.matter_chat_reads (user_id, matter_id) values (
      '00000000-0000-0000-0000-000000000202'::uuid,
      '00000000-0000-0000-0000-000000001001'::uuid
    );
    raise exception 'Unassigned Staff B wrote chat-read state for Staff A matter';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

-- Admin retains triage visibility and the explicit assignment RPC.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', true);

do $$
begin
  if (select count(*) from public.matters where id in (
    '00000000-0000-0000-0000-000000001001'::uuid,
    '00000000-0000-0000-0000-000000001002'::uuid,
    '00000000-0000-0000-0000-000000001003'::uuid
  )) <> 3 then
    raise exception 'Admin lost expected triage visibility';
  end if;
end
$$;

select public.set_matter_staff_assignment(
  '00000000-0000-0000-0000-000000001001'::uuid,
  '00000000-0000-0000-0000-000000000202'::uuid
);

-- Assignment change immediately moves ordinary-staff visibility.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);

do $$
begin
  if exists (
    select 1 from public.matters
    where id = '00000000-0000-0000-0000-000000001001'::uuid
  ) then
    raise exception 'Former Staff A assignment still grants matter visibility';
  end if;
end
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);

do $$
begin
  if not exists (
    select 1 from public.matters
    where id = '00000000-0000-0000-0000-000000001001'::uuid
  ) then
    raise exception 'New Staff B assignment did not grant matter visibility';
  end if;
end
$$;

reset role;
rollback;
