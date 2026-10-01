---
phase: 02-playable-normal-game
plan: 04
subsystem: word-data
tags: [content-review, word-pipeline, exclude-list]
requires: [02-03]
provides:
  - 02-ANSWER-REVIEW.md owner review sheet
  - Owner cut list applied in scripts/words/exclude.txt
  - Regenerated src/data/words-{4,5,6}.json
affects: [02-06, 02-10]
key-files:
  created:
    - .planning/phases/02-playable-normal-game/02-ANSWER-REVIEW.md
  modified:
    - scripts/words/exclude.txt
    - src/data/words-4.json
    - src/data/words-5.json
    - src/data/words-6.json
requirements-completed: [WORD-02]
duration: resumed
completed: 2026-10-01
---

# Phase 2 Plan 04: Owner answer review Summary

Owner reviewed the Normal answer lists (D-07) and cut 41 crude/edgy words and proper nouns from the answers via exclude.txt; they remain valid guesses.

## Tasks

1. Review sheet generated: b5563d6
2. Owner review checkpoint: owner replied "cut all crude and proper nouns"
3. Cuts applied and pools rebuilt: 6c2b6b4

## Cuts (41)

- 4 letters (14): bash, beta, buss, coke, duff, evil, hell, info, lust, pope, scum, sine, slag, zoom
- 5 letters (11): alpha, bible, bigot, bogus, crass, delta, drunk, idiot, moron, roman, smith
- 6 letters (16): bugger, condom, corpse, cuckoo, drivel, french, guinea, heroin, kidnap, python, racism, racist, scotch, sexist, sexual, sinful

The "Words to watch" crude and proper-noun categories matched the owner's list exactly; no additional words were cut. Irregular-inflection, odd-form and archaic categories were not cut (owner did not select them).

## Result

Answers: 4-letter 770, 5-letter 857, 6-letter 959 (all above the 500 floor). Gzip: 7.7 / 17.5 / 31.3 KB. `npx vitest run scripts/words` passes (45 tests). Every cut is absent from answers and present in guesses. A second build produces no drift.

## Deviations from Plan

None - plan executed as written. scripts/words/slang-review.md was listed in files_modified but needed no change.

## Self-Check: PASSED
