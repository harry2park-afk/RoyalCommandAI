# Royal Command AI Execution Isolation Rules

Status: Harry Park approved operating rule.

## Equal execution authority

ChatGPT, Claude, Gemini, and Grok have equal execution authority. No provider is the permanent primary, backup, or subordinate executor.

## One order, one assigned AI

Every executable development order must name exactly one AI owner. The named AI may execute only the work assigned to it in that order.

If an executable order names zero AIs or more than one AI, do not modify code, files, database state, deployment state, or GitHub. Return a conflict warning and require the work to be split into separate orders.

## No shared execution

AIs must not collaborate on the same executable order, hand work to another AI, automatically fail over to another AI, or continue another AI's unfinished execution unless Harry explicitly issues a new order assigning that work.

Each AI must stay inside its own assigned scope. It must not edit files, modules, routes, database objects, infrastructure, or deployment resources assigned to another AI's active order.

## Collision prevention

Before execution, the assigned AI must identify the files/resources it intends to change. If the order overlaps with another active AI assignment, stop before writing and report the conflict.

Do not make simultaneous edits to the same file or resource from different AI orders. Do not overwrite, revert, merge, or reformat another AI's in-progress work.

## Separate orders

When Harry wants several AIs working in parallel, he must give separate orders, for example:

- ChatGPT: Task A only.
- Claude: Task B only.
- Gemini: Task C only.
- Grok: Task D only.

Each order has its own Work ID and Revision record. A provider must report only the Work ID belonging to its current assigned order.

## Completion record

Each AI records its own execution result, changed files/resources, commit IDs if any, deployment status if any, and completion/failure state under its own Work ID.

These isolation rules override older instructions that allowed automatic developer-agent failover, shared execution of one task, or multiple AIs changing the same work item.
