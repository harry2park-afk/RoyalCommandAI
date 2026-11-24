# Joint AI room desktop grid — 2026-11-24 (Australia/Sydney)

Owner request: display the existing joint AI room in a readable 3-column × 2-row desktop workspace, instead of one long vertical column. Only the assigned Writer edited and published. This is the existing V4-linked V3 Preview room, not the V4 Sites source or the production/master deployment.

## Scope and changes
- Route: `/rooms/rca`; existing five providers plus Final Integrator, six panels total. No sixth provider was enabled.
- Wide desktop: three columns and two rows. Medium widths 701–1099px: two columns; narrow phones: one column. Short/narrow displays retain scrolling to keep text readable.
- Compact shared question, individual questions on their own full-width row, bounded long drafts, independently scrollable answer areas.
- Existing answer click/keyboard expansion opens a fixed large panel; Collapse/Escape returns to the grid. Existing Open/full history remains available.
- Help opens below the compact composer so it stays within the viewport.
- Preserved provider connection/send logic, histories, image clipboard handling and integrator. No live AI sends, billing/payment, database, customer account, external messages, V4 source or master/production changes.

## Source, deployment and recovery
- Previous source: `5746e31699b2e9128c2fd4944798208b1fca2b8c`.
- Previous READY Preview: `dpl_CTiEXY2PxrL9V3JWEny4jknQ5p3D`.
- Grid source: `b29dd1dccb216eba60823755bd379abe083d46db`; READY Preview `dpl_CpnvcDrtZeyE1PdgzYoGZc7568rM`.
- Final code source including helper correction: `d0d9b4bc5154bf52f216a91a7defc9fa687ecf6e`.
- Final code deployment: `dpl_DbxMr4hWN48m4uKBeA9etJon6jmb`; READY (exact source SHA verified by deployment API).
- Existing Preview branch: `feat/independent-ai-rooms-v1-20260906`.
- URL: https://royal-command-ai-git-feat-indep-0be966-harry2park-afks-projects.vercel.app/rooms/rca
- Publication used expected-head leases; each remote head matched before update. No force overwrite.
- Restored final-code git archive into a temporary directory and byte-compared all 943 tracked files with the tested checkout: 0 mismatches.
- Archive SHA-256: `910fcf611cce29fa8ac688daa4f1421e631f68b3a7c48cc973e645d628dc3630`.
- Recovery covers tracked source and basic assets only. It does not restore actual R2 designs, browser uploads, customer data, databases, payment state or external accounts. Earlier commits remain retained. This is not an owner-approved STABLE baseline.

## Verification
- `npm ci --ignore-scripts --no-audit --no-fund`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed, including the final helper correction.
- `git diff --check`: passed.
- Four regression test files (composerClipboard, independentReceipt, integrationEligibility, independent/image-input): 15 tests passed.
- File-scoped ESLint: NOT a full pass. Five existing no-explicit-any errors and two warnings match the original source exactly; no new lint errors. No rules weakened and no unrelated cleanup.
- Actual browser at 1363 × 936: all six panels fit inside the viewport, at columns x=8/460/912 and rows y=186/562, final bottom=928; document dimensions equal viewport, no page overflow.
- Existing stored questions/answers and Chat History titles remained visible. Open Claude displayed both prior exchanges; return restored the grid.
- Native PNG Ctrl+V succeeded independently in the shared input and all five individual inputs. Removed only the six test draft attachments afterward. No images sent to AI.
- 15-line individual question draft capped at 64px with internal scrolling; test draft cleared.
- Answer click expansion, Collapse, Enter expansion and Escape collapse passed.
- Helper correction post-deployment visual check: passed on final code Preview: panel top=177, bottom=361 at 1363×936, fully visible; closed it and returned the completed six-panel view..

## Independent AI review
Reviewer: separate Codex `joint_grid_review`, actual response received. Reviewer read the code diff and original/final check logs independently; browser evidence was run by the Writer and supplied to the reviewer, not separately reproduced by the reviewer.

Findings resolved: one-column CSS override, compressed card input, oversized drafts/attachments, expanded cards stretching the grid, and helper above the viewport. No remaining code blocker identified. Remaining limits: no live AI request/payment test; exact 1920×1080, 1366×768 and physical Galaxy Tab sizes not separately exercised; narrow/short screens may scroll. User acceptance remains pending.
