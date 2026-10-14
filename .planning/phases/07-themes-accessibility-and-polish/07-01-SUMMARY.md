---
phase: 07-themes-accessibility-and-polish
plan: 01
subsystem: save, store, e2e
tags: [save-migration, help-dialog, test-hook]
requires: []
provides:
  - save v3 (theme, colourBlind, howToPlaySeen)
  - "'help' DialogName with openHelp and maybeOpenHelp (no call sites yet)"
  - readSkipHelp test hook and fixAnswers help option
affects: [07-02, 07-03, 07-06]
tech-stack:
  added: []
  patterns: [MIGRATIONS chain step, lenient guard coercion]
key-files:
  created: [e2e/help.spec.ts]
  modified:
    - src/logic/save.ts
    - src/logic/save.test.ts
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
    - src/state/twoTabs.test.ts
    - src/state/testHook.ts
    - src/test-hook.d.ts
    - e2e/helpers.ts
    - e2e/storage.spec.ts
    - e2e/streaks.spec.ts
    - src/test/storageDoubles.ts
key-decisions:
  - "howToPlaySeen merges with OR across tabs; theme/colourBlind cross-tab adoption left to 07-06"
  - "maybeOpenHelp has no call sites until 07-03 renders the modal"
requirements-completed: [UI-04, UI-02, UI-03]
duration: 30min
completed: 2026-10-14
---

# Phase 7 Plan 01: Save v3 and Help store logic Summary

Save v2 to v3 migration adding theme, colourBlind and howToPlaySeen, plus a guarded 'help' dialog in the store and a skipHelp test hook that keeps existing E2E specs green.

## Tasks

1. skipHelp hook, helper defaults, RED e2e/help.spec.ts (6 tests, fail as designed): 3fbb5c3
2. Save v3, MIGRATIONS[2], lenient guard, fixtures bumped (storage NEWER to v4, streaks to v3): 83eb03a
3. Store persists the three fields, openHelp/maybeOpenHelp, reset paths, OR merge: bbf2b0c

## Verification

npm test (640 pass), typecheck, lint, format:check clean. Touched E2E specs pass; settings and game specs pass; help.spec.ts is RED by design until 07-03.

## Deviations from Plan

None in behaviour. Task 2 left typecheck briefly failing (gameStore not yet updated) until Task 3 commit. Prettier rewrote line endings in three Task 1 files (fixed in the Task 3 commit).

## Known Stubs

maybeOpenHelp is uncalled by design (07-03 wires it).

## Self-Check: PASSED
