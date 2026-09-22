# Hosted ACL readback — 2026-09-23

Status: **READ-ONLY evidence capture. No Hosted Supabase mutation. No Production/master mutation.**

## Baseline

- PR #696 pre-correction head: `df6964c18ad6afecad1b54c7ec83c7e61ce985df`
- Production `master`: `33da2a917dc6adcf266f59f0b27d18a56f1271d8`
- Restore baseline: `restore/2026-09-23-0650-pr696-pre-acl-evidence-correction`
- Corrected machine-readable evidence: `scripts/hosted-acl-readback-20260923-0650.json`

## Fresh Hosted privilege readback

`has_table_privilege` was checked for `anon` and `authenticated` across `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER`.

### `public.rc_customer_accounts`

- `anon`: **no direct table privileges** across the seven privileges above.
- `authenticated`: **TRUE for all seven table privileges**.
- RLS is enabled; `FORCE ROW LEVEL SECURITY` is not enabled.
- One Hosted policy is present: `rc_customer_accounts_read_own`, `SELECT`, role `authenticated`, predicate `owner_id = auth.uid()`.
- Client roles have no direct `USAGE` / `SELECT` / `UPDATE` privilege on `public.rc_customer_number_seq`; `service_role` has those three sequence privileges.
- `public.ensure_rc_customer_account(uuid)` is **absent** on Hosted.

The earlier evidence text on this branch incorrectly stated that `anon` also had all seven direct table privileges on `rc_customer_accounts`. The fresh readback above corrects that statement. The older `scripts/first-wave-hosted-readback-20260923.json` already recorded only the authenticated customer-account write blocker and was consistent with this corrected readback.

### `public.room_factory_manifests`

- `anon`: **TRUE for all seven table privileges**.
- `authenticated`: **TRUE for all seven table privileges**.
- RLS is enabled; `FORCE ROW LEVEL SECURITY` is not enabled.
- Hosted policies currently observed are `room_factory_manifests_insert_owner` (`INSERT`, authenticated) and `room_factory_manifests_select` (`SELECT`, authenticated).

This evidence does not claim that every table privilege bypasses RLS. It establishes that the Hosted table-level privilege footprint remains broader than the launch least-privilege target. In particular, the Room Factory table still exposes client-role table authority beyond the two observed RLS policy operations and therefore remains a launch blocker until isolated non-Production remediation and negative testing are complete.

## CI / Hosted interpretation

The disposable **Customer Account Authority** fixture is consistent with the corrected Hosted precondition that `anon` has no direct table access while `authenticated` has broad table privileges. Its remediation candidate is still **not deployed to Hosted**, demonstrated by the absence of `public.ensure_rc_customer_account(uuid)` on Hosted.

The disposable **Room Factory Concurrency** workflow replays `supabase/migrations/20260911045100_room_factory_manifest_acl_hardening.sql`, and its exact-head CI run can pass locally. However, the Hosted migration ledger contains no `20260911045100` row. Therefore a green disposable Room Factory ACL test must not be treated as proof that Hosted ACL hardening has been deployed.

## Launch impact

Australia, United States, Canada, South Korea, Japan, and United Kingdom remain **HOLD**. The corrected customer-account evidence narrows the blocker accurately: `anon` is already denied direct customer-account table access, but `authenticated` still has broad direct control privileges and the trusted allocator candidate is absent. Room Factory remains broader still, with both client roles holding all seven table privileges.

## Safe next gate

1. Resolve independent source/change-record authority for Hosted migration rows 76 and 80 and establish the trusted 80-row baseline.
2. Preserve the corrected customer-account authority precondition in CI; do not weaken its post-remediation least-privilege assertions.
3. Use an isolated non-Production Supabase environment to apply and verify the customer-account remediation candidate and Room Factory ACL hardening, including negative direct-write/control tests and tenant isolation.
4. Re-run linked migration dry-run and regression/security checks before any Production grant change.
5. Only then continue with the Australia `en-AU` encounter-backed runtime and the remaining five first-wave countries.

No Production or Hosted mutation is authorized by this evidence document.
