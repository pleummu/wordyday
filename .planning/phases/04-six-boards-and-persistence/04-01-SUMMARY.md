---
phase: 04-six-boards-and-persistence
plan: 01
subsystem: persistence
tags: [save-schema, migration, validation, e2e, tdd]
requires: []
provides:
  - "src/logic/save.ts: SAVE_VERSION, SAVE_KEY, CORRUPT_SUFFIX, BOARD_KEYS, boardKey, emptySave, resolveOutcome, canForfeit, migrateSave, validateSave, loadSave"
  - "Red E2E specs for refresh, finished Board, last Board and non-forfeiting switches"
affects: [04-02, 04-03]
tech-stack:
  added: []
  patterns: ["hand-written allowlist guard", "versioned envelope with migration chain"]
key-files:
  created:
    - src/logic/save.ts
    - src/logic/save.test.ts
    - e2e/persistence.spec.ts
    - e2e/boards.spec.ts
  modified:
    - src/logic/boards.ts
    - src/state/gameStore.ts
    - e2e/helpers.ts
key-decisions:
  - "Mode type lives in logic/boards.ts and is re-exported from gameStore to avoid an import cycle"
  - "canForfeit also requires attemptsUsed > 0 (R-FORFEIT-6) as a defensive guard"
requirements-completed: [SAVE-01, SAVE-03, SAVE-04, SAVE-05, SAVE-06]
duration: ~20min
completed: 2026-10-03
---

# Phase 4 Plan 01: Save schema and failing E2E Summary

Pure versioned save document (v1 envelope, empty migration chain, allowlist guard that never throws) plus eight red Playwright tests describing the refresh and switch behaviour.

## Tasks

1. Failing E2E specs and helpers (`guessAll`, `cell`): commit 7eb1530. Eight tests list; they are red by design until 04-02 and 04-03.
2. TDD save module: RED 8d554ee, GREEN d7eaf63. 237 unit tests pass, typecheck and lint clean.

## Deviations from Plan

**1. [Rule 1 - Bug] canForfeit zero-guess guard.** The plan's table test (`canForfeit('playing', 0, 2)` false) contradicts a pure `=== max - 2` rule. Added `attemptsUsed > 0` in the implementation; real Boards (max 5/6/7) are unaffected.

Otherwise the plan was executed as written. The E2E specs were not run (they are expected to fail; only `--list` was checked).

## Known Stubs

None.

## Threat Flags

None. T-04-01 and T-04-02 mitigations are implemented and tested.

## Self-Check: PASSED
