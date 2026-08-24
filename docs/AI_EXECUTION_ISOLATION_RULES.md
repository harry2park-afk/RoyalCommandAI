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

## Mandatory preflight risk check

Before making any change, the assigned AI must first inspect the current state and decide whether the requested work can create an error, regression, conflict, deployment failure, data-loss risk, security problem, broken dependency, or later maintenance problem.

The AI must check the affected files/resources, dependencies, interfaces, existing active work, likely build/type/test impact, deployment impact, and rollback path before writing.

If a material error or conflict is likely, STOP before changing anything and send an ERROR SIGNAL. The signal must state the suspected problem, what would be affected, why execution was stopped, and the safest next corrective action.

Do not continue merely because the requested change is possible. Safe execution requires both immediate correctness and reasonable protection against foreseeable downstream problems.

## Collision prevention

Before execution, the assigned AI must identify the files/resources it intends to change. If the order overlaps with another active AI assignment, stop before writing and report the conflict.

Do not make simultaneous edits to the same file or resource from different AI orders. Do not overwrite, revert, merge, or reformat another AI's in-progress work.

## Mandatory post-fix validation

After a change is made, the assigned AI must not simply report completion and leave.

It must re-check the changed work for immediate errors and foreseeable future problems. Where applicable, verify type/build/test results, affected interfaces, dependent routes/modules, deployment status, backward compatibility, data integrity, security implications, and whether the fix creates a new conflict elsewhere.

If the fix creates or is likely to create another problem, the assigned AI must correct that problem within its authorised scope before declaring completion.

If the AI cannot safely correct the remaining risk within its scope, it must NOT mark the work complete. It must send an ERROR SIGNAL / ESCALATION REPORT describing the unresolved risk and stop further execution.

## Cooperative diagnosis without shared execution

When an unresolved problem requires wider expertise, the assigned AI may request diagnostic opinions from the other AIs, but the other AIs must not modify the same active work item.

The other AIs may analyse, review, propose solutions, identify risks, or recommend a repair plan. Actual execution remains with the single assigned AI unless Harry issues a new separate order transferring or splitting responsibility.

If a safe solution cannot be established, all execution stays stopped until Harry approves a new plan.

## Separate orders

When Harry wants several AIs working in parallel, he must give separate orders, for example:

- ChatGPT: Task A only.
- Claude: Task B only.
- Gemini: Task C only.
- Grok: Task D only.

Each order has its own Work ID and Revision record. A provider must report only the Work ID belonging to its current assigned order.

## Completion record

Each AI records its own execution result, changed files/resources, commit IDs if any, deployment status if any, validation performed, remaining risks if any, and completion/failure state under its own Work ID.

A task may be marked complete only when the assigned AI has completed the required post-fix validation and no known material unresolved risk remains.

These isolation and safety rules override older instructions that allowed automatic developer-agent failover, shared execution of one task, multiple AIs changing the same work item, or completion without post-change validation.
