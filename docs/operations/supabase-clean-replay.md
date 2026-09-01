# Supabase clean replay and recovery baseline

## Status

This is a launch/recovery control for issue #592. It is not a Production migration and it does not make a country launch-ready by itself.

The hosted RoyalCommand project contains an older migration lineage that is only partially represented in this repository. Replaying only `supabase/migrations` from a blank local Supabase therefore fails before reaching current migrations. Known failures included missing `private.is_room_member`, missing Matter foundation tables, and a Room Factory manifest policy timestamped before the checked-in manifest table creation.

## Canonical recovery path

1. Start from a blank, disposable Supabase stack with no hosted Production credentials.
2. Apply checked-in `001_init.sql` and `002_rls.sql`.
3. Apply `supabase/recovery/20260901_prelaunch_baseline.sql` **only inside the disposable/recovery replay**.
4. Replay every remaining checked-in migration in filename order without editing historical files.
5. Verify the required private helper privilege boundaries and critical schema objects.
6. Run the authenticated Legal Matter admin/staff/client RLS matrix.
7. Destroy the disposable stack without backup.

`.github/workflows/supabase-clean-replay.yml` performs these steps. The recovery SQL is outside `supabase/migrations` so normal hosted migration deployment cannot pick it up accidentally.

## Evidence boundary

The baseline contains only prerequisites reconstructed from read-only hosted schema/migration evidence and dependencies explicitly required by the checked-in migration chain. It must not contain customer data, credentials, secrets, generated IDs, or country-specific customer state.

A green workflow proves that a blank disposable database can be reconstructed from repository state plus this documented baseline and that representative authenticated RLS behavior still holds. It does **not** prove backup restore time, point-in-time recovery, Production migration safety, payment readiness, country legal/tax approval, or Production Auth configuration.

## Production rule

Do not apply the recovery baseline to the hosted Production database. Production reconciliation, if ever required, must be a separate forward-only reviewed migration with a restore point, exact-head CI evidence, Security Advisor review, Change Control, and post-deployment verification.

## Country rollout dependency

Australia, United States, Canada, South Korea, Japan, and United Kingdom remain blocked on their independent legal/tax/privacy, Auth, payment, communications, localization and operational gates. Clean replay closes only the database reconstruction/recovery-confidence portion once the workflow is verified green.
