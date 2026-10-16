---
phase: 03-wordubado-mode-and-slang
plan: 02
subsystem: word-data-and-game-store
tags: [wordubado, slang, store, e2e-red]
requires: [03-01]
provides:
  - slang field (reviewed slang) in words-N.json and Pools.slang
  - pickWordubadoAnswer with SLANG_SHARE 0.75
  - store mode state and guarded requestSwitch
  - failing e2e/wordubado.spec.ts (turned green by 03-03)
affects: [03-03 header switch]
tech-stack:
  added: []
  patterns: [slang shipped inside existing lazy per-length chunk, two-draw rng pick]
key-files:
  created: [e2e/wordubado.spec.ts]
  modified: [e2e/helpers.ts, scripts/words/lib.mjs, scripts/build-words.mjs, src/data/words-4.json, src/data/words-5.json, src/data/words-6.json, src/data/wordData.ts, src/logic/pickAnswer.ts, src/state/gameStore.ts, src/components/Header.tsx]
key-decisions:
  - "Slang travels as a slang field in words-N.json (no separate chunk); gzip 8.0/17.8/31.6 KB, within budgets"
  - "pickWordubadoAnswer always draws two rng values; falls back to answers when slang is empty"
  - "requestSwitch is shaped so 03-04 can add the D-09 confirm branch before startGame"
requirements-completed: [WORD-03, WORD-04]
duration: n/a
completed: 2026-10-02
---

# Phase 3 Plan 02: Wordubado data and store Summary

Reviewed slang now ships in each lazy word chunk, and the store plays Wordubado with a tested 75/25 slang/Normal pick; the E2E happy path is written and red until 03-03 adds the switch.

## Tasks

1. Failing Wordubado E2E: 82ba3bd (5 tests red; helpers `fixAnswersWith`, `slangWords`, `turnOnWordubado`)
2. Slang in per-length chunk: 1c261ee (reviewedSlang, serialisePools slang, slang-answer invariants, Pools.slang)
3. Store mode and 75/25 pick: a0c43ba (SLANG_SHARE, pickWordubadoAnswer, mode, requestSwitch, Header wiring)

## Results

- Slang counts per chunk: 95 / 110 / 95 (4/5/6 letters); Normal answers unchanged (770/857/959); second build shows no drift.
- 10,000 seeded draws land in 7300-7700 slang; full vitest 146 passing, typecheck, lint, prettier, build all green.
- e2e/wordubado.spec.ts is red (5 failures) as intended: no switch exists yet and it is the only expected failure.

## Deviations from Plan

None - plan executed as written.

## Known Stubs

None.

## Self-Check: PASSED
