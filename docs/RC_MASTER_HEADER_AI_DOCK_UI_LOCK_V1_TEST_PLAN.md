# RC Master Header / AI Dock UI Lock v1 — Test Plan

## Purpose

Verify that UI safety enforcement protects shared RC Master development surfaces without blocking supported customer configuration.

## Automated checks

1. Change Control must fail when a PR changes a repository file that is not declared under `## Files / components changed`.
2. Change Control must fail when a PR declares a file that is not actually changed.
3. Change Control must continue to require one open Work Queue ticket and the existing PR contract sections.
4. Conflict Guard remains independent and must continue to scan cross-surface ownership conflicts.
5. Quality Gate must continue to run normally.

## Customer configuration non-regression

The safety contract must not prohibit runtime changes made through supported preference/configuration paths, including AI selection/order where supported and language/locale selection.

The guard is a development PR-scope control. It is not a runtime lock on customer choices.

## Manual review

Before merge, verify the safety PR changes only governance/CI files and does not change:

- Header geometry.
- AI button geometry or visuals.
- Room runtime behavior.
- Customer preference values.
- Country Pack / locale runtime configuration.
- Production deployment.

## Rollback

Rollback to `b5e9d715f3fbc526aabfa45bccdeccbdef400ada` for the Production code baseline. The UI Preview candidate `a23a4f298ae947cdb483bd20d75d3a52f1b42cd9` remains separate and unmerged while this guard is reviewed.
