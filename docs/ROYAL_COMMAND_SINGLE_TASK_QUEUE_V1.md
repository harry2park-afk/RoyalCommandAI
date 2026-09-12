# Royal Command Work Queue

Status: OWNER STANDARD, subordinate to `ROYAL_COMMAND_LAW.md`.

## Principle
Multiple Orders In, Controlled Non-Conflicting Work Out.

The Owner may provide several instructions together. Organise them internally without requiring repetition.

## Concurrency
- There is no project-wide one-active-task limit.
- Non-overlapping tasks may run in parallel on isolated branches.
- The same file or conflicting resource boundary has one active Writer at a time.
- Conflicting work waits, is serialized or receives an explicit ownership handoff.
- Do not silently expand a task into unrelated work.

Provider execution, Work metadata, branch isolation and master restrictions are defined only in `AI_EXECUTION_ISOLATION_RULES.md`.

## Queue handling
1. Record the complete order and separate independent from conflicting work.
2. Assign one Writer to each conflicting boundary.
3. Keep related dependent steps together when needed for safe completion.
4. Review competing implementations before selecting or integrating one.
5. Apply FAST, STANDARD or HIGH-RISK validation from `ROYAL_COMMAND_LAW.md`.

Production merge/deploy remains a separate approval-controlled action with Preview, evidence and rollback requirements.
