---
phase: 02-playable-normal-game
plan: 01
subsystem: logic
tags: [scoring, tdd, pure-functions, vitest]
requires: []
provides:
  - "score(answer, guess) two-pass scoring and TileState type"
  - "pickAnswer(answers, rng) uniform injectable answer picker"
  - "mergeKeyState / applyGuessToKeys best-state key merge"
affects: [02-06 store, 02-07 UI]
tech-stack:
  added: []
  patterns: [test-first RED/GREEN commits, injectable rng]
key-files:
  created:
    - src/logic/score.ts
    - src/logic/score.test.ts
    - src/logic/pickAnswer.ts
    - src/logic/pickAnswer.test.ts
    - src/logic/keys.ts
    - src/logic/keys.test.ts
  modified: []
decisions:
  - "pickAnswer clamps rng()=1 to the last element and throws on an empty pool"
metrics:
  duration: ~10min
  completed: 2026-10-01
  tasks: 2
  files: 6
---

# Phase 2 Plan 01: Pure scoring, answer picking and key merge Summary

Two-pass Wordle scoring (SPEC worked examples ABBEY/BABES and SPEED/ERASE pass), injectable-rng uniform answer picker, and never-backwards key state merge, all built test-first.

## Commits

- 4654145 test(02-01): add failing score tests (RED)
- 22112f2 feat(02-01): implement two-pass scoring (GREEN)
- 24f5d91 test(02-01): add failing pickAnswer and key-merge tests (RED)
- 2923f12 feat(02-01): implement pickAnswer and key best-state merge (GREEN)

## Deviations from Plan

None - plan executed exactly as written. Prettier was run on the new files so format:check passes.

## Verification

`npx vitest run src/logic` 21 tests pass; typecheck, lint and format:check exit 0.

## Known Stubs

None.

## Self-Check: PASSED
