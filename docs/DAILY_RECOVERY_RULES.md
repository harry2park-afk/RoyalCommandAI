# Royal Command Daily Recovery Rules

Status: Persistent owner-approved operation. Run daily at 23:30 Australia/Sydney without a new order.

## Daily checklist
- [ ] Record exact GitHub source/master commit and integrity.
- [ ] Verify latest Vercel Production deployment and health.
- [ ] Verify Supabase health, critical tables/advisories and incomplete-write risk.
- [ ] Review Work ID/Revision state and unresolved failures.
- [ ] Check critical integrations/configuration without exposing secrets.
- [ ] Confirm the latest owner-approved STABLE baseline is recoverable.

## Restore decision
- No material change: verify the existing restore point; do not create a duplicate.
- Material change: create a dated, non-overwriting restore branch/tag or equivalent containing date/time, commit SHA, deployment ID/status, Supabase recovery notes, Work state and unresolved risks.
- A baseline is STABLE only after Quality Gate, READY Preview and owner-approved Command Room smoke test. Record it in `COMMAND_ROOM_STABLE_BASELINE.md`.

## Safety and repair
Before backup, recovery, branch, database, deployment or repair actions, check for build/deployment failure, corruption/security risk, conflicting ownership and uncertain state. Stop destructive or irreversible work when unsafe and issue `ERROR SIGNAL` with affected area, evidence, impact and recommended repair. Never claim uncertain success.

After repair, re-check relevant build/type, deployment, integrations, data consistency, security and downstream effects. Unresolved material risk remains incomplete; other AIs may diagnose, but only the assigned Writer may modify the work unless reassigned.

Periodically test that recorded source, deployment and database recovery information is actually usable. Rollback must preserve customer data and unrelated working features.

## Daily outcome
Record exactly one concise result:
- `HEALTHY` — no material change; prior restore point verified.
- `RESTORE POINT CREATED` — material change; new point verified.
- `ERROR SIGNAL` — recovery safety unconfirmed; action stopped.
