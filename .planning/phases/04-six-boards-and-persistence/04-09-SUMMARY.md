---
phase: 04-six-boards-and-persistence
plan: 09
subsystem: storage-merge
tags: [storage, merge, tdd, gap-closure, CR-02, WR-04]
requires: ["04-08"]
provides:
  - "SavedGame.id, gameIdOf, sameGame, pickGame, mergeBoard, mergeBoards, maxGameId"
affects: [src/logic/save.ts, src/logic/save.test.ts]
key-files:
  modified:
    - src/logic/save.ts
    - src/logic/save.test.ts
decisions:
  - "Games carry an optional integer id; pickGame is a symmetric total order (id, finished beats playing, more guesses, lower answer, string tiebreak), so tabs converge. No SAVE_VERSION bump."
metrics:
  tasks: 2
  completed: 2026-10-04
requirements: [SAVE-08, SAVE-09]
---

# Phase 4 Plan 09: Per-Board merge with game ids Summary

Pure, test-first merge rules in `src/logic/save.ts`. Optional `SavedGame.id` is validated as a non-negative safe integer and copied only when present, so id-less V1 documents still round-trip unchanged. `pickGame` is symmetric and idempotent (property-tested). `mergeBoard` and `mergeBoards` never delete a Board that the other side lacks (CR-02) and honour a reset floor.

## Commits
- 863a494: test(04-09) failing merge tests (RED)
- faf6dea: feat(04-09): per-Board merge with game ids (GREEN)

## Verification
- `npx vitest run`: 355 passed
- `npm run typecheck` and `npm run lint`: clean

## Deviations from Plan
None. Prettier was run on both touched files.

## Known Stubs
None.

## Self-Check: PASSED
