# RC Master Header / AI Dock UI Lock v1 — Rollback Record

## Pre-change Production baseline

- Branch: `master`
- Commit: `b5e9d715f3fbc526aabfa45bccdeccbdef400ada`
- Restore branch: `restore/2026-09-03-before-ui-lock-v1`

## Approved UI Preview candidate kept separate

- Commit: `a23a4f298ae947cdb483bd20d75d3a52f1b42cd9`
- PR: #647
- Status at guard creation time: open / not merged

## Rule

The safety-guard branch must not move Production. If governance/CI changes are rejected, close the safety PR and leave `master` unchanged.
