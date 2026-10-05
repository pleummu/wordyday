---
phase: 05-stats-streaks-and-restore
plan: 06
subsystem: restore prompt
tags: [react, zustand, streaks, dialog, a11y]
requires:
  - phase: 05-stats-streaks-and-restore
    provides: StreakSlice, creditDay, chip, Statistics footer (05-04/05-05)
provides:
  - check / restore / decline pure reducers with the EC-01..EC-44 table
  - store checkStreaks / restore / declineRestore, input blocked while pendingRestore is set
  - Modal dismissible option and the non-dismissable RestorePrompt
  - boot missed-day check in main.tsx
affects: [05-07, 05-08]
key-files:
  created: [src/components/RestorePrompt.tsx, src/components/RestorePrompt.test.tsx, e2e/restore.spec.ts]
  modified: [src/logic/streaks.ts, src/logic/streaks.test.ts, src/logic/save.ts, src/logic/save.test.ts, src/state/gameStore.ts, src/state/gameStore.test.ts, src/state/twoTabs.test.ts, src/state/copy.ts, src/main.tsx, src/components/Modal.tsx, src/components/Modal.test.tsx, src/App.tsx]
key-decisions:
  - "The prompt is the persisted pendingRestore, never a DialogName; it renders only when status is not 'revealing'"
  - "mergeBoardStats ties on played prefer the lower winStreak so a missed-day reset is never undone by another tab"
  - "Modal dismissible=false re-calls showModal() on a native close while open (research A1); double-Esc E2E passes"
requirements-completed: [STRK-03, STRK-04, STRK-05, STRK-06, STRK-07, STRK-08, QA-02]
duration: ~45 min
completed: 2026-10-05
---

# Phase 5 Plan 06: Restore Prompt Summary

On app open the missed-day check resets every Win Streak and, when the Day Streak is above 0 with 4 or fewer missed days and a Restore left, shows a blocking "Streak broke" prompt whose only exits are No and Restore.

## Tasks

| Task | Commit |
|------|--------|
| 1. Failing Restore E2E | 8d884af |
| 2. CHECK/RESTORE/DECLINE reducers, store actions, boot check | bd9553e |
| 3. Modal dismissible and RestorePrompt | 108177d |

## Deviations from Plan

**1. [Rule 3 - Blocking] process typing:** the TZ-matrix test reads `process.env`, which the browser tsconfig does not type; accessed through a `globalThis` cast instead of adding @types/node.
**2. Test stability:** the contrast E2E waits for the Restored toast to disappear before axe, otherwise `document.getAnimations()` rejects with AbortError.
**3.** The D-21 component test flips `status` with setState rather than calling `finishReveal()` (it needs a scored row); the gating logic under test is the component's `status !== 'revealing'`.

## Verification
- `npx vitest run`: 517 passed; lint, typecheck clean.
- `npx playwright test e2e --project=chromium`: 114 passed (mobile runs in the 05-08 gate). Double-Esc and backdrop click keep the prompt open; axe clean in Normal and Wordubado; dimmed chip icon is at least 3:1.

## Known Stubs
None. The 'broke' effect is ignored by the store on purpose; 05-07 adds the streak-ended modal, focus/midnight triggers and the finish-time CHECK (creditDeferred is handled by the reducers already).

## Self-Check: PASSED
Commits 8d884af, bd9553e, 108177d present; created files exist.
