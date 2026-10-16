# Phase 2: Playable Normal Game - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-10-01
**Phase:** 02-playable-normal-game
**Areas discussed:** Answer pool quality, Guess pool breadth, Slang in Phase 2, Testing depth now, Test-only answer control

---

## Answer pool quality

| Question | Options | Selected |
|----------|---------|----------|
| Tiers for Normal answers | Tiers 10+20 / Tier 10 only / Tiers 10+20+35 / You decide | Tiers 10+20 |
| Inflection detection | Stem-in-list check / Blunt suffix rule / Stem check + manual allow list | Stem-in-list check |
| Owner hand-review | Human checkpoint / Review async / Claude skims, owner spot-checks | Human checkpoint |
| Extra filters (multi) | British spellings / Abbreviations-proper nouns / Minimum pool size assert | Abbreviations-proper nouns; Minimum pool size assert |
| Profanity source | obscenity + hand blocklist / Hand blocklist only / obscenity only | obscenity + hand blocklist |
| Crude-but-not-profane words | Block them / Allow mild ones | Allow mild ones |

**Notes:** Allowing mild crude words relaxes the PROJECT.md "clean common words" wording. The review checkpoint is the safety net.

---

## Guess pool breadth

| Question | Options | Selected |
|----------|---------|----------|
| Guess tiers | Up to 70 / Up to 35 / Full dictionary (80/95) | Full dictionary |
| Spelling variants | Include all / American only | Include all |
| Size budget | Fail over budget / Report only / No check | Fail over budget |
| Missing-word path | extra-guesses.txt / Not needed | extra-guesses.txt |
| Loading shape | One chunk per length / Answers first, guesses after / Prefetch all lengths | One chunk per length |
| Odd characters | Drop / Strip accents | Drop |

---

## Slang in Phase 2

| Question | Options | Selected |
|----------|---------|----------|
| Slang handling | Draft now, merge into guesses / Draft now, merge after review / Empty file, draft in Phase 3 | Draft now, merge into guesses |
| Entry shape | word + definition + flags / word + definition only | word + definition + flags |
| Review method | Readable review sheet / Edit JSON directly / Artifact page | Readable review sheet |
| Blocklist collisions | Flag in review sheet / Blocklist always wins | Flag in review sheet |

---

## Testing depth now

| Question | Options | Selected |
|----------|---------|----------|
| E2E in Phase 2 | Small E2E suite / Layout checks only / Defer all | Small E2E suite |
| CI word-drift check | Now / Later | Now |

---

## Test-only answer control

| Question | Options | Selected |
|----------|---------|----------|
| How E2E fixes the answer | Injected RNG via test hook / URL param non-prod only / URL param everywhere | Injected RNG via test hook |

---

## Claude's Discretion

- State shape (Zustand vs reducer), generated file format/location, exact min pool size and size budget, the test hook's name, and where the word-list text files live.

## Deferred Ideas

- Prefetching other lengths (not chosen)
- Artifact page for slang review (not chosen)
