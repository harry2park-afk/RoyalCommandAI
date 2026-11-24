# Royal Command Room Sources of Truth

## Runtime source
The active Command Room UI is the source-rendered implementation under `src/app/rooms/[id]`. Approved surfaces must not be silently overridden by helper scripts or unrelated changes.

## Governing sources
- Provider execution, routing ownership, branch isolation and master prohibition: `AI_EXECUTION_ISOLATION_RULES.md`.
- UI ownership and locks: `COMMAND_ROOM_UI_SYSTEM.md`.
- Risk, security, tenant isolation, evidence, Preview-first and rollback: `../ROYAL_COMMAND_LAW.md`.
- Recovery evidence: `DAILY_RECOVERY_RULES.md`.

These canonical documents control; this file does not restate their rules.
