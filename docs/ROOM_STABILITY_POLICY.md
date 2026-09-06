# Royal Command Room Stability Policy

The Command Room must remain stable while execution capabilities evolve.

## Sources of authority
- Provider routing, execution isolation, branches and master restrictions: `AI_EXECUTION_ISOLATION_RULES.md`.
- Shared UI ownership and locked surfaces: `COMMAND_ROOM_UI_SYSTEM.md`.
- Risk classification, evidence, Preview-first and rollback: `../ROYAL_COMMAND_LAW.md`.

Do not duplicate those rules here. When behavior regresses, compare the affected path with its canonical source before adding provider-, country- or component-specific workarounds.

Changes to a protected invariant require explicit scope and the risk-appropriate validation defined by the Law. Full gates are required only when the change is HIGH-RISK/REGULATED or promoted to Production.
