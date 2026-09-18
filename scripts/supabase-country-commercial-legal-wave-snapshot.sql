-- RoyalCommandAI country commercial/legal rollout evidence snapshot
-- READ-ONLY / fail-closed evidence only. No Hosted mutation and no Country READY transition.
-- First wave: AU, US, CA, KR, JP, GB. Next wave: SG, CN, HK, TW, IN.

begin read only;

with countries(country_code, wave, currency, expected_locale, expected_secondary_locale) as (
  values
    ('AU','first','AUD','en-AU',null),
    ('US','first','USD','en-US',null),
    ('CA','first','CAD','en-CA','fr-CA'),
    ('KR','first','KRW','ko-KR',null),
    ('JP','first','JPY','ja-JP',null),
    ('GB','first','GBP','en-GB',null),
    ('SG','next','SGD','en-SG',null),
    ('CN','next','CNY','zh-CN',null),
    ('HK','next','HKD','zh-HK',null),
    ('TW','next','TWD','zh-TW',null),
    ('IN','next','INR','en-IN',null)
), country_evidence as (
  select
    country.country_code,
    country.wave,
    country.currency,
    country.expected_locale,
    country.expected_secondary_locale,
    (
      select count(*)::int
      from public.room_factory_manifests manifest
      where upper(manifest.country_code) = country.country_code
    ) as room_factory_manifest_rows,
    (
      select count(*)::int
      from public.room_factory_manifests manifest
      where upper(manifest.country_code) = country.country_code
        and lower(coalesce(manifest.language_tag, '')) = lower(country.expected_locale)
    ) as room_factory_exact_locale_rows,
    case
      when country.expected_secondary_locale is null then null
      else (
        select count(*)::int
        from public.room_factory_manifests manifest
        where upper(manifest.country_code) = country.country_code
          and lower(coalesce(manifest.language_tag, '')) = lower(country.expected_secondary_locale)
      )
    end as room_factory_secondary_locale_rows,
    (
      select count(distinct manifest.template_id)::int
      from public.room_factory_manifests manifest
      where upper(manifest.country_code) = country.country_code
    ) as room_factory_template_count,
    (
      select count(*)::int
      from public.room_factory_manifests manifest
      where upper(manifest.country_code) = country.country_code
        and manifest.encounter_session_id is not null
    ) as room_factory_encounter_keyed_rows,
    (
      select count(*)::int
      from public.rc_service_country_terms terms
      where terms.country_code = country.country_code
        and terms.currency = country.currency
    ) as service_term_rows,
    (
      select count(*)::int
      from public.rc_service_country_terms terms
      where terms.country_code = country.country_code
        and terms.currency = country.currency
        and lower(coalesce(terms.availability_status, '')) = 'available'
        and coalesce(terms.customer_price_minor, 0) > 0
    ) as available_priced_term_rows,
    (
      select count(*)::int
      from public.rc_service_provider_offers offer
      where offer.country_code = country.country_code
    ) as provider_offer_rows,
    (
      select count(*)::int
      from public.rc_service_provider_offers offer
      where offer.country_code = country.country_code
        and offer.active is true
        and lower(coalesce(offer.connection_status, '')) = 'available'
        and lower(coalesce(offer.review_status, '')) = 'approved'
        and coalesce(offer.customer_price_minor, 0) > 0
    ) as approved_available_priced_offer_rows,
    (
      select count(*)::int
      from public.communication_recording_policies policy
      where policy.country_code = country.country_code
    ) as recording_policy_rows,
    (
      select count(*)::int
      from public.communication_recording_policies policy
      where policy.country_code = country.country_code
        and lower(coalesce(policy.review_status, '')) = 'approved'
        and lower(coalesce(policy.recording_policy, '')) <> 'blocked'
        and policy.reviewed_by is not null
        and policy.reviewed_at is not null
        and nullif(trim(policy.legal_basis), '') is not null
    ) as reviewer_proven_recording_rows
  from countries country
)
select jsonb_build_object(
  'table_inventory', jsonb_build_object(
    'room_factory_manifests_present', to_regclass('public.room_factory_manifests') is not null,
    'room_factory_manifests_total', (select count(*)::int from public.room_factory_manifests),
    'rc_service_country_terms_present', to_regclass('public.rc_service_country_terms') is not null,
    'rc_service_country_terms_total', (select count(*)::int from public.rc_service_country_terms),
    'rc_country_terms_present', to_regclass('public.rc_country_terms') is not null,
    'country_terms_present', to_regclass('public.country_terms') is not null,
    'service_providers_total', (select count(*)::int from public.rc_service_providers),
    'service_provider_offers_total', (select count(*)::int from public.rc_service_provider_offers),
    'service_connection_orders_total', (select count(*)::int from public.rc_service_connection_orders)
  ),
  'countries', (
    select jsonb_agg(to_jsonb(country_evidence) order by
      case country_evidence.wave when 'first' then 0 else 1 end,
      country_evidence.country_code
    )
    from country_evidence
  )
) as country_commercial_legal_wave_snapshot;

rollback;
