---
phase: 05-stats-streaks-and-restore
plan: 02
subsystem: persistence, two-tab sync
tags: [zustand, merge, two-tabs, vitest, qa-02]
requires:
  - phase: 05-stats-streaks-and-restore
    provides: v2 SaveDoc, recordResult ledger
provides:
  - mergeBoardStats, mergeStats, pickStreak total-order merges
  - applyExternal merging stats and the streak slice (D-20)
  - streakRev bump on reset
  - QA-02 tagged unit coverage
affects: [05-03, 05-04, 05-05, 05-06, 05-07, 05-08]
key-files:
  modified: [src/logic/save.ts, src/state/gameStore.ts, src/state/twoTabs.test.ts, src/logic/save.test.ts, src/state/gameStore.test.ts, src/state/storage.test.ts, src/logic/score.test.ts, src/logic/pickAnswer.test.ts]
key-decisions:
  - "Stats are picked per Board (higher played, tie by smaller JSON), never summed"
  - "Streak slice follows higher streakRev; reset sets streakRev to previous + 1 so stale pre-reset documents lose"
requirements-completed: [STRK-01, STRK-02, QA-02]
duration: ~12 min
completed: 2026-10-05
---

# Phase 5 Plan 02: Two-tab merge and QA-02 audit Summary

Pick-one merges for per-Board stats and the Day Streak slice in applyExternal, so two tabs finish a game once and converge; QA-02 unit coverage tagged and completed.

## Tasks

| Task | Commit |
|------|--------|
| 1. Failing D-20 tests (written alongside the merge; committed first) | acb91a3 |
| 2. mergeStats/pickStreak and applyExternal integration | 3dde317 |
| 3. QA-02 audit | 1ff82a8 |

## QA-02 coverage

| Item | File | Title |
|------|------|-------|
| Scoring worked examples | src/logic/score.test.ts | R-SCORE-2 ABBEY/BABES; R-SCORE-3 SPEED/ERASE |
| Scoring at 4, 6, triples | src/logic/score.test.ts | QA-02 scoring at length 4 / length 6 / with triple letters |
| 75/25 over 10,000 draws | src/logic/pickAnswer.test.ts | QA-02 draws slang about 75% of the time over 10000 seeded draws (asserts 7300 to 7700) |
| Give Up forfeit | src/state/gameStore.test.ts | QA-02 R-FORFEIT-4 Give Up counts as a played loss and resets the Win Streak |
| Forfeit (New game) | src/state/gameStore.test.ts | QA-02 R-FORFEIT-4 a Forfeit counts as a played loss and adds to gaveUp (D-07) |
| Forfeit eligibility | src/logic/save.test.ts | QA-02 R-FORFEIT-6 exactly 2 tries left; fresh Board cannot be abandoned |
| Storage round-trip | src/state/storage.test.ts | QA-02 round-trips a v2 document |
| v1 to v2 migration | src/state/storage.test.ts | QA-02 D-18 a v1 envelope in storage is read as the v2 document |
| Corrupt backup and notice | src/state/storage.test.ts | QA-02 backs up %s and notices corrupt once |
| Throwing getItem / setItem | src/state/storage.test.ts | QA-02 survives a throwing getItem; QA-02 never throws on a throwing setItem... |

Most items already existed; only titles were tagged, and the Give Up test was strengthened to start from a prior win.

## Deviations from Plan

**1. [Rule 1] Existing test expected streakRev 0 after reset**
- gameStore.test.ts "resetAll and applyExternal(null) restore the empty slices" now expects the bumped streakRev (4 from 3), as the plan requires. Commit 3dde317.

**2. TDD ordering:** the implementation was written before the RED run, so no failing run was captured; tests were committed before the implementation commit.

## Verification
- `npx vitest run`: 421 passed. typecheck and lint clean. `npx playwright test e2e/tabs.spec.ts --project=chromium`: 7 passed.

## Known Stubs
None.

## Self-Check: PASSED
Commits acb91a3, 3dde317, 1ff82a8 present.
