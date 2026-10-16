---
phase: 04-six-boards-and-persistence
plan: 06
subsystem: settings-reset
tags: [settings, reset, modal, storage]
requires: ["04-05"]
provides:
  - "SettingsButton, SettingsModal, ResetConfirm components"
  - "Store actions openSettings, openReset, cancelReset, resetAll, applyStorageNotice; fields storageOk, settingsFocus"
  - "--color-danger token and danger / danger-outline modal buttons"
affects: [04-07]
key-files:
  created:
    - src/components/SettingsButton.tsx
    - src/components/SettingsModal.tsx
    - src/components/SettingsModal.test.tsx
    - src/components/ResetConfirm.tsx
    - e2e/settings.spec.ts
  modified:
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
    - src/state/copy.ts
    - src/components/Header.tsx
    - src/components/Header.test.tsx
    - src/App.tsx
    - src/styles/tokens.css
    - src/styles/game.css
    - e2e/wordubado.spec.ts
key-decisions:
  - "resetAll clears everything in one set before startGame, then sets the 'All data reset' toast after startGame so its synchronous toast reset does not wipe it"
  - "04-07 still has to subscribe deps.storage.onNotice to applyStorageNotice (storageOk only changes via that action)"
requirements-completed: [SAVE-09, UI-11]
completed: 2026-10-03
---

# Phase 4 Plan 06: Settings and Reset Summary

Header Settings button opens a Settings dialog with the browser-only note, and "Reset my data" goes through a separate destructive confirm (Cancel focused) that returns the app to a first visit, removing the main save key and the :corrupt backup and showing an "All data reset" toast.

## Tasks

1. Failing settings E2E (4 tests), copy constants, store actions and 8 store tests. Commit f95c33c.
2. SettingsButton, SettingsModal, ResetConfirm, CSS and token, Header/App wiring, 5 component tests, Header test and wordubado E2E updated. Commit 68232fd.

Verification: 304 unit tests, lint, typecheck, and the full Playwright suite (102 tests, both projects) pass.

## Deviations from Plan

None - plan executed as written. In the E2E reset test the Wordubado guess uses a valid 5-letter word ('house') rather than a slang word.

## Known Stubs

None. storageOk is wired to notices only once 04-07 subscribes onNotice (planned).

## Threat Flags

None. T-04-17, T-04-18 (E2E asserts :corrupt key null) and T-04-19 (reveal-timer test) mitigated.

## Self-Check: PASSED
