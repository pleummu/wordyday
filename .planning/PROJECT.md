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

- ✓ Win Streak per Board; Day Streak once per local day; missed-day check on open, focus and midnight; 3 Restores a month covering gaps of up to 4 days (deferred credit goes to the play day after CR-01): validated in Phase 5 — v1.0
- ✓ Statistics per mode with 4/5/6/All tabs, Day Streak and "Restores left" shown globally: validated in Phase 5 — v1.0
- ✓ Result screen with Play again, Share (emoji grid, share sheet with clipboard fallback, colour-blind squares) and on-demand definitions (curated slang, dictionaryapi.dev, "Definition unavailable" fallback): validated in Phase 6 — v1.0
- ✓ Answer pools filtered with a blocklist and owner-reviewed exclusions: validated in Phases 2-3 — v1.0
- ✓ Vitest unit tests, Playwright full-game E2E, full GitHub Actions CI and docs/PIPELINE.md: validated in Phase 8 — v1.0

### Active

No milestone in progress. Candidates for the next one:

- [ ] Phase 5 review warnings WR-01..WR-05 (future clock freezes streak, stale-tab streak overwrite, simultaneous two-tab streak change, Day Streak toast lost on fast Play again, WR-05 accessibility)
- [ ] PWA / offline install (deferred from v1)
- [ ] Analytics (deferred from v1)

### Out of Scope

- Hard mode: explicitly decided against
- Daily puzzle (same word for everyone): the game is "unlimited"; the Day Streak covers the daily habit
- Accounts, backend, cloud sync: localStorage only; no server needed for v1
- Leaderboards / multiplayer: needs a backend; not part of the core value
- Restoring Win Streaks: a Restore only ever covers the Day Streak, by design

## Current State

**Shipped:** v1.0 MVP on 2026-10-17, live at https://wordyday.vercel.app. All 62 v1 requirements are done.
About 14.9k lines in `src/` (React 19, Vite 8, TypeScript 6, Zustand 5, plain CSS), 686 unit/component tests and 437 Playwright E2E tests running in CI. The save format is at v4.

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
| Two streak types: Win Streak per Board + global Day Streak | Resolves the "unlimited vs daily" contradiction | ✓ Good (shipped v1.0) |
| Restore: 3/month, missed ≤ 4 days, never restores Win Streaks | Forgiving without making streaks meaningless | ✓ Good (shipped v1.0) |
| Slang is a valid guess in Normal but never the answer | Resolves the "every word vs dictionary only" contradiction | ✓ Good (shipped v1.0) |
| Wordubado: 75% slang / 25% common answers | Keeps the mode distinct while slang pools stay small | ✓ Good (shipped v1.0) |
| New game mid-game / Give up = loss, with confirm | Stops players dodging losses to protect streaks | ✓ Good (shipped v1.0) |
| Separate stats for Normal and Wordubado | The modes differ in difficulty; mixing would skew stats | ✓ Good (shipped v1.0) |
| Public Vercel deploy with full CI (incl. Playwright) in v1 | The owner wants to learn the whole pipeline | ✓ Good (shipped v1.0) |

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

---
*Last updated: 2026-10-17 after v1.0 milestone*
