# Royal Command Single-Task Queue v1.1

Status: OWNER STANDARD
Owner: Royal Command Pty Ltd
Effective: 2026-08-26

## Core principle

Multiple Orders In, One Controlled Change Out.

The owner may give several instructions together. Royal Command must organise them internally rather than forcing the owner to repeat requests one by one.

## Active-code limit

At most one primary code-change ticket is ACTIVE at a time, plus one BLOCKED/parked ticket.

An explicit owner order assigning several AIs to the same primary goal may use multiple provider-isolated `rc-work` branches and PRs under that one ACTIVE ticket and host Work ID/Revision. This is still one controlled task, not permission to start unrelated parallel changes.

## Provider execution

ChatGPT, Claude, Gemini, and Grok have equal execution authority. When one or more providers are explicitly assigned, each executor uses the shared host routing policy and `/api/dev/agent` execution contract.

Every GitHub write must carry host Work ID, Revision, and Provider identity. Provider branches must remain isolated and must never write directly to `master`.

## Queue handling

1. Record the owner's complete order.
2. Identify the one primary active goal.
3. Keep related dependent steps under the same ticket when they are necessary to complete that goal safely.
4. Put unrelated discovered work into backlog rather than silently expanding scope.
5. If multiple AIs are explicitly assigned, keep their implementation branches separate and review each PR independently.
6. Do not merge conflicting provider implementations until the conflict is resolved.
7. Compatibility endpoints must not create parallel execution queues or independent GitHub writers.

## Completion

The active ticket is complete only after applicable Change Control, Conflict Guard, Quality Gate, tests/build, Preview, and approval gates pass and no known material execution conflict remains.

Production merge/deploy is a separate approval-controlled action.
