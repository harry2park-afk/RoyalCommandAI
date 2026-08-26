## Work Queue Ticket
<!-- Reference exactly one open issue, for example: #123 -->

## Primary task
<!-- Exactly one non-empty line describing the primary task. -->

## Batch exception
NO — one controlled task only.

## Goal

## Files / components changed

## Locked surfaces touched
NONE

## Explicit non-goals
Do not change unrelated behavior, bypass approval gates, or write directly to production/master.

## Verification plan
- Lint changed code
- Typecheck
- Unit tests
- Production build
- Vercel Preview
- Applicable Room smoke tests

## Automated checks
Royal Command Change Control, Conflict Guard, and Quality Gate must pass.

## Vercel Preview
Required before production approval.

## Rollback point
Identify the stable baseline commit or PR.

## AI execution metadata (when applicable)
- Work ID:
- Revision:
- Provider: openai | anthropic | google | xai | codex | gateway
- Provider branch: `rc-work/<work-id>/<provider>-...`
- Host-verified commit/PR evidence:
