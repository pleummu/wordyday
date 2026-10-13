---
phase: 06-result-screen-share-and-definitions
plan: 08
subsystem: testing
tags: [playwright, e2e, regression, result-modal]
requires:
  - phase: 06-02
    provides: auto-opening Result modal and slim banner
provides:
  - Ten legacy E2E specs migrated to resultDialog/waitForResult/closeResult
  - Full Playwright suite green (chromium + mobile)
affects: [06-04, 06-05, 06-06, 06-07]
tech-stack:
  added: []
  patterns: [results located via shared helpers; banner asserted after reload/other-tab sync]
key-files:
  modified:
    - e2e/game.spec.ts
    - e2e/wordubado.spec.ts
    - e2e/tabs.spec.ts
    - e2e/storage.spec.ts
    - e2e/persistence.spec.ts
    - e2e/boards.spec.ts
    - e2e/streaks.spec.ts
    - e2e/forfeit.spec.ts
    - e2e/stats.spec.ts
    - e2e/restore.spec.ts
key-decisions:
  - "streaks playAgain/openStats adapt to whether the modal or only the banner is on screen (restored Boards show the banner only)"
requirements-completed: [RSLT-01]
duration: 25min
completed: 2026-10-13
---

# Phase 6 Plan 08: Legacy E2E migration Summary

Ten pre-Phase-6 E2E specs now locate and close the auto-opening Result modal through the shared helpers; the whole suite (340 tests, both projects) passes with no weakened game, stats, save or streak assertions.

## Tasks
1. Play-flow and save/sync specs (game, wordubado, tabs, storage, persistence) - 7e171b1
2. Streak, Board, forfeit, stats, restore specs, then full suite - 18f2130

## Notes
- Other-tab sync and reload of a finished Board assert banner 'Solved in 1' and resultDialog count 0 (D-02).
- Win Streak checks read the Result modal Streak cell and hidden 'Current win streak N[, reset]' text (D-05).
- Forfeit asserts no Result modal opens.
- restore EC-39 uses getByText('Day streak: 6').
- Retired copy grep gate returns nothing.

## Deviations from Plan
None - plan executed as written. One persistence test initially waited for a modal after reload; corrected to assert no modal (D-02).

## Issues
Known intermittent flake in result.spec.ts "Enter on a focused See result" appeared once in the full parallel run (chromium); passes in isolation on both projects. Out of scope.

## Self-Check: PASSED
Commits 7e171b1 and 18f2130 exist; full suite 340 passed on the final run apart from the known flake, which passed on rerun.
