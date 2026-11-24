# Joint AI Room entry display repair — 2026-11-24

## Scope and authority
STANDARD, requested by Harry: `/rooms/rca` briefly showed only Final Integrator before the five AI panels appeared. Repair the existing joint-room Preview entry only. Root is the sole code/publish writer; independent Codex reviewer `/root/entry_country_review` reviewed the same diff and reran the DOM suite. No external AI account was used.

Existing repository: `harry2park-afk/RoyalCommandAI`; existing branch: `feat/independent-ai-rooms-v1-20260906`. No production/master or V4 Sites deployment, account/payment/telephone/external message changes. Existing selection, history, clipboard, AI request and integration guards retained.

## Cause and repair
Provider availability started as an empty set. Card `display` required both saved selection and availability, but Final Integrator rendered immediately. The delayed provider-status response therefore replaced the one-panel layout with six panels.

RCA now restores its local selection before revealing the complete grid. Selected cards remain in their positions independently of provider lookup completion. Inputs and sending stay disabled when a provider is unavailable; status says “Checking connection…” while initial lookup is pending. Non-RCA card visibility remains availability-gated as before. The saved-selection readiness is keyed by room so a reused component cannot briefly expose the previous room's selection.

Reviewer findings: room-reuse readiness initially needed a room key (resolved); keying the global provider completion status introduced an old-response race (resolved by keeping that completion boolean global). Final reviewer: no newly introduced blocking defect; independently reran 7/7 DOM tests successfully. Existing provider-response stale-order behaviour was not redesigned and is not claimed fixed.

## Validation
- Opt-in DOM regression: 7/7 PASS on final code. Covers SSR/hydration, delayed availability, rejection, partial availability, saved subset, saved empty selection, reused room entry and HTTP failure. Saved history retained; no live API requests or writes.
- Baseline source substituted through a temporary Vite loader: same suite failed 7/7 at the initial visibility assertion, demonstrating the previous code does not satisfy the regression.
- Existing clipboard / independent receipt / integration eligibility / image-input suite: 15/15 PASS.
- `npm run typecheck`: PASS. Final `npm run build`: PASS, including TypeScript.
- `git diff --check`: PASS.
- Scoped ESLint: NOT PASS. Both original and revised source report the same pre-existing 5 `no-explicit-any` errors and 2 warnings (`no-img-element`, `exhaustive-deps`). No lint configuration or existing checks weakened.
- No new dependencies. DOM QA uses separately available jsdom via `RC_QA_JSDOM`; runner is opt-in and does not change the normal test configuration.

Re-run DOM QA from repository root (provide an installed jsdom path, or omit the variable if jsdom resolves locally):

```sh
RC_QA_JSDOM=/absolute/path/to/jsdom npm exec vitest -- run --config docs/maintenance/qa/joint-ai-entry.config.mts
```

## Source and deployment
- Previous source retained: `b7c92cb225222df362410e1e2ab68b698d9c70ef`.
- Tested application source: `57e42a7924313c27f3f4de960df6b941bcef5f1f`.
- App deployment: `dpl_8cxEd2jZXfkQrf7fLCBqefxRkrB5`, existing Preview project `prj_cJAYeuQdkm2FB2ZbEQc7YkRUUP6L`, production target not used.
- Deployment readiness: **READY**, exact source `57e42a7924313c27f3f4de960df6b941bcef5f1f`, `target: null` (Preview). Existing branch alias assigned successfully.
- Browser verification on that alias `/rooms/rca`: initial AX snapshot had the header/composer with the entire grid hidden, followed by a single complete grid containing ChatGPT, Claude, Gemini, Grok, Codex and Final Integrator. Existing saved questions, answers and integrated answer were present. No AI query was sent, no selection/history was deleted, and no payment/account operation occurred. Live DOM snapshots are sampled observations; the first-visible-render invariant under delayed/failed responses was separately verified by the DOM regression suite.
- Reviewable URL: https://royal-command-ai-git-feat-indep-0be966-harry2park-afks-projects.vercel.app/rooms/rca
- This maintenance report is a subsequent documentation-only source commit; its deployment may have a different ID. Application source and recovery version above identify the tested code exactly.

## Recovery evidence
A `git archive` of the exact application commit was extracted into a separate temporary directory and every tracked file compared byte-for-byte both against Git source and checkout: **949 files, 0 mismatches**.

- Source TAR SHA-256: `104a63713eaff0f0a2e805cde4ab891bc473446eb9baffa8b35eb63c849ad0e5`.
- Existing commits retained; regenerate archive with `git archive --format=tar 57e42a7924313c27f3f4de960df6b941bcef5f1f > source.tar`.
- This is source and bundled basic assets recovery only. It is **not** a full recovery of real R2 designs, browser uploads, databases, customer records, conversations or external AI accounts.
- `docs/maintenance/LATEST.json` points to this report for the next joint-room maintenance task.
