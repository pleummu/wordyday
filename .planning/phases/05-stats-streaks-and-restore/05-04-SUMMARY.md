---
phase: 05-stats-streaks-and-restore
plan: 04
subsystem: day streak
tags: [zustand, dates, playwright-clock, eslint, vitest]
requires:
  - phase: 05-stats-streaks-and-restore
    provides: save slices and streakRev, Stats dialog
provides:
  - clock.ts (localDateKey, msUntilNextLocalMidnight)
  - streaks.ts (dayNumber, monthOf, prevDay, missedDays, refill, restoresLeft, creditDay)
  - lint guard against clock reads in src/logic
  - Day Streak credit at finish with toast queued after praise
  - Stats footer (Day streak, Best, Restores left)
affects: [05-06, 05-07, 05-08]
key-files:
  created: [src/state/clock.ts, src/state/clock.test.ts, src/logic/streaks.ts, src/logic/streaks.test.ts]
  modified: [eslint.config.js, src/state/gameStore.ts, src/state/gameStore.test.ts, src/state/copy.ts, src/components/Toast.tsx, src/components/StatsModal.tsx, src/components/StatsModal.test.tsx, src/styles/game.css, e2e/streaks.spec.ts]
key-decisions:
  - "Day Streak credit is recorded at submit; the toast is held in transient dayToastDue and shown at reveal end (after TOAST_LIFE_MS on a win)"
  - "Forfeit shows the toast after startGame because startGame clears toasts"
  - "Clock-dependent store code goes through deps.now; TZ tests use vi.stubEnv"
requirements-completed: [STRK-02, STRK-03, STAT-03, QA-02]
duration: ~40 min
completed: 2026-10-05
---

# Phase 5 Plan 04: Day Streak Summary

The first finished game of each local day adds 1 to the global Day Streak (backwards clocks give no credit), with a queued "Day streak: N" toast and a global footer in Statistics.

## Tasks

| Task | Commit |
|------|--------|
| 1. Failing Day Streak E2E | 051cf1c |
| 2. Date helpers, creditDay, lint guard | 29ebb9a |
| 3. Store credit, toast, reset, Stats footer | 02bdba4 |

## Deviations from Plan

**1. [Rule 1 - Bug] Test fixtures:** Give Up/Forfeit store tests needed 4 guesses (canForfeit requires max-2 attempts); fixed in the tests.
**2. [Rule 3 - Blocking] process typing:** src has no node types, so clock.test.ts uses vi.stubEnv('TZ') instead of process.env.
**3. Structure:** the file-level beforeEach in e2e/streaks.spec.ts moved into the Win Streak describe so Day Streak tests can install the clock before goto.
**4. TDD ordering (Task 2/3):** tests and implementation committed together.

## Verification
- `npx vitest run`: 463 passed; lint and typecheck clean.
- `npx playwright test e2e/streaks.spec.ts e2e/stats.spec.ts e2e/settings.spec.ts --project=chromium`: 25 passed (includes assumption A2: reveal completes under an installed clock).
- Lint guard verified: a temporary `new Date()` in src/logic/streaks.ts fails eslint.

## Known Stubs
None. Missed-day checks, the Restore prompt and midnight triggers are 05-06/05-07. `today` in the store only updates at finish/reset until then.

## Self-Check: PASSED
Commits 051cf1c, 29ebb9a, 02bdba4 present; created files exist.
