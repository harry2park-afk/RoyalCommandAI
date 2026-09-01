# Supabase clean replay and recovery baseline

## Status

This is a launch/recovery control for issue #592. It is not a Production migration and it does not make a country launch-ready by itself.

The hosted RoyalCommand project contains an older migration lineage that is only partially represented in this repository. Replaying only `supabase/migrations` from a blank local Supabase therefore fails before reaching current migrations. Verified missing prerequisites exposed by fail-closed replay included `private.is_room_member`, Matter foundation tables, a Room Factory manifest policy timestamped before the checked-in manifest table creation, the service-catalog foundation, and the server-only `communication_recording_policies` foundation.

## Canonical recovery path

1. Start from a blank, disposable Supabase stack with no hosted Production credentials.
2. Apply checked-in `001_init.sql` and `002_rls.sql`.
3. Apply `supabase/recovery/20260901_prelaunch_baseline.sql` **only inside the disposable/recovery replay**.
4. Apply `supabase/recovery/20260901_communications_foundation.sql` **only inside the disposable/recovery replay**.
5. Replay every remaining checked-in migration in filename order without editing historical files.
6. Verify required private helper privilege boundaries, critical schema objects, the Legal Matter assignment wrapper, and the server-only recording-policy ACL.
7. Run the authenticated Legal Matter admin/staff/client RLS matrix.
8. Destroy the disposable stack without backup.

`.github/workflows/supabase-clean-replay.yml` performs these steps. Recovery SQL stays outside `supabase/migrations` so normal hosted migration deployment cannot pick it up accidentally.

## Evidence boundary

The recovery prerequisites contain only structures reconstructed from read-only hosted schema/migration evidence and dependencies explicitly required by the checked-in migration chain. They must not contain customer data, credentials, secrets, generated IDs, or country-specific customer state.

A green workflow proves that a blank disposable database can be reconstructed from repository state plus these documented recovery prerequisites and that representative authenticated RLS behavior still holds. It does **not** prove backup restore time, point-in-time recovery, Production migration safety, payment readiness, country legal/tax approval, or Production Auth configuration.

## Fail-closed discovery rule

If full replay exposes another missing historical prerequisite, do not edit an already-applied historical migration and do not patch Production to make CI pass. First verify the missing object read-only against hosted Production, then add only the minimum verified structure under `supabase/recovery/` and rerun the full blank replay. A failed replay remains a blocker until the next exact head passes.

## Production rule

Do not apply these recovery prerequisites to the hosted Production database. Production reconciliation, if ever required, must be a separate forward-only reviewed migration with a restore point, exact-head CI evidence, Security Advisor review, Change Control, and post-deployment verification.

## Country rollout dependency

Australia, United States, Canada, South Korea, Japan, and United Kingdom remain blocked on their independent legal/tax/privacy, Auth, payment, communications, localization and operational gates. Clean replay closes only the database reconstruction/recovery-confidence portion once the workflow is verified green and the recovery candidate is reviewed under normal merge controls.
