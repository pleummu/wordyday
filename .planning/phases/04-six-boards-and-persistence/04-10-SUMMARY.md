---
phase: 04-six-boards-and-persistence
plan: 10
subsystem: game-store
tags: [storage, store, tdd, gap-closure, WR-01, WR-03, CR-02]
requires: ["04-09"]
provides:
  - "gameId state and per-tab id clock; ids saved and restored per Board"
  - "startGame captures the left game; forfeit stored as gave-up before the next game"
  - "pendingExternal cleared wherever loadToken is bumped"
affects: [src/state/gameStore.ts, src/state/gameStore.test.ts]
key-files:
  modified:
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
decisions:
  - "nextGameId runs after the loadPools await so ids seen during the await count; clock = max(clock, maxGameId(boards), gameId) + 1"
  - "Forfeit is stored as a gave-up snapshot (with its id) before startGame; finishGame(forfeit) still fires once"
  - "Board-less document after Reset all is intentional (it is the reset itself)"
metrics:
  tasks: 2
  completed: 2026-10-04
requirements: [SAVE-08, SAVE-09]
---

# Phase 4 Plan 10: Truthful writes and game ids Summary

Every storage write from this tab is now a complete, truthful document. Games carry ids. Play again and New game capture the old game instead of re-broadcasting it as playing or dropping the Board. A forfeit is stored as finished first. A deferred external document dies with the game it was deferred for.

## Commits
- 107d4b3: test(04-10) failing write-sequence and stale-pending tests (RED, 8 new tests)
- GREEN commit: feat(04-10) game ids, snapshot capture, forfeit snapshot, pending cleanup

## Verification
- `npx vitest run`: 363 passed
- `npm run typecheck` and `npm run lint`: clean
- Playwright chromium: forfeit, persistence, tabs, boards specs, 17 passed

## Deviations from Plan
Two existing tests were adjusted for the new `id` field only (a `toEqual` on a saved game in 'boards', and an incoming sync document in 'sync > updates other Boards silently' which now carries `id: 1` so it matches the live game). No behavioural assertion was weakened.

## Known Stubs
None.

## Self-Check: PASSED
