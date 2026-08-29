create sequence if not exists public.legal_case_number_seq;

alter table public.legal_cases
  add column if not exists case_number bigint;

update public.legal_cases
set case_number = nextval('public.legal_case_number_seq')
where case_number is null;

alter table public.legal_cases
  alter column case_number set default nextval('public.legal_case_number_seq');

create unique index if not exists legal_cases_case_number_uidx
  on public.legal_cases(case_number);
