---
phase: 02-playable-normal-game
plan: 06
subsystem: state
tags: [zustand, dynamic-import, tdd, game-engine]
requires: [02-01, 02-03, 02-05]
provides:
  - Lazy memoised per-length pool loader (loadPools, toPools)
  - Single-game Zustand store (createGameStore, useGameStore, revealDurationMs)
  - UI-SPEC copy constants and the __WORDLE_TEST__ answer hook
affects: [02-07, 02-08, 02-09]
tech-stack:
  added: [zustand@5.0.15]
  patterns: [deps-injected store factory, load-token stale guard, row-scoped shake marker]
key-files:
  created:
    - src/data/wordData.ts
    - src/data/wordData.test.ts
    - src/state/copy.ts
    - src/state/testHook.ts
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
    - src/test-hook.d.ts
  modified:
    - package.json
    - package-lock.json
    - tsconfig.app.json
key-decisions:
  - "Reveal duration uses (length-1)*300+500 (+50 ms buffer); formula wins over UI-SPEC example figures"
  - "selectLength is a no-op for the active length unless status is error"
metrics:
  duration: ~10 min
  completed: 2026-10-01
  tasks: 2
  files: 10
---

# Phase 2 Plan 06: Game Engine Summary

Lazy per-length pool loader and a dependency-injected Zustand single-game store with reveal lock, row-scoped shake marker, stale-load guard and an E2E-only answer hook.

## Commits

- 24b3384 test(02-06): add failing loader tests
- bf1e2cb feat(02-06): add lazy pool loader, copy and test hook
- 3870dd0 test(02-06): add failing store tests
- bb8973e feat(02-06): add game store

## Verification

Full `vitest run` (93 tests), typecheck, lint and format:check all pass. The 02-05 E2E remains red until 02-07 as expected.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
