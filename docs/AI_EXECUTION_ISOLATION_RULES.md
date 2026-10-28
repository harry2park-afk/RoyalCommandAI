# Royal Command AI Execution Isolation Rules

Status: Active. Subordinate to `ROYAL_COMMAND_LAW.md`.

## Authority and routing
- ChatGPT, Claude, Gemini and Grok have equal execution authority; no silent substitution.
- `/api/ai/chat/stream` is the shared runtime authority and `/api/dev/agent` is the shared GitHub execution contract.
- Compatibility endpoints delegate: `/api/ai/chat` → stream; `/api/dev/gemini` → dev agent as `google`.
- `/api/builder` is an explicit Codex analysis-only path and has no GitHub writer.

## Isolation
- A single-AI order runs only that provider; explicit multi-AI orders run only the named providers.
- Each executor writes only to its isolated branch: `rc-work/<work-id>/<provider>-rev-<revision>` or an approved equivalent.
- Never write directly to `master`; Production merge/deploy requires separate approval.
- Concurrent providers never write the same shared branch. Conflicts are reviewed and resolved before merge.
- Reassignment requires explicit user authorization.

Provider IDs: `openai`, `anthropic`, `google`, `xai`.

## Evidence and validation
- Every write carries Host-verified Work ID, Revision, provider and Room ID when applicable.
- Inspect affected resources, dependencies, active work, validation and rollback before writing.
- After writing, run only the risk-relevant lint/type/test/build, interface, Preview, compatibility, data, security and conflict checks.
- Commit, PR, deployment and completion claims require Host/GitHub evidence. Known material failures prevent safe completion.
- Completion records include branch, changed resources, commit/PR evidence, validation, deployment state and remaining risks.

## Boundaries
- Read-only requests remain outside execution.
- “Do not merge/deploy” does not cancel requested safe Preview-branch work.
- Tool Gateway writes use the same metadata and isolated-branch contract and reject anonymous or direct-master writes.
- The newest approved user order controls scope only where it does not conflict with higher law or safety requirements.
