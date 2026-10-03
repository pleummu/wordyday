---
phase: 04-six-boards-and-persistence
plan: 03
subsystem: boards
tags: [switchBoard, six-boards, length-picker, e2e]
requires: ["04-02"]
provides:
  - "gameStore.switchBoard, isInputBlocked, persisted wordubadoInfoSeen"
  - "LengthPicker inProgress dot with 'game in progress' label"
affects: [04-04, 04-05, 04-06]
key-files:
  created:
    - src/components/LengthPicker.test.tsx
  modified:
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
    - src/state/copy.ts
    - src/components/Header.tsx
    - src/components/LengthPicker.tsx
    - src/components/usePhysicalKeyboard.ts
    - src/App.tsx
    - src/App.test.tsx
    - src/components/Header.test.tsx
    - src/styles/game.css
    - e2e/wordubado.spec.ts
  deleted:
    - src/components/SwitchConfirm.tsx
    - src/components/SwitchConfirm.test.tsx
key-decisions:
  - "switchBoard folds the live view into boards (viewToSaved) and sets status loading in one set, so persist never writes the old game under the new Board key"
  - "isInputBlocked currently returns infoOpen only; 04-04 extends it"
requirements-completed: [SAVE-01, SAVE-02, SAVE-04]
completed: 2026-10-03
---

# Phase 4 Plan 03: Six Boards switching Summary

Switching mode or length is now immediate and non-forfeiting: each of the six Boards keeps its own game in memory and in the saved document, the "End this game?" confirm is gone, the Wordubado popup flag is persisted, and other in-progress lengths show a dot.

## Tasks

1. Store: `switchBoard`, shared `viewToSaved`, persisted `wordubadoInfoSeen` auto-open, `isInputBlocked`; removed pendingSwitch/requestSwitch/confirmSwitch/cancelSwitch. Commit 8970cbd. 53 store tests, including the carry-over test that the previous Board survives in the saved document and that no write puts the old game under the new key.
2. and 3. UI wiring, SwitchConfirm deletion, copy cleanup, LengthPicker dot, E2E rewrite. Commit 419920a (combined because Header depends on both the switchBoard and inProgress changes and a split would not typecheck).

Verification: 272 unit tests, lint, typecheck pass; all 35 chromium E2E pass including boards.spec (4/4), wordubado, persistence, layout.

## Deviations from Plan

- Tasks 2 and 3 share one commit (see above). Otherwise none.
- Playwright run covered chromium only (35 tests); mobile project not run.

## Known Stubs

None.

## Threat Flags

None. T-04-09 (revealing no-op, token) and T-04-11 (single isInputBlocked) mitigated and tested.

## Self-Check: PASSED
