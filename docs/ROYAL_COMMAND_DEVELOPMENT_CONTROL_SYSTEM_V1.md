# Royal Command Development Control System

Status: OWNER STANDARD, subordinate to `ROYAL_COMMAND_LAW.md`.

## Canonical rules
- Provider execution, branch isolation and direct-master prohibition: `AI_EXECUTION_ISOLATION_RULES.md`.
- UI locks and ownership: `COMMAND_ROOM_UI_SYSTEM.md`.
- Recovery and rollback records: `DAILY_RECOVERY_RULES.md` and `COMMAND_ROOM_STABLE_BASELINE.md`.
- Conflict ownership warnings: `CONFLICT_GUARD_REGISTRY.md`.

This document does not duplicate or override those sources.

## Work boundaries
- Single Writer applies only to the same file or conflicting resource boundary.
- Independent, unowned work may proceed in parallel on isolated branches.
- Shared or conflicting work is serialized or explicitly handed off.
- Each task declares its goal, writable boundary and intentional non-goals; unrelated findings go to backlog.
- Owner-approved locked surfaces change only when explicitly in scope, using the smallest safe modification.

## Risk-proportionate validation
| Class | Required process |
|---|---|
| FAST | Minimum checks able to detect likely failure on the changed surface. |
| STANDARD | Relevant review plus applicable lint, type, tests, build or Preview checks. |
| HIGH-RISK / REGULATED | Full applicable Rule Gate, independent review and Host-verified evidence. |
| Production promotion | Full applicable CI/gates, exact tested-head Preview/smoke evidence and rollback point. |

Do not run every gate or smoke test for unrelated FAST/STANDARD work. A visible control changed by the task must still have its narrow real action path verified.

## Completion
A task is complete only when the requested behavior works, relevant protected behavior remains intact and task-appropriate evidence exists. Production remains unchanged until separately approved. Failed required checks stop only the affected conflicting scope.
