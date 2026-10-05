---
phase: 05-stats-streaks-and-restore
plan: 07
subsystem: streak triggers and break notice
tags: [react, zustand, streaks, dialog, a11y, e2e]
requires:
  - phase: 05-stats-streaks-and-restore
    provides: check/restore/decline reducers, RestorePrompt, boot check (05-06)
provides:
  - finishDay (CHECK then credit or defer) used by finishGame
  - startStreakWatch (visibilitychange, focus, local midnight), started once in main.tsx
  - transient breakNotice, dismissBreak and the StreakBreakModal ("Fresh start")
  - EC-01..EC-44 each cited in a unit test title
affects: [05-08]
key-files:
  created: [src/state/streakWatch.ts, src/state/streakWatch.test.ts, src/components/StreakBreakModal.tsx, src/components/StreakBreakModal.test.tsx]
  modified: [src/logic/streaks.ts, src/logic/streaks.test.ts, src/state/gameStore.ts, src/state/gameStore.test.ts, src/state/copy.ts, src/main.tsx, src/App.tsx, e2e/restore.spec.ts]
key-decisions:
  - "finishDay defers the credit (creditDeferred true) whenever a pending Restore exists after the CHECK"
  - "breakNotice is never persisted; the persisted current 0 plus the idempotent CHECK prevents repeats"
  - "Prompt and Fresh start render only when status is not 'revealing' (D-21)"
requirements-completed: [STRK-02, STRK-04, STRK-06, QA-02]
duration: ~25 min
completed: 2026-10-05
---

# Phase 5 Plan 07: Triggers and Streak-Ended Dialog Summary

The missed-day check now also runs on tab visibility, window focus and at local midnight, finishes across a break defer their Day Streak credit, and an involuntary streak loss shows a once-only "Fresh start" dialog.

## Tasks

| Task | Commit |
|------|--------|
| 1. Failing E2E (Breaks and triggers) | cb30cb0 |
| 2. finishDay, breakNotice, streakWatch | 2c74b6f |
| 3. StreakBreakModal and EC gate | 8f7cbe2 |

## Deviations from Plan

**1. [Rule 1 - Test fallout]** The 05-06 E2E tests EC-05 and EC-07 now see the Fresh start dialog (intended D-16 behaviour) and click OK before opening Statistics.
**2.** The Task 1 EC-39 E2E and tests 4 and 5 already passed before implementation (as the plan allowed for 4 and 5; EC-39 held because creditDay already credits the new day).

## Verification
- `npx vitest run`: 538 passed; lint and typecheck clean.
- `npx playwright test e2e --project=chromium`: 125 passed (mobile runs in the 05-08 gate). axe clean for Fresh start in Normal and Wordubado.
- Loop over EC-01..EC-44 finds each ID in a test title.

## Known Stubs
None.

## Self-Check: PASSED
Commits cb30cb0, 2c74b6f, 8f7cbe2 present; created files exist.
