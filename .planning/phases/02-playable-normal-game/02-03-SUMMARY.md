---
phase: 02-playable-normal-game
plan: 03
subsystem: word-data
tags: [word-pipeline, obscenity, wordlist-english, vitest]
requires: [02-02]
provides:
  - scripts/words/lib.mjs pure pipeline helpers
  - npm run build:words (scripts/build-words.mjs)
  - src/data/words-{4,5,6}.json generated pools
  - scripts/words/slang-review.md owner review sheet
affects: [02-04, 02-06, 02-10]
key-files:
  created:
    - scripts/words/lib.mjs
    - scripts/words/lib.test.mjs
    - scripts/words/pools.test.mjs
    - scripts/build-words.mjs
    - scripts/words/blocklist.txt
    - scripts/words/exclude.txt
    - scripts/words/extra-guesses.txt
    - scripts/words/slang-review.md
    - src/data/words-4.json
    - src/data/words-5.json
    - src/data/words-6.json
  modified: [package.json, package-lock.json, eslint.config.js, .prettierignore]
requirements-completed: [WORD-02, WORD-07]
duration: resumed
completed: 2026-10-01
---

# Phase 2 Plan 03: Word pipeline Summary

Deterministic word-data build (wordlist-english plus obscenity) with stem-rule inflection filtering, producing committed per-length answer and guess pools.

## Tasks

1. Helpers test-first: c1b6732 (RED), 9788e76 (GREEN)
2. Build script, list files, pools, invariant test: 17b0804

## Results

| Length | Answers | Guesses | gzip |
| ------ | ------- | ------- | ---- |
| 4 | 784 | 2456 | 7.7 KB |
| 5 | 868 | 5672 | 17.5 KB |
| 6 | 975 | 9969 | 31.3 KB |

Obscenity drops from answers: sexy (4), assort (6, accepted false positive per owner decision). A second `npm run build:words` leaves no git changes. Lint, format:check, typecheck and 68 tests pass.

## Deviations from Plan

None in substance. The previous executor's lib.mjs was reviewed, kept, and only reformatted with Prettier. Dropped-slang counts: 22 four-letter and 25 five-letter slang words are also common words and were kept out of answers.

## Notes

- blocklist.txt seeded with violence, sexual and slur terms (answers only; still valid guesses). exclude.txt is empty until the owner review in 02-04.

## Self-Check: PASSED
