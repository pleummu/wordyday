---
phase: 03-wordubado-mode-and-slang
plan: 01
subsystem: word-data
tags: [slang, profanity, review, word-pipeline]
requires: []
provides:
  - owner-reviewed slang.json (all entries reviewed true)
  - shared isProfane blocklist cut and cut-list (slang-cuts.txt)
  - slang tests enforcing reviewed, blocklist and cut invariants
affects: [wordubado answers]
tech-stack:
  added: []
  patterns: [auto-cut via shared isProfane + blocklist.txt, cut-list file]
key-files:
  created: [scripts/words/profanity.mjs, scripts/words/apply-slang-review.mjs, scripts/words/slang-cuts.txt]
  modified: [scripts/words/lib.mjs, scripts/words/slang.json, scripts/words/slang.test.mjs, scripts/build-words.mjs, package.json]
key-decisions:
  - "Owner approved the slang list with no cuts on 2026-10-02; no common-word overrides"
  - "Auto-cuts arse, turd, wank stand; SLANG_MIN_PER_LENGTH stays 80"
requirements-completed: [WORD-08]
duration: n/a
completed: 2026-10-02
---

# Phase 3 Plan 01: Slang review and blocklist cut Summary

Slang pool auto-cut against the shared profanity matcher and blocklist, owner-reviewed (approved, no cuts, 2026-10-02), and locked in with tests.

## Tasks

1. Auto-cut blocklist hits and cut-list review sheet: 72d7242
2. Owner review checkpoint: approved, no cuts, no overrides
3. Record review, mark reviewed, extend tests: 75d2b4f

## Results

- Slang counts: 4-letter 95, 5-letter 110, 6-letter 95 (all at or above the floor of 80).
- Normal answer pools unchanged (src/data not modified after build; no words entered or left). exclude.txt unchanged.
- Tests added: reviewed true (D-02), no blocklist hits (D-03), no cut word; SLANG_MIN/MAX_PER_LENGTH constants.
- `npx vitest run scripts/words` and full `npm test` pass (128 tests); second build shows no drift.

## Deviations from Plan

None - plan executed as written (no-cuts path).

## Known Stubs

None.

## Self-Check: PASSED
