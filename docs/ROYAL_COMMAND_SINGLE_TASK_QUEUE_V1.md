# Royal Command Single-Task Queue v1.0

Status: OWNER STANDARD
Owner: Royal Command Pty Ltd
Effective: 2026-08-19

## Core Principle

**Multiple Orders In, One Controlled Change Out.**

The owner may submit many requests at once. Royal Command must split those requests into independent work items, prioritize them, and execute code changes one controlled task at a time.

## 1. Intake

A single owner message may contain multiple requests. Do not force the owner to repeat them one by one.

Each independent requested outcome becomes a Change Ticket.

Each ticket must record:
- one primary task;
- priority;
- affected area;
- locked surfaces touched;
- dependencies;
- risk level;
- definition of done;
- rollback point.

## 2. Work Queue States

Allowed states:
- BACKLOG
- READY
- ACTIVE
- VERIFYING
- BLOCKED
- DONE

There may be only **one ACTIVE code-change ticket** for Command Room at a time.

A BLOCKED ticket does not authorize starting another conflicting code-change ticket unless it is explicitly parked.

## 3. Execution Rule

For each ACTIVE ticket, use this sequence:

1. Confirm the single primary goal.
2. Identify impact surface and locked surfaces.
3. Create one branch.
4. Make only the change required for that goal.
5. Run automated checks.
6. Obtain Vercel Preview.
7. Run applicable smoke tests.
8. Merge only after verification passes.
9. Confirm Production READY.
10. Mark ticket DONE, then activate the next ticket.

## 4. Parallel Work Exception

Parallel work is allowed only for tasks that cannot change the same runtime behavior, such as:
- research;
- read-only review;
- documentation;
- independent analysis.

Parallel code modifications are prohibited when they touch the same page, component, state, API flow, CSS surface, database behavior, deployment behavior, or locked UI.

## 5. Batch Exception

Small related changes may be one Batch Ticket only when all of the following are true:
- they share one user-visible goal;
- they can be tested together;
- they can be rolled back together;
- they do not cross unrelated locked surfaces;
- the PR explicitly says `Batch exception: YES` and explains why.

Otherwise: `Batch exception: NO`.

## 6. Failure / STOP Rule

If verification fails:
1. stop the ticket;
2. do not merge;
3. do not start the next conflicting ticket;
4. repair or revert only the failing change;
5. re-run checks;
6. continue only after PASS.

If Production breaks a locked/core flow, follow the rollback rule in `ROYAL_COMMAND_DEVELOPMENT_CONTROL_SYSTEM_V1.md`.

## 7. Pull Request Contract

Every code PR must link exactly one Change Ticket and contain:
- Work Queue Ticket;
- Primary task;
- Batch exception;
- Goal;
- Files/components changed;
- Locked surfaces touched;
- Explicit non-goals;
- Verification plan;
- Automated check status;
- Vercel Preview status;
- Rollback point.

The Change Control workflow validates the required contract. A PR that does not satisfy it must remain unmergeable by process.

## 8. Owner Approval and LOCK

Owner approval such as “good”, “correct”, or “complete” locks that approved surface. The next ticket may not alter it unless the new ticket explicitly targets that surface or repairs a verified defect.

## 9. Queue Ordering

Default priority:
1. Production regression / broken core flow
2. Security / data-loss risk
3. Blocker preventing current work
4. Owner-requested active feature/fix
5. Technical debt / refactor
6. Cosmetic improvement

## 10. Current Operational Rule

Until a dedicated project-board automation is introduced, GitHub Issues are the authoritative Change Tickets and PRs are the authoritative execution units.

A new code PR must not be treated as ACTIVE unless it links its Change Ticket and passes the Change Control contract.