---
phase: 04-six-boards-and-persistence
plan: 11
subsystem: game-store
tags: [storage, tab-sync, tdd, gap-closure, CR-02, WR-04]
requires: ["04-10"]
provides:
  - "applyExternal built on mergeBoards: keep-live, write-back when ahead, reset floor"
  - "src/state/twoTabs.test.ts: two stores on one shared storage with browser-like async storage events"
affects: [src/state/gameStore.ts, src/state/gameStore.test.ts, src/state/twoTabs.test.ts]
key-files:
  created:
    - src/state/twoTabs.test.ts
  modified:
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
decisions:
  - "Only applyExternal(null) (a reset) may start a game from outside; resetFloor = max(clock, maxGameId(boards), gameId) set there and in resetAll"
  - "Ahead case writes the merged document back with a single set; no set at all when neither side changes, so tabs never ping-pong"
  - "Equal ids with different answers (concurrent starts) resolve through pickGame (lower answer) on both sides"
metrics:
  tasks: 2
  completed: 2026-10-04
requirements: [SAVE-08, SAVE-09]
---

# Phase 4 Plan 11: Tab sync on merge rules Summary

`applyExternal` now merges the incoming document with this tab's live view using `mergeBoards`. A document lacking the active Board never starts a game, older or shorter documents never roll a game back or re-finish it, and Reset sets a floor so pre-reset games are ignored.

## Commits
- f2ae372: test(04-11) failing two-tab CR-02 / WR-04 scenarios (RED)
- d774a5b: feat(04-11) applyExternal on mergeBoards (GREEN)

## RED state
Of 8 scenarios, 6 failed before the fix: Reset, Board-less document, concurrent Play again, both WR-04 cases, and Reset floor. Play again and New game already passed after 04-10, as expected.

## Verification
- `npx vitest run`: 372 passed (8 new twoTabs, 1 new sync unit test)
- `npm run typecheck`, `npm run lint`: clean; Prettier applied to touched files
- Playwright chromium tabs, persistence, forfeit specs: 13 passed

## Deviations from Plan
None in behaviour. Existing 'sync' tests in gameStore.test.ts now carry `id: store.getState().gameId` through an optional id argument on `crane()`, as the plan specified. The twoTabs concurrent-Play-again test relies on tab B having already adopted A's finished game via sync.

## Known Stubs
None.

## Self-Check: PASSED
