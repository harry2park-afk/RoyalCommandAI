# October Country Rollout — Evidence Snapshot (2026-08-30)

This is a non-activation readiness record. It does **not** mark any country launchable and does not change production routing, payments, authentication, Room behavior, or Supabase schema.

## Safety baseline

- Audited master: `70a4e86ffc289336e91ea2f3c4088636eec22f51` (`fix: make Room connections clearly reversible (#502)`).
- Master Vercel commit status observed as `success` before this snapshot.
- Existing dated restore branches were confirmed, including `restore/2026-08-29-2330`, `restore/2026-08-29-2150-launch-verified`, and multiple pre/post hardening restore branches from 2026-08-30.
- Command Room stability policy remains unchanged; no direct production code/schema mutation is part of this snapshot.

## First rollout cohort

Target order for this audit: Australia (AU), United States (US), Canada (CA), South Korea (KR), Japan (JP), United Kingdom (GB).

All six country configuration files exist. Their current compliance/payment state intentionally fails closed under `evaluateCountryLaunch()`:

| Country | Locale | Compliance | Payments | Tax provider | Tax structure | Launch status now |
| --- | --- | --- | --- | --- | --- | --- |
| AU | en-AU | NEEDS_REVIEW | NOT_CONNECTED | NOT_CONNECTED | GST / NEEDS_REVIEW | BLOCKED |
| US | en-US | NEEDS_REVIEW | NOT_CONNECTED | NOT_CONNECTED | Federal/state/local / NEEDS_REVIEW | BLOCKED |
| CA | en-CA (+ fr-CA secondary) | NEEDS_REVIEW | NOT_CONNECTED | NOT_CONNECTED | GST/HST/PST/QST / NEEDS_REVIEW | BLOCKED |
| KR | ko-KR | NEEDS_REVIEW | NOT_CONNECTED | NOT_CONNECTED | VAT / NEEDS_REVIEW | BLOCKED |
| JP | ja-JP | NEEDS_REVIEW | NOT_CONNECTED | NOT_CONNECTED | Consumption Tax / NEEDS_REVIEW | BLOCKED |
| GB | en-GB | NEEDS_REVIEW | NOT_CONNECTED | NOT_CONNECTED | VAT / NEEDS_REVIEW | BLOCKED |

This is the correct safe state until country-specific legal, tax, privacy, regulated-domain and payment evidence is approved.

## Room factory / template readiness

Repository evidence shows the Room Factory foundation and tests are present, including factory planning, preparation, lock, lane, evidence review and QA-release routes plus factory unit tests.

Supabase migration history confirms the recent Room Factory RPC hardening series has been applied through `harden_start_room_factory_lane_rpc_wrapper`, including prepare/acquire/release/fail/evidence/review/lane-start wrappers and anon revocation for the prepare wrapper.

No factory activation was performed in this audit.

## Authentication / tenant isolation evidence

Supabase read-only policy inspection found RLS enabled on core tenant tables including `rooms`, `room_members`, `room_factory_manifests`, `room_resource_locks`, `room_work_lanes`, `room_work_records`, legal case/evidence tables, and service connection orders.

Observed policy boundaries include:

- Room insert tied to `room_owner_id = auth.uid()` plus household membership/ownership.
- Room member insertion restricted to the Room owner.
- Room Factory manifest insertion tied to owner + owned Room; reads use `private.is_room_member(room_id)`.
- Legal case/evidence policies require matching owner and owned Room.
- Service connection order creation requires the authenticated owner, pending payment state, no externally supplied payment IDs, and owned-Room checks for Room-scoped orders.

This is useful evidence, not a full penetration/security sign-off.

## Supabase security advisor result

Security advisor currently reports three INFO-level `RLS Enabled No Policy` notices:

- `communication_recording_policies`
- `rc_service_provider_offers`
- `rc_service_providers`

These may be deliberate service-role-only/deny-by-default tables. Do not add public/authenticated policies merely to silence the advisor. Confirm intended access paths before changing them.

## Launch-critical gaps recorded

1. **Canada Create Room selector gap — #500**
   - `COUNTRY_ROOM_PRESETS` contains Canada (`CA`, `en-CA`, `America/Toronto`, `CAD`).
   - `CREATE_ROOM_COUNTRIES` omits Canada.
   - Required narrow fix: add CA to the Create Room selector and add a regression test for AU/US/CA/KR/JP/GB.

2. **Base Room currency mismatch — #504**
   - Approved base Room rent is USD $3.80/month for the initial developed/high-income tier.
   - Create Room source still uses `BASIC_ROOM_MONTHLY_AUD = 3.8`, `A$3.80` copy, and combines the base price with AUD-priced add-ons.
   - A blind currency rename is unsafe because it would create mixed-currency totals. Base rent must be separated from add-on pricing before payment activation.

3. **Country launch gates intentionally blocked**
   - Legal/tax/privacy/regulated-domain reviews and payment/tax connections remain unverified for all six first-cohort countries.
   - Operational evidence gate also requires verified domain binding, auth callbacks, session cookies, communications rules, data residency, localization, required integrations, preview smoke test and rollback path before activation.

## Safe next sequence

1. Merge only the narrow Canada selector + regression test after CI/preview verification.
2. Design and test base USD Room rent separately from service/add-on currencies; keep live charging off.
3. Build an evidence record per first-cohort country for the operational gate without changing activation flags.
4. Complete legal/privacy/tax/payment reviews country by country; do not mass-mark `READY` or `CONNECTED`.
5. Run QA/security/regression + preview smoke tests for each country pack, then verify rollback evidence before any production activation.

## Verification boundary

No country is claimed launch-ready by this document. No database write, payment activation, country flag activation, production merge, or production deployment was performed by this audit.