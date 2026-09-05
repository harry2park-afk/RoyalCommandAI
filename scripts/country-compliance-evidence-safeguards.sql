\set ON_ERROR_STOP on

begin;

-- Schema exists and client access is fail-closed.
do $$
begin
  if to_regclass('public.country_compliance_evidence') is null then
    raise exception 'country_compliance_evidence table is missing';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'country_compliance_evidence'
      and c.relrowsecurity
  ) then
    raise exception 'RLS must be enabled on country_compliance_evidence';
  end if;

  if has_table_privilege('anon', 'public.country_compliance_evidence', 'SELECT')
     or has_table_privilege('anon', 'public.country_compliance_evidence', 'INSERT')
     or has_table_privilege('authenticated', 'public.country_compliance_evidence', 'SELECT')
     or has_table_privilege('authenticated', 'public.country_compliance_evidence', 'INSERT') then
    raise exception 'client roles must not have direct compliance evidence privileges';
  end if;

  if (select count(*) from public.country_compliance_evidence) <> 0 then
    raise exception 'migration must not seed any country as compliance-verified';
  end if;
end
$$;

-- Country codes are normalized two-letter uppercase codes.
do $$
begin
  begin
    insert into public.country_compliance_evidence
      (country_code, evidence_kind, evidence_version)
    values ('aus', 'legal', 'invalid-country');
    raise exception 'invalid country code was accepted';
  exception
    when check_violation then null;
  end;
end
$$;

-- Only the narrow evidence taxonomy is accepted; recording/consent stay in
-- their existing source-of-truth tables.
do $$
begin
  begin
    insert into public.country_compliance_evidence
      (country_code, evidence_kind, evidence_version)
    values ('AU', 'recording', 'invalid-kind');
    raise exception 'invalid/duplicated evidence kind was accepted';
  exception
    when check_violation then null;
  end;
end
$$;

-- VERIFIED must carry a source pointer, immutable digest, reviewer and time.
do $$
begin
  begin
    insert into public.country_compliance_evidence
      (country_code, evidence_kind, review_status, evidence_version)
    values ('AU', 'legal', 'VERIFIED', 'missing-proof');
    raise exception 'VERIFIED without proof metadata was accepted';
  exception
    when check_violation then null;
  end;
end
$$;

-- BLOCKED must explain why it is blocked.
do $$
begin
  begin
    insert into public.country_compliance_evidence
      (country_code, evidence_kind, review_status, evidence_version)
    values ('US', 'tax', 'BLOCKED', 'missing-blocker');
    raise exception 'BLOCKED without blocker_reason was accepted';
  exception
    when check_violation then null;
  end;
end
$$;

-- Evidence validity windows cannot run backwards.
do $$
begin
  begin
    insert into public.country_compliance_evidence
      (country_code, evidence_kind, evidence_version, valid_from, valid_until)
    values ('CA', 'privacy', 'bad-window', '2026-10-02T00:00:00Z', '2026-10-01T00:00:00Z');
    raise exception 'invalid evidence validity window was accepted';
  exception
    when check_violation then null;
  end;
end
$$;

-- Only one current row is permitted per country/subdivision/evidence kind.
insert into public.country_compliance_evidence
  (country_code, evidence_kind, evidence_version)
values ('AU', 'legal', '2026-09-draft-1');

do $$
begin
  begin
    insert into public.country_compliance_evidence
      (country_code, evidence_kind, evidence_version)
    values ('AU', 'legal', '2026-09-draft-2');
    raise exception 'duplicate current evidence row was accepted';
  exception
    when unique_violation then null;
  end;
end
$$;

-- A superseded row may be replaced by a newer, fully evidenced VERIFIED row.
update public.country_compliance_evidence
set superseded_at = now(), updated_at = now()
where country_code = 'AU'
  and subdivision_code is null
  and evidence_kind = 'legal'
  and evidence_version = '2026-09-draft-1';

insert into public.country_compliance_evidence (
  country_code,
  evidence_kind,
  review_status,
  evidence_version,
  evidence_ref,
  evidence_sha256,
  reviewed_at,
  reviewed_by,
  valid_from
) values (
  'AU',
  'legal',
  'VERIFIED',
  '2026-09-reviewed-1',
  'evidence://controlled-test-artifact',
  repeat('a', 64),
  now(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  now()
);

-- The test transaction itself must never persist evidence.
rollback;
