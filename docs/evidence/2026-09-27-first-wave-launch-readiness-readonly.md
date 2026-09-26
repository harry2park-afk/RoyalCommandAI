# October first-wave launch readiness — 2026-09-27 AEST

Status: repository evidence only. Production `master` and Hosted Supabase were not changed by this evidence pass.

## Stable boundary

- Protected `master`: `33da2a917dc6adcf266f59f0b27d18a56f1271d8`
- PR #856 pre-evidence head: `aad0984253300a60b3bf4c53270e386567168897`
- Restore ref: `restore/2026-09-27-0850-pr856-pre-country-authority`

## GitHub exact-head evidence before this document

PR #856 exact head `aad0984253300a60b3bf4c53270e386567168897`:
- Royal Command Quality Gate #2412: SUCCESS
- Royal Command Conflict Guard #2156: SUCCESS
- Royal Command Change Control #2227: SKIPPED because Draft; SKIPPED is not PASS
- Vercel exact-commit status: SUCCESS
- Compare to protected master: 8 commits ahead / 0 behind / 11 changed files

## Fresh Hosted Supabase READ-ONLY evidence

No Hosted DDL, DML, Auth, Storage, migration, provider, payment, Room, role, or customer-data mutation was made.

### Migration / staging boundary
- Production migration ledger: 81
- Restore-test migration ledger: 82
- Supabase development branches: 0
- Restore-test is not Production parity.

### Room Factory exact-locale runtime
- AU `en-AU`: 7 total manifests, 0 exact-locale, 0 encounter-backed exact
- US `en-US`: 0 / 0 / 0
- CA `en-CA`: 0 / 0 / 0
- KR `ko-KR`: 0 / 0 / 0
- JP `ja-JP`: 0 / 0 / 0
- GB `en-GB`: 0 / 0 / 0

### Compliance / commercial
- Reviewer-proven nationwide recording approval: 0/6
- First-wave service country terms: 0
- First-wave provider offers: 0
- Service orders: 0
- Providers: 0
- `country_compliance_evidence`: absent

### Auth / data-isolation
- Auth users: 10
- Trusted `app_metadata.country_code`: 0
- Legacy user-editable country metadata: 1
- Signup `requested_country_code`: 0
- Authenticated direct UPDATE remains available on `profiles.role`, `matters.client_id`, and `matters.assigned_staff_id`.
- Anon/authenticated direct Room Factory manifest INSERT remains available.
- Authenticated service-order INSERT remains available.

### Payment operational
- `rc_payment_provider_registry`: absent
- `rc_payment_provider_events`: absent
- Service-order `idempotency_key`: absent

### Security advisor
Production Security Advisor reports 23 `rls_enabled_no_policy` findings, including:
- `communication_recording_policies`
- `rc_service_providers`
- `rc_service_provider_offers`

Remediation reference:
https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Country-authority integration note

The reviewed PR #696 country-authority slice was rechecked, but a complete safe transplant was not achieved in this pass. The isolated branch `launch/pr856-country-authority-stack-20260927-0850` is incomplete and must not be merged or treated as launch evidence.

## Release disposition

AU, US, CA, KR, JP, and GB remain HOLD.

Next safe order:
1. Complete trusted first-wave country identity authority on an isolated branch and earn exact-head CI.
2. Establish controlled non-Production staging with Production-parity migration provenance.
3. Prove Auth/Data-Isolation and direct-write denial.
4. Prove Room Factory exact-locale encounter-backed runtime.
5. Prove reviewer-backed legal/privacy/data-residency/tax/recording/commercial evidence.
6. Prove real payment-provider sandbox flow and operational safeguards.
7. Repeat for US/CA/KR/JP/GB, then expand toward SG/CN/HK/TW/IN behind the same fail-closed gates.
