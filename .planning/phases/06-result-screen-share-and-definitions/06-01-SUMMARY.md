---
phase: 06-result-screen-share-and-definitions
plan: 01
subsystem: ui
tags: [react, zustand, result-modal, timing, playwright]
requires: []
provides:
  - src/logic/timing.ts single timing source (revealDurationMs, bounceMs, resultDelayMs)
  - 'result' dialog with timed auto-open, skip rule and input block in gameStore
  - ResultModal on shared StatsBlock (Stat, DistChart)
affects: [06-02, 06-03, 06-08]
tech-stack:
  added: []
  patterns: [store-owned timer for UI timing (no effects), transient non-persisted flags]
key-files:
  created:
    - src/logic/timing.ts
    - src/logic/timing.test.ts
    - src/components/StatsBlock.tsx
    - src/components/ResultModal.tsx
    - src/components/ResultModal.test.tsx
    - e2e/result.spec.ts
  modified:
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
    - src/state/copy.ts
    - src/components/StatsModal.tsx
    - src/components/StatsModal.test.tsx
    - src/components/Header.tsx
    - src/components/StatsButton.tsx
    - src/components/StreakChip.tsx
    - src/App.tsx
    - src/App.test.tsx
    - src/styles/game.css
    - e2e/helpers.ts
key-decisions:
  - "resultPending/resultFlourish are transient store fields, never in docFromState"
  - "isBusy (revealing or resultPending) drives header control disabling and switchBoard/openStats guards"
requirements-completed: [RSLT-01]
duration: ~40min
completed: 2026-10-12
---

# Phase 6 Plan 01: Result modal Summary

Finished games now auto-open a Result modal (win after bounce + 400 ms, loss after 600 ms, reduced motion 300 ms, Give Up immediately) showing heading, answer, this Board's stats and distribution, with a focused Play again; the store owns the timer and blocks input during the pause.

## Tasks

| Task | Commit | Notes |
| ---- | ------ | ----- |
| 1. Failing E2E, helpers, StatsBlock extraction | db83a07 | Stat/DistChart moved out of StatsModal, DOM unchanged |
| 2. Timing module and store scheduling | a4cc872 | timing.ts, 'result' dialog, scheduleResult, skip rule (D-03), stale-timer guard, openResult, isBusy |
| 3. ResultModal, CSS, App mount | cd42df2 | flourish, held-Enter guard, App Give Up test updated |

## Verification

- npm test: 561 passed; npm run lint, typecheck, prettier check clean
- npx playwright test e2e/result.spec.ts: 24 passed (chromium and mobile)
- Legacy E2E specs were not run (expected to fail until 06-08)

## Deviations from Plan

**1. [Rule 3 - Blocking] StatsModal.test.tsx selector scoped**
- Issue: ResultModal is always mounted (closed dialog still renders children), so `document.querySelectorAll('.stat')` in "All tab renders exactly two stat cells" counted 6.
- Fix: query inside the Statistics dialog. Behavior asserted is unchanged.
- Commit: cd42df2

**2. [Rule 1 - Bug in own spec] Forfeit E2E needed four guesses**
- The New game button only shows with 2 tries left; the spec written in Task 1 played one guess. Fixed in cd42df2.

**3. Minor:** timing.ts imports `./boards.ts` with extension (tsc node16 resolution required it). The Task 1 RED run of Playwright was not executed separately; the spec imports the then-missing timing module, so it was red by construction.

Prettier reformatting of Task 1 files was folded into the Task 2 commit.

## Known Stubs

None. The slim banner and "See result" (06-02) and Share (06-03) are out of scope; the fallbackFocus references `[data-see-result]` which does not exist yet and falls back to `.play-again`.

## Self-Check: PASSED

Files and commits db83a07, a4cc872, cd42df2 verified present.
