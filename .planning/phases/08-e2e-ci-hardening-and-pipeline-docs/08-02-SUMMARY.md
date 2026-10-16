---
phase: 08-e2e-ci-hardening-and-pipeline-docs
plan: 02
subsystem: ci
tags: [github, stacked-prs, ci, e2e]
requirements-completed: [QA-03, QA-04]
completed: 2026-10-16
---

# Phase 8 Plan 02: Stacked phase PRs, all green Summary

Six stacked PRs (Phases 2-7) were opened, and each one passed check, words and e2e on its own code with 0 failed and 0 flaky. No fixes were needed.

## Owner decisions (Task 1, answered "as-locked", recorded verbatim)

- Q1 working tree: "Restore all". Ran `git checkout -- eslint.config.js .planning/research/FEATURES.md src/state/gameStore.ts`. Tree was clean afterwards (autocrlf=true, no residual diff).
- Q2 PR #3: "Force-push to 32e2175". Phase 3 was pushed at c49138a first, then `--force-with-lease=phase-02/playable-normal-game:c49138a` was used. PR #3 now has head 32e2175 (59 commits).
- Q3 Phase 6: "Land as-is". Phase 6 lands at c15dcfb. Open 06-07 items (iPhone share sheet, live dictionary, win feel; no 06-VERIFICATION.md) are noted in its PR body. Phase 5 CR-01 is noted for awareness in the Phase 5 PR body.
- Merge authorisation: "Yes, merge when green" (applies to plan 08-03; nothing was merged here).

## PR chain

| Phase | Branch | End SHA | PR | Base |
|-------|--------|---------|----|------|
| 2 | phase-02/playable-normal-game | 32e2175 | #3 | main |
| 3 | phase-03/wordubado-mode-and-slang | c49138a | #4 | phase-02/playable-normal-game |
| 4 | phase-04/six-boards-and-persistence | 449ed23 | #5 | phase-03/wordubado-mode-and-slang |
| 5 | phase-05/stats-streaks-and-restore | ecd554d | #6 | phase-04/six-boards-and-persistence |
| 6 | phase-06/result-screen-share-and-definitions | c15dcfb | #7 | phase-05/stats-streaks-and-restore |
| 7 | phase-07/themes-accessibility-and-polish | 01f6bae | #8 | phase-06/result-screen-share-and-definitions |

## CI results

| PR | Run id | check | words | e2e | e2e job time | Playwright | Flaky |
|----|--------|-------|-------|-----|--------------|-----------|-------|
| #3 | 38925410294 | pass | pass | pass | 57s | 28 passed (22.7s) | 0 |
| #4 | 38925754149 | pass | pass | pass | 1m17s | 66 passed (29.2s) | 0 |
| #5 | 38925762568 | pass | pass | pass | 1m37s | 126 passed (1.1m) | 0 |
| #6 | 38925770198 | pass | pass | pass | 2m36s | 250 passed (2.1m) | 0 |
| #7 | 38925776937 | pass | pass | pass | 5m08s | 382 passed, 14 skipped (4.5m) | 0 |
| #8 | 38925785777 | pass | pass | pass | 5m45s | 437 passed, 15 skipped (5.2m) | 0 |

Vercel preview checks also passed on every PR. Max e2e is 5m45s, well under the 15 minute timeout, so for D-08 sharding is not forced by time.

## Fixes made

None. No fix commits, so nothing was carried forward by merge.

## Deviations / notes

- A first PR-creation call timed out because of a hung `python3` heredoc (Windows stub); no PRs were created by it, and the PRs were created in a second call.
- The 14 and 15 skipped tests in PR #7 and #8 are pre-existing skips in the test code (not added by this plan). Worth a look in 08-04.
- Local branch phase-02/playable-normal-game was not pushed; remote stays at 32e2175.

## Self-Check: PASSED
PRs #3 to #8 listed with correct bases; all required checks pass.
