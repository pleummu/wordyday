# Unlimited Wordle

## What This Is

A public, endless Wordle game on the web (deployed to Vercel). Players can choose 4, 5 or 6-letter words and play as many games as they like, in two modes: **Normal** (common English answers) and **Wordubado** (mostly slang, meme and Gen Z answers). It tracks a Win Streak for each Board and one global Day Streak with monthly Restores. It is also a learning and portfolio project: the owner wants to learn the full pipeline, from spec to word-data build to tests, CI and deploy.

## Core Value

**Endless, correct Wordle play.** Scoring (including repeated letters), word validation and a smooth, responsive feel must be right for all three lengths. Everything else comes second.

## Requirements

### Validated

- ✓ SPEC.md (corrected spec) and GLOSSARY.md (twelve terms): validated in Phase 1: Foundation, Spec and CI Skeleton
- ✓ Vercel preview deploys for PRs and a production deploy from main (https://wordyday.vercel.app): validated in Phase 1
- ✓ Tooling baseline: React + Vite + TypeScript 6.0.x, ESLint 10, Prettier, Vitest, Node 24, baseline GitHub Actions CI: validated in Phase 1
- ✓ Answers are fully random (repeats allowed): validated in Phase 2: Playable Normal Game
- ✓ Standard scoring: greens first, then yellows limited by the remaining count of that letter: validated in Phase 2: Playable Normal Game
- ✓ Keyboard keys keep their best state (green > yellow > gray); both the on-screen and physical keyboards work: validated in Phase 2: Playable Normal Game
- ✓ An invalid or too-short guess makes the row shake and shows a toast, and does not use an attempt: validated in Phase 2: Playable Normal Game
- ✓ Tile flip, pop and shake animations: validated in Phase 2: Playable Normal Game
- ✓ Works at phone width: validated in Phase 2: Playable Normal Game
- ✓ Word-list build script (scripts/build-words.mjs) producing answer/guess pools for 4-6 letters: validated in Phase 2: Playable Normal Game
- ✓ Two modes (Normal and Wordubado) across 4/5/6 letters with 5/6/7 attempts, switched from the header: validated in Phase 3: Wordubado Mode and Slang
- ✓ Normal answers are common words only; slang is a valid guess in Normal but never the answer: validated in Phase 3: Wordubado Mode and Slang
- ✓ Wordubado answers are 75% slang and 25% common words per game (seeded 10,000-draw test), with an (i) info popup and a mildly-crude warning: validated in Phase 3: Wordubado Mode and Slang
- ✓ Curated slang.json (95/110/95 words, with definitions, no blocklist hits), reviewed by the owner on 2026-10-02 with no cuts: validated in Phase 3: Wordubado Mode and Slang
- ✓ 6 Boards (2 modes × 3 lengths), each with its own saved game; switching never forfeits; refresh resumes: validated in Phase 4: Six Boards and Persistence
- ✓ "New game" and "Give up" at exactly 2 tries left, with a confirm, count as a loss; Give up reveals the answer: validated in Phase 4
- ✓ Versioned saved data with a migration chain; corrupt data backed up, newer-version saves left untouched (read-only session); blocked/full storage still plays: validated in Phase 4
- ✓ Two open tabs stay on the same game (per-Board merge by game id); Settings "Reset my data" with a confirm: validated in Phase 4

- ✓ How-to-play modal, opened automatically on the first visit and from a '?' header button: validated in Phase 7: Themes, Accessibility and Polish
- ✓ Dark mode (System/Light/Dark, no white flash) and colour-blind palette: validated in Phase 7
- ✓ Accessibility: screen-reader announcements of tile results, focus handling in modals, keyboard-only play, axe in all four theme/palette combinations: validated in Phase 7
- ✓ Page title and description, link-preview (Open Graph) image, favicon, noscript message: validated in Phase 7

### Active

**Gameplay**

**Streaks and Restore**
- [ ] Win Streak per Board: +1 on a win; resets on a loss, Give Up or Forfeit
- [ ] Day Streak (global): +1 at most once per local calendar day when any game finishes
- [ ] Missed-day check on open, and again when the tab regains focus or the date changes: any missed day resets all Win Streaks
- [ ] Restore prompt when Day Streak > 0, missed ≤ 4 and a Restore is left this month; one Restore covers the whole gap; lastActiveDate is set to yesterday
- [ ] 3 Restores per calendar month, refilled on the 1st, unused ones don't carry over; declining resets the Day Streak; a clock moved backwards counts as missed = 0

**Statistics and result screen**
- [ ] Stats: games played, win rate, current/longest Win Streak, guess distribution, average guesses (wins only)
- [ ] Tabs 4/5/6/All, kept separate for Normal and Wordubado; the All tab shows totals only (no Win Streak)
- [ ] Day Streak (current/longest) and "Restores left: N/3" shown globally
- [ ] Result screen: won/lost, answer, attempts, stats, Play again, Share
- [ ] "Show definition" button (hidden until clicked): curated definition for slang, dictionaryapi.dev for common words, "Definition unavailable" if the lookup fails
- [ ] Share: emoji grid ("Unlimited Wordle - Wordubado 5 - 4/6", X/n for a loss, 🟧🟦 in colour-blind mode); phone share sheet with clipboard fallback

**Extras and polish**
- [ ] Answer pools are filtered with a blocklist (no obscure, offensive or crude answers in Normal)

**Docs and pipeline**
- [x] SPEC.md (corrected spec) and GLOSSARY.md (Board, Mode, Normal, Wordubado, Answer Pool, Guess Pool, Win Streak, Day Streak, Missed Day, Restore, Forfeit, Give Up)
- [x] Vitest unit tests for scoring, answer picking, streaks/Restore and storage: validated in Phase 8
- [x] Playwright end-to-end tests of full games: validated in Phase 8
- [x] GitHub Actions CI: lint, typecheck, unit tests, E2E, build: validated in Phase 8
- [x] Vercel preview deploys for PRs and a production deploy from main
- [x] docs/PIPELINE.md: a learning guide to the phases, the GSD workflow and the build/test/deploy pipeline: validated in Phase 8

### Out of Scope

- Hard mode: explicitly decided against
- Daily puzzle (same word for everyone): the game is "unlimited"; the Day Streak covers the daily habit
- Accounts, backend, cloud sync: localStorage only; no server needed for v1
- Leaderboards / multiplayer: needs a backend; not part of the core value
- PWA / offline install: deferred to v2
- Analytics: deferred to v2
- Restoring Win Streaks: a Restore only ever covers the Day Streak, by design

## Context

- Greenfield. The original spec (`Downloads\Unlimited Wordle.txt`) contradicted itself ("unlimited" vs "daily streak"; "every word including slang" vs "dictionary words only"). These were resolved in a Q&A session and recorded in `plan.txt`, which is the source of truth for game rules.
- The owner is learning: docs should explain *why* as well as *what*. docs/PIPELINE.md is a deliverable in its own right.
- Word data comes from the `wordlist-english` npm package; definitions for common words come from dictionaryapi.dev (free, no key, may be offline).
- Slang content is public-facing: Claude drafts it and the owner reviews it.

## Constraints

- **Tech stack**: React + Vite + TypeScript, Vitest, Playwright. Chosen for learning value and fast static builds.
- **Hosting**: Vercel, as a static site. No server functions needed.
- **Storage**: localStorage only. Saved data must be versioned so existing players' data survives updates.
- **Design**: minimal, soft, light-feeling. Airy palette, soft rounded tiles, gentle animations, generous white space; dark mode keeps the same softness. Not a copy of the NYT look.
- **Accessibility**: respects prefers-reduced-motion; supports screen readers and keyboard-only play.
- **Content**: slang can be mildly crude, but never slurs or hate terms; Normal answers are clean common words.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Two streak types: Win Streak per Board + global Day Streak | Resolves the "unlimited vs daily" contradiction | — Pending |
| Restore: 3/month, missed ≤ 4 days, never restores Win Streaks | Forgiving without making streaks meaningless | — Pending |
| Slang is a valid guess in Normal but never the answer | Resolves the "every word vs dictionary only" contradiction | — Pending |
| Wordubado: 75% slang / 25% common answers | Keeps the mode distinct while slang pools stay small | — Pending |
| New game mid-game / Give up = loss, with confirm | Stops players dodging losses to protect streaks | — Pending |
| Separate stats for Normal and Wordubado | The modes differ in difficulty; mixing would skew stats | — Pending |
| Public Vercel deploy with full CI (incl. Playwright) in v1 | The owner wants to learn the whole pipeline | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check: still the right priority?
3. Audit Out of Scope: reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-16 after Phase 8 (E2E, CI Hardening and Pipeline Docs) complete: Phases 2-7 landed on protected main via green PRs, bundle budget and browser cache in CI, PIPELINE.md finished*
