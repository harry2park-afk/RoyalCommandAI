# Royal Command AI Execution Isolation Rules

Status: current Royal Command operating rule.

## Equal execution authority

ChatGPT, Claude, Gemini, and Grok have equal execution authority. No provider is the permanent primary, backup, or subordinate executor.

## One host routing authority

Executable development intent is classified by one shared Royal Command routing policy. The Room streaming endpoint is the runtime authority; compatibility endpoints must delegate to it instead of maintaining their own intent rules.

All four providers use the same `/api/dev/agent` GitHub execution contract. Provider-specific compatibility endpoints must not contain an independent GitHub writer.

## Single-AI and explicit multi-AI orders

A user may assign one AI or explicitly assign several of the four AIs.

- A single-AI order is executed only by that named provider.
- An explicit multi-AI order such as “4 AI 모두 작업하세요” may execute all named providers.
- Each provider must use its own isolated provider branch under the same host Work ID and Revision.
- No provider may write directly to `master`.
- Production merge/deploy remains separately approval-gated.

A phrase scoped to other providers, such as “Gemini만 실행 담당, 다른 AI는 검토만”, must not cancel the named provider's execution.

## Provider branch isolation

Executable GitHub work uses branches shaped like:

`rc-work/<work-id>/<provider>-rev-<revision>`

or an equivalent provider-scoped `rc-work` branch for an approved Tool Gateway write.

Provider IDs are:

- `openai` — ChatGPT
- `anthropic` — Claude
- `google` — Gemini
- `xai` — Grok

A provider may never silently substitute another provider as the executor. A failure is reported as that provider's failure unless the user explicitly authorises reassignment.

## Collision prevention for multi-AI work

Multiple AIs may investigate or implement the same user goal only on isolated provider branches. They must never make simultaneous writes to the same shared branch or directly to production.

Each provider PR is independently reviewable. Conflicting implementations must be resolved before merge; one provider's branch must not overwrite another provider's in-progress branch.

When the user assigns distinct scopes, each provider must remain inside its assigned scope.

## Mandatory Work metadata

Every executable GitHub write must carry host-verified:

- Work ID
- Revision
- Provider identity
- Room ID when the work originated in a Room

Commit and PR evidence must be derived from the host/GitHub response, never invented by a model.

## Mandatory preflight risk check

Before making any change, the assigned provider must inspect the current state and decide whether the requested work can create an error, regression, conflict, deployment failure, data-loss risk, security problem, broken dependency, or later maintenance problem.

The provider must check affected files/resources, dependencies, interfaces, existing work, likely build/type/test impact, deployment impact, and rollback path before writing.

If a material error or conflict is likely, stop before changing anything and report the issue and safest corrective action.

## Mandatory post-fix validation

After a change, the provider must re-check the changed work for immediate errors and foreseeable future problems. Where applicable, verify lint, typecheck, unit tests, build, affected interfaces, deployment preview, backward compatibility, data integrity, security implications, and conflicts.

A task must not be reported as safely complete while a known material validation failure remains.

## Read-only requests

Read-only inspection, explanation, diagnosis, review, or requests explicitly saying code/file changes must not occur remain outside the developer execution path.

Safety gates such as “do not merge to production” or “do not deploy” do not cancel safe-branch development when the user clearly requested code changes.

## Compatibility endpoints

Compatibility paths must never carry a second execution policy:

- `/api/ai/chat` delegates to `/api/ai/chat/stream`.
- `/api/dev/gemini` delegates to `/api/dev/agent` with provider `google`.

If a new provider-specific endpoint is added later, it must be an adapter to the shared execution authority unless a separate specialist mode is explicitly approved.

## Tool Gateway GitHub writes

The Shared Tool Gateway must follow the same Work ID + Revision + Provider branch contract. It must reject GitHub file writes without valid host Work metadata and must not create anonymous timestamp-only branches or write directly to `master`.

`rc-work/**` pushes are handled by the shared RC Work PR automation so ChatGPT, Claude, Gemini, Grok, Codex-specialist, and approved gateway writes receive consistent Queue/PR controls.

## Codex Builder role

The Codex Builder may remain available as an explicit OpenAI/Codex specialist compatibility path, but it is not the universal RC Room executor and must not override the selected provider. Normal RC Room provider execution is owned by the shared four-provider developer-agent path.

## Completion record

Each provider records its execution result, provider branch, changed files/resources, commit IDs, PR evidence, validation performed, deployment status if any, remaining risks, and completion/failure state under the host Work ID and Revision.

The newest approved user order supersedes older execution rules where they conflict with this document.
