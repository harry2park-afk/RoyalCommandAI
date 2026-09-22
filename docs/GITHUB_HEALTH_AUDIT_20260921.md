# GitHub connection and RC repository audit — 2026-09-21

Status: diagnosis and local repair verified. Remote application blocked by connection/authentication. No master, branch protection, customer data, credentials, or hosted services changed.

## Confirmed independent failures

| Layer | Evidence | Conclusion |
|---|---|---|
| ChatGPT connector bridge | GitHub fetch, fetch_file, get_profile and Plugin Management get_app_permissions all return HTTP 400 `Invalid MCP request metadata` | Failure occurs at the connector transport. Repository CI and repository rules cannot repair this bridge error. Root cause inside the bridge is not observable here. |
| Git HTTPS authentication | Public clone/fetch/ls-remote succeed; push reports `could not read Username ... No such device or address`. No configured credential helper/extra header and no GitHub CLI found. | Public read access is not authenticated write access. Do not invent credentials, lower protection, or infer that the owner's GitHub account lost permissions. |
| PR #748 CI | Run 35664862803 annotation: `Scanner could not complete: spawnSync git ENOBUFS. Enforcing mode fails closed.` | Actual scanner defect: sync git output exceeds its default buffer. |
| Rule documentation | CONFLICT_GUARD_REGISTRY.md said WARNING ONLY while CI supplies STRICT=1 | Documentation was stale; actual enforcement remains required. |

GitHub public repository/API reads succeeded. GitHub's status page reported all systems operational at review: https://www.githubstatus.com/ . This does not establish health of the ChatGPT connector bridge.

## Exact repository evidence

- Repository: https://github.com/harry2park-afk/RoyalCommandAI
- Preview branch head: `4bc15820515f05a516bd78c88e369e5acba71bdb`.
- Master read-only head: `33da2a917dc6adcf266f59f0b27d18a56f1271d8`.
- PR #748 is open/draft, targets `feat/rc-command-center-control-plane-v1-20260906`, not master.
- PR base: `0f97c4f41338be9e60e71bddf10709c633da37ca`.
- 238 commits / 439 changed files. Relevant JS/MJS/TS/TSX diff measured 1,205,829 bytes (>1 MiB).
- Recent 20 sampled runs on this branch: 10 Conflict Guard failures and 10 Domain Gate successes. No claim about all historical runs.
- Failure evidence: https://github.com/harry2park-afk/RoyalCommandAI/actions/runs/35664862803 . Failed scan lasted about one second; job about twelve seconds. This is a crash, not prolonged computation.
- Master protection applies to the default branch and requires Conflict Guard, Change Control and Quality Gate. It does not explain connector failures or this Preview push-authentication failure.
- An unrelated launch branch's run 35665033427 failed at `Fail closed on unresolved Hosted ledger drift`; it is not an RC V3 toolbox failure. No database changes attempted.

## Implemented local repair

1. Stream git diff output line-by-line; keep per-file match flags rather than the full diff. Preserve strict clean/conflict/scanner-failure exits 0/1/2.
2. Parse file headers only before hunks. Added template content cannot impersonate an allowed owner path.
3. Handle Korean filenames with Git quotePath=false and escaped-path decoding.
4. Cancel stale Conflict Guard runs per PR and bound runs to five minutes.
5. Correct the rule document to reflect actual enforcing behavior. No safety gate was disabled.

Verified: original selftests plus >1MiB clean diff, conflict at end of large diff, forged header inside source, and Korean filename regressions. Targeted ESLint and diff whitespace checks passed. Independent reviewer confirmed parser findings resolved.

The repaired scanner processes the exact PR diff completely and exits 1 with four findings, rather than crashing with exit 2:

| Finding | Inspection | Remaining disposition |
|---|---|---|
| CustomerAISecretary.tsx: Chat scroll | Scrolls its own `chatListRef` when chat length/tab changes | Review its independent viewport ownership; not proof of shared chat takeover. |
| CustomerAISecretary.tsx: forced scrollTo | Same local scroll operation, counted again by generic DOM rule | Duplicate diagnostic category for the same operation; review together. |
| RoomPreferenceAuthority.tsx: Compact AI dock | Legacy preferences authority reads/writes selections and reconciles buttons; new warehouse exclusions also mention selectedAi | Requires explicit ownership review, not a blanket exemption. V3 routes do not match this component's `/rooms/` matcher. |
| HelpText.tsx: Language picker | Observes selected-language storage/event changes to refresh its own translation | Apparent lexical false positive; do not designate the helper as picker owner or disable checks globally. |

No claim that PR #748 is green. These findings remain separate from the repaired scanner crash.

## Speed and coverage review

- Quality Gate runs install/typecheck/all tests/build for every eligible master-targeted PR, including documentation-only changes. A trusted changed-path FAST branch can reduce unnecessary work, but was not introduced or claimed here.
- Domain HIGH Gate repeats typecheck/tests/build also performed by Quality Gate when both apply. Consolidate only with exact-head evidence sharing, not cached results from unrelated commits.
- PR #748 targets a feature branch, so master-only Quality Gate does not cover it. A successful Domain Gate is not evidence of a successful application build. Define a scoped Preview quality job before treating the Preview as verified.
- Change Control's required PR sections apply to non-draft master-targeted PRs. They are not the observed #748 connector/scanner failure.
- Keep production protection, ownership, tenant isolation and failure checks. Do not remove safeguards solely to obtain a green status.
- Toolbox's new local inventory gate verifies registration only; full implementation and live service verification must remain distinct.

## Finish after connection recovery

Restore the existing authenticated connector session through its supported connection flow; an app/platform repair may be needed if metadata errors persist. Do not request raw tokens in chat. Re-test read access, then write only to the authorized Preview branch with fresh remote-head comparison. Apply local commits without force, rerun exact-head CI, resolve the four ownership findings with source evidence, then verify the Preview and actual toolbox actions. No Production promotion is authorized by this audit.

Toolbox work is preserved in local commit `7f5694b`; its constraints and local fixture results are in `docs/rcv3/TOOLBOX_IMPLEMENTATION_STATUS.md`. It has not been pushed or deployed.
