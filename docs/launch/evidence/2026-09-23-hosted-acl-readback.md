# Hosted ACL readback — 2026-09-23

Status: **READ-ONLY evidence capture. No Hosted Supabase mutation. No Production/master mutation.**

## Baseline

- PR #696 pre-capture head: `c124dccea754236ba2ce55c9d260aa5918c4be75`
- Production `master`: `33da2a917dc6adcf266f59f0b27d18a56f1271d8`
- Restore baseline: `restore/2026-09-23-0550-pr696-pre-hosted-acl-readback`

## Fresh Hosted privilege readback

For both high-risk tables below, `has_table_privilege` was checked for the client roles `anon` and `authenticated` across `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER`.

### `public.rc_customer_accounts`

Both `anon` and `authenticated` currently report **TRUE for all seven table privileges** listed above.

RLS is enabled. `FORCE ROW LEVEL SECURITY` is not enabled.

### `public.room_factory_manifests`

Both `anon` and `authenticated` currently report **TRUE for all seven table privileges** listed above.

RLS is enabled. `FORCE ROW LEVEL SECURITY` is not enabled.

This evidence does not claim that every privilege bypasses RLS. It establishes that the Hosted table-level privilege footprint is broader than the launch least-privilege target and therefore requires explicit non-Production remediation and verification before launch approval.

## CI / Hosted divergence

The disposable Customer Account Authority workflow fixture currently describes the verified Hosted precondition as `anon` having no table access. That no longer matches the fresh Hosted readback above.

The disposable Room Factory Concurrency workflow replays `supabase/migrations/20260911045100_room_factory_manifest_acl_hardening.sql`, and its current exact-head run passes. However, the Hosted migration ledger contains no `20260911045100` row and no migration rows in the `20260910...`–`20260912...` range. Therefore a green local/disposable Room Factory ACL test must not be treated as proof that the Hosted ACL hardening has been deployed.

## Launch impact

The first-wave countries — Australia, United States, Canada, South Korea, Japan, and United Kingdom — remain **HOLD**. This ACL evidence is an authentication/data-isolation launch blocker in addition to the already-recorded migration provenance, country runtime/localization, legal/compliance, terms, and payment-readiness blockers.

## Safe next gate

1. Resolve independent source/change-record authority for Hosted migration rows 76 and 80 and establish the trusted 80-row baseline.
2. Refresh the customer-account Hosted authority evidence so the CI precondition matches current live READ-ONLY evidence.
3. Use an isolated non-Production Supabase environment to apply and verify explicit least-privilege ACL hardening for both high-risk tables.
4. Re-run linked migration dry-run and regression/security checks before any Production grant change.
5. Only then continue with the Australia `en-AU` encounter-backed runtime and the remaining five first-wave countries.

No Production or Hosted mutation is authorized by this evidence document.