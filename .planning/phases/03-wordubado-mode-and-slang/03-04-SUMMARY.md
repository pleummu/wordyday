---
phase: 03-wordubado-mode-and-slang
plan: 04
subsystem: switch-confirm
tags: [modal, dialog, confirm, wordubado]
requires: [03-03]
provides:
  - pendingSwitch/confirmSwitch/cancelSwitch in the game store (D-09)
  - Reusable native-dialog Modal (D-10) and SwitchConfirm
affects: [03-05 info popup, Phase 4 dialogs]
key-files:
  created: [src/components/Modal.tsx, src/components/Modal.test.tsx, src/components/SwitchConfirm.tsx, src/test/stubDialog.ts]
  modified: [src/state/gameStore.ts, src/state/gameStore.test.ts, src/components/usePhysicalKeyboard.ts, src/App.tsx, src/App.test.tsx, src/state/copy.ts, src/styles/game.css, e2e/wordubado.spec.ts]
key-decisions:
  - "In progress = at least one submitted guess and status playing; otherwise the switch applies immediately"
  - "Native dialog with showModal; Modal restores focus only if focus is still inside it or on body, falling back to the mode switch"
requirements-completed: [WORD-01]
duration: n/a
completed: 2026-10-02
---

# Phase 3 Plan 04: End this game? confirm Summary

Switching mode or length mid-game now asks "End this game?" via a reusable native-dialog Modal; Keep playing, Esc and backdrop click leave the game untouched.

## Tasks

1. Pending switch state and keyboard guard: a9843a1
2. Reusable Modal and End this game? dialog: dda801d

## Results

- Full `npx playwright test`: 56 passed (chromium and mobile), run after the last code change.
- Vitest 164 passing; typecheck, lint, prettier check and build green.

## Deviations from Plan

**1. [Rule 1 - Test] Existing store test updated.** "a switch right after finishReveal starts a clean game" now calls confirmSwitch, since a started game correctly prompts.
**2. [Rule 3 - Lint] SwitchConfirm keeps the last target with useState** (derived-state pattern) instead of a ref, because react-hooks/refs forbids ref access during render. Modal's fallback ref is updated in an effect for the same reason.
**3. App.test.tsx calls stubDialog in beforeAll** because App now mounts a dialog.

Minor note: during the 120 ms close animation after Start new game, the body text is computed against the already-switched mode, so it may briefly read as the length copy.

UI-05 left unchecked per D-14.

## Known Stubs

None.

## Self-Check: PASSED
