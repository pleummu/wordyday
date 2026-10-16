---
phase: 04-six-boards-and-persistence
plan: 04
subsystem: forfeit
tags: [give-up, new-game, dialog, modal, e2e-red]
requires: ["04-03"]
provides:
  - "gameStore.dialog, openDialog, closeDialog, giveUp, forfeitNewGame"
  - "Modal native close handling guarded by openRef"
  - "e2e/forfeit.spec.ts (red until 04-05)"
affects: [04-05, 04-06]
key-files:
  created:
    - e2e/forfeit.spec.ts
  modified:
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
    - src/components/Modal.tsx
    - src/components/Modal.test.tsx
    - src/test/stubDialog.ts
key-decisions:
  - "isInputBlocked is now dialog !== null || infoOpen"
  - "forfeitNewGame removes the stale saved entry for the Board before starting the new game so a refresh in the load window never restores the forfeited game"
requirements-completed: [PLAY-07, PLAY-08]
completed: 2026-10-03
---

# Phase 4 Plan 04: Give Up / New game rules Summary

The store now enforces Give Up and New game only at exactly 2 tries left (via `canForfeit`), reports each finish once through the seam, and blocks input while a dialog is open; Modal reports browser-initiated closes exactly once.

## Tasks

1. Forfeit E2E (5 tests, listed, red until 04-05) plus store `dialog`, `openDialog`, `closeDialog`, `giveUp`, `forfeitNewGame`; 9 new `forfeit` tests (62 store tests). Commit c2a3a01.
2. Modal `onClose` on the dialog guarded by `openRef`; `stubDialog` close() now dispatches a native-style `close` event; 3 new Modal tests (fake-timer animated path included). Commit 0b7170f.

Verification: 284 unit tests, lint and typecheck pass. The forfeit E2E was only listed, not run (expected red).

## Deviations from Plan

- [Rule 3] E2E import uses `./helpers.ts` (typecheck requires the extension). Otherwise none.

## Known Stubs

None (UI row, confirms and banner arrive in 04-05).

## Threat Flags

None. T-04-12, T-04-13, T-04-14 mitigated and tested.

## Self-Check: PASSED
