---
phase: 02-playable-normal-game
verified: 2026-10-02T00:00:00Z
status: passed
score: 5/5 roadmap success criteria verified (SC4 has one owner-decision caveat)
overrides_applied: 0
gaps: []
human_verification:
  - test: "Decide whether residual inflection-like answers are acceptable"
    expected: "Owner either accepts the stem-in-list heuristic (D-02) as-is, or asks for a follow-up to drop words such as sued, owed, used, died, tied, lied, bred, sped, flied, pended/pends, aging, lying, dying, tying, using, suing, owing, copied, denied, relied, buried, varied, tidied, agreed"
    why_human: "WORD-02 says -s/-ed/-ing inflections are removed. The build removes a word only when its stem is also in the source list (D-02, deliberate), so ~60 verb forms remain across the three Answer Pools (about 2% of 770/857/959 words). The owner reviewed the full lists and cut 41 words but did not cut these. Whether this meets the intent is a judgement call."
---

# Phase 2: Playable Normal Game Verification Report

**Phase Goal:** Users can play a complete, correctly scored Normal game at 4, 5 or 6 letters in the browser.
**Status:** passed (owner accepted residual inflections on 2026-10-02; see 02-HUMAN-UAT.md)
**Re-verification:** No, initial verification.

Note: ROADMAP marks this phase `mode: mvp`, but the goal text is not in "As a..., I want..., so that..." form, so the user-story guard would not pass. I verified against the ROADMAP success criteria instead. This is a documentation inconsistency, not a code gap.

## Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| 1 | Pick 4/5/6 letters with 5/6/7 attempts; on-screen and physical keyboard; keys keep best colour | VERIFIED | `src/logic/boards.ts` BOARD_CONFIG 4:5, 5:6, 6:7; `gameStore.finishReveal` uses it; `usePhysicalKeyboard.ts`, `Keyboard.tsx`, `LengthPicker.tsx` exist and are wired in `App.tsx`; `keys.ts` merges with a tested no-downgrade rule; E2E game.spec passes |
| 2 | Correct repeated-letter scoring; pop/flip/shake; input blocked mid-reveal; key colours update after flip | VERIFIED | `score.ts` is a correct two-pass algorithm (greens first, then a counted yellow pass); `score.test.ts` passes. `typeLetter/backspace/submit` require `status === 'playing'`. Key merge happens only in `finishReveal`, after the timer. Keyframes pop/flip/shake in `game.css`. E2E "keys update after the flip" passes |
| 3 | Invalid or short guess: row shakes, toast, no attempt used | VERIFIED | `submit()` `reject()` sets toast, shakeId and shakeRow and does not append a row; checks `pools.guesses.has`. `gameStore.test.ts` and `e2e/feedback.spec.ts` pass |
| 4 | Loss reveals the answer; random common word, repeats allowed; no plural/inflection/blocklisted word | VERIFIED with caveat | Answer shown on loss (Banner, E2E lose test). `pickAnswer(pools.answers, rng)` is uniform random with no history, so repeats are allowed. I checked the committed pools: all answers are a-z of the right length, none are in `blocklist.txt` or `exclude.txt`, and re-running `build-words.mjs` produces no git diff. Caveat: residual inflection-like words remain (see human verification) |
| 5 | 6x7 grid fits 320 px with dvh layout; reduced motion disables animation; word pools out of entry chunk | VERIFIED | `global.css` uses `100dvh`; `e2e/layout.spec.ts` asserts no scroll at 320 widths, passing; `@media (prefers-reduced-motion: reduce)` at `game.css:463`, JS reveal timer shortens to 150 ms, and the motion E2E passes; `check:bundle OK`, with pools in separate words-4/5/6 chunks (index chunk 232 kB) |

**Score:** 5/5 truths verified; SC4 includes an owner-decision item.

## Commands I ran myself

| Check | Result |
|---|---|
| `npx vitest run` | 13 files, 121 tests pass |
| `npm run lint`, `npm run typecheck` | clean |
| `npm run build` then `node scripts/check-bundle.mjs` | OK, pools in separate chunks |
| `npx playwright test` (chromium + mobile) | 28 passed |
| `node scripts/build-words.mjs` then `git status` | no drift in committed pools |
| Grep for TBD/FIXME/XXX in src, scripts, e2e | none |

## Requirements Coverage

| ID | Status | Evidence |
|---|---|---|
| PLAY-01 | SATISFIED | BOARD_CONFIG, LengthPicker, E2E |
| PLAY-02 | SATISFIED | `score.ts` and tests |
| PLAY-03 | SATISFIED | `submit()` rejection path |
| PLAY-04 | SATISFIED | physical and on-screen keyboard, `keys.ts` |
| PLAY-05 | SATISFIED | keyframes, status lock, post-flip key update |
| PLAY-06 | SATISFIED | lose banner shows answer |
| WORD-02 | SATISFIED with caveat | blocklist/profanity/exclude enforced; inflection heuristic leaves residuals |
| WORD-05 | SATISFIED | `pickAnswer` uniform random |
| WORD-07 | SATISFIED | `scripts/build-words.mjs`, committed JSON, CI `words` job, invariants check answers within guesses |
| WORD-09 | SATISFIED | dynamic `import()` per length, `check:bundle` |
| UI-01 | SATISFIED | owner manually approved the Vercel preview (per orchestrator) |
| UI-06 | SATISFIED | layout E2E at 320 px, `100dvh` |
| UI-09 | SATISFIED | CSS media query plus JS timing, E2E |
| QA-06 | SATISFIED | build passes, `check:bundle` OK, wired in CI |

All 14 IDs in the roadmap map to Phase 2 in REQUIREMENTS.md; no orphaned requirements.

## Code review warnings (02-REVIEW.md), impact on must-haves

None of the four undermines a Phase 2 must-have. All are advisory for later phases.
- WR-01 (test hook live in production): cheating-only now; fix before stats and streaks (Phases 4 and 5).
- WR-02 (Enter on a focused on-screen key submits): affects keyboard-only accessibility, which is a Phase 7 requirement (A11Y). Not a Phase 2 must-have, but cheap to fix.
- WR-03 (reload-on-retry): the "no saved progress" assumption breaks in Phase 4; revisit then.
- WR-04 (reveal timer not token-guarded): safe today because `selectLength` is blocked while revealing.

## Anti-Patterns

None blocking. No debt markers, no stubs; all components are wired to the store with real pool data.

## Human Verification Required

### 1. Residual inflection-like answers

**Test:** Review the list in the frontmatter (or run the one-liner `a.filter(w=>/(s|ed|ing)$/.test(w))` on the pool answers).
**Expected:** Owner accepts the D-02 heuristic, or requests a follow-up (extend `exclude.txt` or loosen MIN_STEM).
**Why human:** Intent of "never a plural or inflection" versus the deliberate stem-in-list design is an owner call.

## Gaps Summary

No blocking gaps. The phase goal, a complete and correctly scored Normal game at 4, 5 and 6 letters, is achieved and tested. Only the owner decision above is outstanding.

---

_Verified: 2026-10-02_
_Verifier: Claude (gsd-verifier)_
