---
phase: 02-playable-normal-game
plan: 02
subsystem: word-data
tags: [slang, vitest, content]
requires: []
provides:
  - scripts/words/slang.json first draft (303 entries)
  - D-18 slang validation test
  - Vitest include covering scripts/
affects: [02-03]
key-files:
  created: [scripts/words/slang.json, scripts/words/slang.test.mjs]
  modified: [vite.config.ts]
requirements-completed: [WORD-07]
duration: 15min
completed: 2026-10-01
---

# Phase 2 Plan 02: Slang draft Summary

Draft slang.json (98 four-, 110 five-, 95 six-letter entries, all `reviewed: false`) with a Vitest shape/count validation and Vitest widened to run tests under `scripts/`.

## Tasks

1. Widen Vitest include, D-18 test, 4-letter entries: 4b891d8
2. 5- and 6-letter entries: adc89be

## Deviations from Plan

None - plan executed as written. Note: the draft was authored in one pass; the owner review (Phase 3 gate) should prune weak or dated entries. A few mildly crude words are flagged `crude: true`; no slurs were included (two borderline entries were removed during drafting).

## Verification

`npm test` (33 tests) and `npm run format:check` pass.

## Self-Check: PASSED
