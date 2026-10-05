---
phase: 05-stats-streaks-and-restore
plan: 05
subsystem: day streak chip
tags: [react, header, playwright, a11y]
requires:
  - phase: 05-stats-streaks-and-restore
    provides: dayStreak slice, today, openStats (05-03/05-04)
provides:
  - StreakChip header button (sun icon + count), hidden at 0
  - chipName copy helper
  - 320 px fit checks for Day Streak 12 and 123
affects: [05-06, 05-07, 05-08]
key-files:
  created: [src/components/StreakChip.tsx, src/components/StreakChip.test.tsx]
  modified: [src/components/Header.tsx, src/components/StatsModal.tsx, src/state/copy.ts, src/styles/game.css, e2e/streaks.spec.ts, e2e/layout.spec.ts, e2e/stats.spec.ts, e2e/wordubado.spec.ts]
key-decisions:
  - "Chip is dimmed (data-dimmed, muted icon) when lastActiveDate !== store today; accessible name carries the play-today hint"
  - "E2E queries for the Statistics button use exact: true because the chip name contains 'statistics'"
requirements-completed: [STRK-02, STAT-03]
duration: ~25 min
completed: 2026-10-05
---

# Phase 5 Plan 05: Day Streak Chip Summary

A sun chip in the header shows the Day Streak (only above 0), is muted until a game is finished today, opens Statistics on the current Board, is disabled while revealing, and fits at 320 px with 12 and 123 without changing header height.

## Tasks

| Task | Commit |
|------|--------|
| 1. Failing chip E2E and 320 px fit | f6408b3 |
| 2. StreakChip in the header | 2eccb08 |

## Deviations from Plan

**1. [Rule 3 - Blocking] Existing E2E queries:** `getByRole('button', { name: 'Statistics' })` is a case-insensitive substring match and now also matches the chip, causing strict-mode violations. Made those queries `exact: true` in stats.spec.ts, wordubado.spec.ts and the openStats helper.
**2. [Rule 3 - Blocking] jsdom matchers:** jest-dom is not set up, so StreakChip.test.tsx uses plain DOM assertions.
**3. Layout test isolation:** each measured page clears the shared localStorage key first, because seedSave only seeds when the key is absent and pages in one context share storage.

## Verification
- `npx vitest run`: 467 passed; lint, typecheck, prettier clean.
- `npx playwright test e2e --project=chromium`: 102 passed (mobile project runs in the 05-08 gate).

## Known Stubs
None. `today` still only refreshes at finish/reset/startup until the 05-06/05-07 midnight triggers, so the dimmed state will not flip at midnight yet.

## Self-Check: PASSED
Commits f6408b3 and 2eccb08 present; StreakChip files exist.
