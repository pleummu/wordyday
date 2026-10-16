---
phase: 04-six-boards-and-persistence
plan: 05
subsystem: forfeit-ui
tags: [give-up, new-game, forfeit-row, banner, layout]
requires: ["04-04"]
provides:
  - "ForfeitRow, GiveUpConfirm, NewGameConfirm components"
  - "Banner gave-up copy; forfeit CSS and tile floor"
  - "Layout E2E with the forfeit row visible"
affects: [04-06]
key-files:
  created:
    - src/components/ForfeitRow.tsx
    - src/components/ForfeitRow.test.tsx
    - src/components/GiveUpConfirm.tsx
    - src/components/NewGameConfirm.tsx
  modified:
    - src/components/Banner.tsx
    - src/state/copy.ts
    - src/App.tsx
    - src/App.test.tsx
    - src/styles/game.css
    - e2e/layout.spec.ts
key-decisions:
  - "The max-height 540px rule also targets .app[data-forfeit] so the 32px tile floor beats the 36px forfeit floor on short screens"
requirements-completed: [PLAY-07, PLAY-08]
completed: 2026-10-03
---

# Phase 4 Plan 05: Forfeit UI Summary

Give up / New game row appears only at exactly 2 tries left, each behind a Modal confirm focused on Keep playing, and Give Up ends in a loss-styled "You gave up" banner; the row fits 320x500, 320x568 and 320x640 in both modes.

## Tasks

1. ForfeitRow, two confirm dialogs, banner copy, CSS, 6 ForfeitRow tests and 2 App tests. Commit a52c72d. forfeit E2E 10/10 green.
2. 7 layout cases per project (3 heights x 2 modes at 6 letters, plus 5-letter 320x500). Commit follows a52c72d (test(04-05)). Layout E2E 32/32 green.

Verification: 292 unit tests, lint, typecheck, forfeit and layout E2E all pass.

## Deviations from Plan

None - plan executed as written (CSS specificity override in the 540px block was part of the planned "wins over" requirement).

## Known Stubs

None.

## Threat Flags

None. T-04-15 mitigated (confirm with Keep playing initial focus, data-own-enter on every button, store re-check).

## Self-Check: PASSED
