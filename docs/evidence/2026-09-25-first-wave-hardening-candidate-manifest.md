# October first-wave hardening candidate manifest — 2026-09-25

Status: repository evidence only. This document does **not** authorize Production/Hosted changes and does not mark any country READY.

## Stable baseline

- Production `master`: `33da2a917dc6adcf266f59f0b27d18a56f1271d8`
- PR #856 pre-change head: `739f50cc808659c1328da135738377b68813f7b5`
- Restore branch: `restore/2026-09-25-0750-pr856-pre-hardening-manifest`
- Source hardening PR: #696, exact head `da2f0df92ef7a8e7c7e01f335b8350a6440e1965`

## Verified source candidate set

The following files are pinned to exact blobs from PR #696. They are **candidate inputs for controlled non-Production verification only**.

| Launch-critical control | Source path | Blob SHA | Evidence workflow on PR #696 exact head |
| --- | --- | --- | --- |
| Legal Matter tenant/assignment isolation + role pre-hardening | `supabase/migrations/20260831225500_scope_matter_staff_access.sql` | `e518dcb10cb4eafad8311922bf801e75d0ce38fb` | Legal Matter Tenant Isolation Evidence — success |
| Profile role authority | `supabase/migrations/20260904105500_harden_profile_role_authority.sql` | `b97a1834111d5ec6c4b089314e7552f5f2073fa7` | Profile Role Authority Evidence — success |
| Room Factory manifest ACL | `supabase/migrations/20260911045100_room_factory_manifest_acl_hardening.sql` | `637f759884f099e37257c021c9dbb09badc9e799` | Room Factory Manifest Authority Evidence — success |
| Payment operational safeguards | `supabase/migrations/20260903205500_payment_operational_safeguards.sql` | `9f29a75e06a044cc5c14d7cc10d1aa1a8fcbfc10` | Payment Operational Evidence — success |
| Payment order authority | `supabase/candidates/20260924140100_harden_payment_order_authority.sql` | `e19aa6866681998f37afc2f5e7b4cdfaeacc5865` | Payment Order Authority Evidence — success |
| Customer account authority | `scripts/supabase-customer-account-remediation-candidate.sql` | `b817f2b5824a10d08a78d9d030d5a126fd60ea61` | Customer Account Authority Evidence — success |

PR #696 exact head also reports success for Integrated Launch Hardening Evidence, Room Factory Concurrency Evidence, Supabase Clean Replay Evidence, Supabase Minimal Stack Smoke, Supabase Known Hosted Ledger Preflight, Royal Command Quality Gate, and Royal Command Conflict Guard.

## Explicit release blocker

`Supabase Linked Dry-Run Evidence` on PR #696 exact head is **failure**. Therefore these candidates must not be promoted directly to Hosted/Production based only on isolated/disposable success.

The existing reviewed eight-migration coverage test in PR #696 pins this broader launch set:

1. `20260831225500_scope_matter_staff_access.sql`
2. `20260901025800_room_factory_atomic_non_encounter.sql`
3. `20260903075000_country_compliance_evidence_registry.sql`
4. `20260903205500_payment_operational_safeguards.sql`
5. `20260904005500_add_room_factory_fk_indexes.sql`
6. `20260904105500_harden_profile_role_authority.sql`
7. `20260910030000_harden_commercial_review_provenance.sql`
8. `20260911045100_room_factory_manifest_acl_hardening.sql`

Do not infer that all eight are deployable until linked-dry-run/provenance and controlled staging are green.

## Fresh Hosted read-only boundary

Supabase project `aygawkavujjmybekswrg` was read only for this evidence pass.

- Development branches: **0**
- Security Advisor: **21** `rls_enabled_no_policy` findings
- Launch-adjacent no-policy tables include:
  - `communication_recording_policies`
  - `rc_service_providers`
  - `rc_service_provider_offers`
- Hosted migration ledger still includes:
  - `20260920091809 add_secure_rc_customer_numbers`
  - `20260922021440 rcv3_preview_email_outbox`

No Hosted DDL/DML/Auth/Storage mutation was made.

## First-wave release rule

Countries remain gated in this order: AU, US, CA, KR, JP, GB. A country may not transition to READY until controlled non-Production proves the pinned controls above together with exact-locale encounter-backed Room Factory runtime, reviewer-backed legal/privacy/data-residency/tax/recording/commercial evidence, and a real payment-provider sandbox path.

Next expansion remains SG/CN/HK/TW/IN behind the same fail-closed gate; no expansion activation is authorized while the first wave is blocked.
