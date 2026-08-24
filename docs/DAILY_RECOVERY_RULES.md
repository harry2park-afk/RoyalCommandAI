# Royal Command Daily Recovery Rules

Status: Harry Park approved operating rule.

## Automatic daily operation

This rule runs every day without requiring a new user order.

At 23:30 Australia/Sydney, Royal Command must perform an end-of-day health and recovery review across source code, deployment, database, work records, and critical integrations.

## Daily review always happens

The daily review must run whether or not Harry issued any order that day.

If there were no material changes during the day, do not create unnecessary duplicate backups. Instead verify that the latest known-good restore point is still recoverable and record that no new restore point was required.

If there were material changes, create a new dated restore point for that day.

## Required checks

Before creating or updating any restore point, verify:

- GitHub master/source integrity and exact current commit.
- Latest Vercel production deployment status and health.
- Supabase project/database health, critical tables, advisories, and obvious incomplete writes.
- Current Work ID / Revision records and unresolved execution failures.
- Critical integration/configuration health where safely checkable without exposing secrets.

## Error-first rule

Before any backup, restore-point creation, branch creation, database action, deployment action, or repair, perform a risk and error pre-check.

If there is a build failure, deployment failure, database corruption risk, security problem, conflicting active AI assignment, uncertain state, or any meaningful chance that the action could make recovery harder, STOP before destructive or irreversible work and issue an ERROR SIGNAL containing:

- affected area,
- exact detected problem,
- likely impact,
- recommended repair,
- whether another AI review is needed.

Do not claim success when state is uncertain.

## Restore-point contents

For each day that requires a new restore point, record at minimum:

- date/time,
- Git commit SHA,
- dated restore branch/tag or equivalent recoverable source pointer,
- Vercel production deployment ID and status,
- Supabase project/status and recovery-relevant notes,
- Work ID / Revision state,
- unresolved risks or known defects.

Never delete or overwrite an older restore point while creating a new one.

## Post-fix verification

After any repair, do not stop merely because the immediate error disappeared. Re-check build/type status, deployment health, affected integrations, database consistency, and likely downstream side effects.

If the repair could create a later problem, fix that risk before closing the work when possible. If it cannot be safely resolved by the assigned AI, mark the item incomplete and request cooperative diagnosis from the other AIs. Other AIs may diagnose and propose fixes, but execution isolation rules still apply: only the explicitly assigned AI may modify that work item unless Harry issues a new order.

## Recovery testing

Periodically verify that restore information is actually usable, not merely recorded. A restore point is not considered healthy if required source, deployment, or database recovery information is missing or cannot be validated.

## Reporting

The daily job must produce a concise status record with one of these outcomes:

- HEALTHY — no material change; previous restore point verified.
- RESTORE POINT CREATED — material change detected and new recovery point verified.
- ERROR SIGNAL — recovery safety cannot be confirmed; stopped for repair.

This daily rule is persistent and does not require Harry to repeat the order each day.
