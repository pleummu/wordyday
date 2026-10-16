---
phase: 07-themes-accessibility-and-polish
plan: 07
subsystem: accessibility
tags: [keyboard, focus-trap, axe, themes, playwright]
requires: ["07-06"]
provides:
  - keyboard-only E2E for the whole game and every dialog
  - axe proof in light, dark, colour-blind light and colour-blind dark
affects: [src/components/Modal.tsx, src/components/usePhysicalKeyboard.ts, src/styles/tokens.css]
tech-stack:
  added: []
  patterns: ["Tab trap counts only tabIndex >= 0 buttons", "blur focused non-dialog element on typed letter/Backspace"]
key-files:
  created: [e2e/keyboard.spec.ts, e2e/a11y-themes.spec.ts]
  modified: [src/components/Modal.tsx, src/components/Modal.test.tsx, src/components/usePhysicalKeyboard.ts, src/App.test.tsx, src/styles/tokens.css]
key-decisions:
  - "Light --color-focus #6f9a7c -> #648f70 (3.17 on surface, 3.53 on bg)"
  - "Light --color-muted #7a7f8a -> #676c76 (4.54 on surface) for the colour-blind hint"
requirements-completed: [UI-08, UI-02, UI-03]
duration: 35min
completed: 2026-10-15
---

# Phase 7 Plan 07: Keyboard audit and axe in four themes Summary

Keyboard-only play and every dialog are proven by E2E, Modal's Tab trap now ignores roving-tabindex items, and axe passes in all four theme/palette combinations.

## Tasks

1. Keyboard E2E and focus fixes: 07e6bcd
2. axe in four combinations and token tuning: 0776e37

## Fixes

- Modal onKeyDown filters buttons with tabIndex < 0 so Settings theme radios and Statistics tabs cannot let Tab escape.
- usePhysicalKeyboard blurs the focused element (outside any dialog) on a letter or Backspace, so Enter submits after a dialog returns focus to a header button. Enter alone still activates the button.
- Unit tests added in Modal.test.tsx and App.test.tsx.

## Token changes

- Light `--color-focus`: #6f9a7c -> #648f70 (ring was 2.75 against the surface).
- Light `--color-muted`: #7a7f8a -> #676c76 (axe color-contrast on `#colour-blind-hint`).
- Dark and both colour-blind palettes passed unchanged. Mixed-row screenshots checked: orange, blue and grey are clearly distinct in light and dark colour-blind.

## Deviations from Plan

- Toast check uses `.toast-layer .toast` (not `.toast[role=status]`), since the praise toast is not itself role=status here.
- Focus-ring contrast is measured against the parent background (the ring sits outside the element).
- No other files needed changes. No skip link exists.

## Verification

vitest 678 passed; eslint, tsc and prettier clean on touched files (pre-existing prettier warning on src/components/WordubadoInfo.tsx left alone); Playwright full: 437 passed, 15 skipped, 0 failed.

## Self-Check: PASSED
