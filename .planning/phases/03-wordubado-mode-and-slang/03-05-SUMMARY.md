---
phase: 03-wordubado-mode-and-slang
plan: 05
subsystem: info-popup
tags: [modal, wordubado, a11y, content-warning]
requires: [03-04]
provides:
  - infoOpen/openInfo/closeInfo and first-enable auto-open rule in the game store (D-16)
  - InfoButton (i) and WordubadoInfo popup on the shared Modal (D-17, D-18)
affects: [Phase 4 persistence (infoSeen is in-memory only)]
key-files:
  created: [src/components/InfoButton.tsx, src/components/WordubadoInfo.tsx, src/components/SwitchConfirm.test.tsx]
  modified: [src/state/gameStore.ts, src/state/gameStore.test.ts, src/components/usePhysicalKeyboard.ts, src/App.tsx, src/App.test.tsx, src/components/Header.tsx, src/components/Header.test.tsx, src/components/SwitchConfirm.tsx, src/state/copy.ts, src/styles/game.css, e2e/wordubado.spec.ts, e2e/helpers.ts, e2e/layout.spec.ts]
key-decisions:
  - "infoSeen lives in the createGameStore closure (per store, in memory), so it resets on reload and in each test store"
  - "autoOpenInfo is called only from requestSwitch's immediate path and confirmSwitch, never on cancel"
requirements-completed: [WORD-06]
duration: n/a
completed: 2026-10-02
---

# Phase 3 Plan 05: Wordubado info popup Summary

An (i) button beside the mode switch opens "What's Wordubado?" with the "Heads up: some words are mildly crude." note; it also opens by itself the first time Wordubado is turned on in a page session.

## Tasks

1. Info popup state and auto-open rule: d72f3f1
2. (i) button and popup: 061807a
3. Bug fix (requested deviation): c6130a5

## Results

- Full `npx playwright test`: 64 passed (chromium and mobile), run after the last code change.
- Vitest 175 passing; typecheck, lint, prettier check and build green.

## Deviations from Plan

**1. [Rule 1 - Bug] Confirm copy flickered during close.** SwitchConfirm derived its body from live store mode, so after "Start new game" it briefly showed the length copy during the 120 ms close. It now snapshots `{ active, target }` when the dialog opens. New `SwitchConfirm.test.tsx` failed before the fix. Commit c6130a5 (`fix(03-05): keep confirm copy stable while the dialog closes`).
**2. [Rule 3 - Test] App.test.tsx and Header.test.tsx reset `pendingSwitch`/`infoOpen` in beforeEach** because the shared store leaked state between tests; Header.test also calls stubDialog.
**3. [Rule 3 - Test] `turnOnWordubado` blurs focus after dismissing the popup.** Focus returns to the switch by design, and Enter on a focused switch toggles it, so a following guess's Enter would flip the mode. Test-only; a keyboard user who types then presses Enter with focus on the switch would see the same toggle (existing 03-03 own-enter behaviour), worth a look in a later UX pass.

UI-05 left unchecked per D-14. WORD-06 delivered.

## Known Stubs

None.

## Self-Check: PASSED
