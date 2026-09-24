-- RoyalCommandAI first-wave Room Factory runtime evidence snapshot
-- READ-ONLY / fail-closed evidence helper. No Hosted mutation.
-- First wave: AU en-AU, US en-US, CA en-CA, KR ko-KR, JP ja-JP, GB en-GB.

begin read only;

with countries(country_code, expected_locale, rollout_order) as (
  values
    ('AU', 'en-AU', 1),
    ('US', 'en-US', 2),
    ('CA', 'en-CA', 3),
    ('KR', 'ko-KR', 4),
    ('JP', 'ja-JP', 5),
    ('GB', 'en-GB', 6)
), runtime as (
  select
    country.country_code,
    country.expected_locale,
    country.rollout_order,
    count(manifest.*)::int as manifest_rows,
    count(manifest.*) filter (
      where manifest.encounter_session_id is not null
    )::int as non_null_encounter_rows,
    count(manifest.*) filter (
      where manifest.language_tag = country.expected_locale
    )::int as exact_locale_rows,
    count(manifest.*) filter (
      where manifest.encounter_session_id is not null
        and manifest.language_tag = country.expected_locale
    )::int as exact_runtime_rows
  from countries country
  left join public.room_factory_manifests manifest
    on manifest.country_code = country.country_code
  group by country.country_code, country.expected_locale, country.rollout_order
)
select jsonb_build_object(
  'first_wave_runtime', (
    select jsonb_agg(
      jsonb_build_object(
        'country_code', country_code,
        'expected_locale', expected_locale,
        'manifest_rows', manifest_rows,
        'non_null_encounter_rows', non_null_encounter_rows,
        'exact_locale_rows', exact_locale_rows,
        'exact_runtime_rows', exact_runtime_rows,
        'runtime_verified', exact_runtime_rows > 0
      )
      order by rollout_order
    )
    from runtime
  ),
  'direct_manifest_write_authority', jsonb_build_object(
    'anon_insert', has_table_privilege('anon', 'public.room_factory_manifests', 'INSERT'),
    'authenticated_insert', has_table_privilege('authenticated', 'public.room_factory_manifests', 'INSERT'),
    'authenticated_update', has_table_privilege('authenticated', 'public.room_factory_manifests', 'UPDATE'),
    'authenticated_delete', has_table_privilege('authenticated', 'public.room_factory_manifests', 'DELETE')
  )
) as room_factory_first_wave_runtime_snapshot;

rollback;
