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

### Active

**Gameplay**
- [ ] Two modes: Normal and Wordubado; three lengths: 4/5/6 letters with 5/6/7 attempts
- [ ] Normal answers are common English words only; slang is a valid guess in Normal but never the answer
- [ ] Wordubado answers are 75% slang and 25% common words, chosen per game; Wordubado has an (i) info popup
- [ ] Answers are fully random (repeats allowed)
- [ ] Standard scoring: greens first, then yellows limited by the remaining count of that letter
- [ ] Keyboard keys keep their best state (green > yellow > gray); both the on-screen and physical keyboards work
- [ ] An invalid or too-short guess makes the row shake and shows a toast, and does not use an attempt
- [ ] Tile flip, pop and shake animations

**Boards and persistence**
- [ ] 6 Boards (2 modes × 3 lengths), each with its own saved in-progress game in localStorage
- [ ] Switching mode or length never forfeits; refreshing resumes the game
- [ ] "New game" mid-game and "Give up" both show a confirm dialog and count as a loss; Give up reveals the answer
- [ ] Saved data has a version number and is migrated on load
- [ ] Settings has a "Reset my data" option

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
- [ ] How-to-play modal, opened automatically on the first visit
- [ ] Dark mode and colour-blind (high-contrast) palette
- [ ] Accessibility: screen-reader announcements of tile results, focus handling in modals, prefers-reduced-motion support
- [ ] Answer pools are filtered with a blocklist (no obscure, offensive or crude answers in Normal)
- [ ] Page title and description, link-preview (Open Graph) image, favicon
- [ ] Works at phone width

**Docs and pipeline**
- [x] SPEC.md (corrected spec) and GLOSSARY.md (Board, Mode, Normal, Wordubado, Answer Pool, Guess Pool, Win Streak, Day Streak, Missed Day, Restore, Forfeit, Give Up)
- [ ] Word-list build script (scripts/build-words.mjs) producing answer/guess pools for 4-6 letters
- [ ] Curated slang.json (~80-150 words per length, with definitions; mild words allowed, never slurs or hate terms), reviewed by the owner
- [ ] Vitest unit tests for scoring, answer picking, streaks/Restore and storage
- [ ] Playwright end-to-end tests of full games
- [ ] GitHub Actions CI: lint, typecheck, unit tests, E2E, build
- [x] Vercel preview deploys for PRs and a production deploy from main
- [ ] docs/PIPELINE.md: a learning guide to the phases, the GSD workflow and the build/test/deploy pipeline

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
*Last updated: 2026-10-01 after Phase 1 (Foundation, Spec and CI Skeleton) complete*
