# Royal Command Room Stability Policy

The Command Room must remain stable while execution capabilities evolve.

## Runtime invariants

- `/api/ai/chat/stream` is the one Room AI routing authority.
- Compatibility chat endpoints must delegate instead of duplicating routing logic.
- ChatGPT, Claude, Gemini, and Grok use `/api/dev/agent` for executable GitHub development.
- Each executor uses a provider-isolated `rc-work` branch with host Work ID and Revision.
- No AI or Tool Gateway path may write directly to `master`.
- Provider-specific legacy endpoints may not contain independent GitHub writers.
- Codex specialist analysis may not silently replace the selected provider.
- Production merge/deploy remains approval-gated.

## Regression rule

If a future change causes one AI to execute while another selected AI only reports that it lacks tools, first compare the routing path against these invariants instead of adding provider-specific workaround code.

Any change to these invariants requires an explicit owner-approved execution-control change and full Quality Gate, Conflict Guard, Change Control, and Preview validation.
