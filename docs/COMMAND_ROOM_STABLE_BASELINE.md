# Command Room Stable Baseline

This file records the approved rollback baseline for Command Room.

## Baseline policy
A commit may be marked STABLE only after:
- GitHub Quality Gate passes.
- Vercel Preview is READY.
- The owner-approved Command Room smoke test passes.

## Current candidate baseline
The current master after PR #88 is a candidate only. It is not yet marked STABLE until the owner verifies manual chat scrolling and the remaining smoke-test items.

## Stable baseline record
When approved, record:
- Date/time
- Master commit SHA
- Production deployment ID
- Smoke-test result
- Known accepted limitations

## Rollback rule
If a later change breaks a locked/core behavior, compare against and prefer rollback to the latest STABLE baseline before adding workaround layers.
