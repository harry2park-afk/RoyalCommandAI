## Work Queue Ticket

#

## Primary task

One outcome only, on one line.

## Batch exception

NO

## Goal

Describe the requested result for this one task.

## Files / components changed

- 

## Locked surfaces touched

Write `NONE` or list only the locked surfaces this task must change.

## Explicit non-goals

State what this PR deliberately does not change.

## Verification plan

State the exact checks that prove this task is complete without regressing locked/core flows.

## Automated checks

- [ ] Changed-code lint PASS
- [ ] `npm run typecheck` PASS
- [ ] `npm test` PASS
- [ ] `npm run build` PASS
- [ ] Royal Command Change Control PASS

## Command Room smoke test

Check only applicable items, but explain any skipped core item when the PR touches Command Room runtime behavior.

- [ ] Login -> Dashboard -> Command Room
- [ ] No unsolicited external tab
- [ ] AI selection / AI Warehouse
- [ ] Composer multiline + send
- [ ] Manual message scrolling
- [ ] New Chat / Voice
- [ ] Conversation default title from first chat text
- [ ] Pencil title editing + save
- [ ] Checkbox selection
- [ ] SAVE
- [ ] DELETE
- [ ] Left sidebar
- [ ] Right sidebar

## Vercel Preview

- Preview URL/state: PENDING
- Manual verification result: PENDING

## Rollback point

Last known stable commit / PR / release:
