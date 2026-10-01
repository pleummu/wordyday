# Roadmap: Unlimited Wordle

## Overview

Vertical MVP: a playable game appears as early as possible (Phase 2), then each later phase adds one complete, user-visible capability on top (Wordubado, six saved Boards, streaks, results and sharing, polish). The hard ordering constraints from research are respected: SPEC.md and the tooling/CI skeleton come first; scoring is pure and test-first inside the first playable slice; the versioned storage schema (Phase 4) is settled before streaks (Phase 5); streak/Restore logic is table-driven with tests; slang drafting starts early because the owner's review is a human gate. CI starts in Phase 1 and grows every phase, so the pipeline is a learning thread, and the full E2E/hardening pass closes the project.

## Phases

- [ ] **Phase 1: Foundation, Spec and CI Skeleton** - Scaffold, lint/test tooling, SPEC.md/GLOSSARY.md, baseline CI and Vercel previews
- [ ] **Phase 2: Playable Normal Game** - Play a correct, animated Normal game at 4/5/6 letters from a generated word pool
- [ ] **Phase 3: Wordubado Mode and Slang** - Switch to Wordubado with owner-reviewed slang answers, plus slang as a valid Normal guess
- [ ] **Phase 4: Six Boards and Persistence** - Six independent saved Boards that survive refresh, with safe, versioned storage
- [ ] **Phase 5: Stats, Streaks and Restore** - Win Streaks, Day Streak, monthly Restores and the statistics screen
- [ ] **Phase 6: Result Screen, Share and Definitions** - Result modal with Play again, Show definition and Share
- [ ] **Phase 7: Themes, Accessibility and Polish** - Dark/colour-blind themes, how-to-play, screen-reader and keyboard support, metadata
- [ ] **Phase 8: E2E, CI Hardening and Pipeline Docs** - Playwright full-game suite, complete CI, and the PIPELINE.md learning guide

## Phase Details

### Phase 1: Foundation, Spec and CI Skeleton

**Goal**: The project has a settled spec and a working build/test/deploy pipeline, so every later phase ships through CI and a Vercel preview
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: QA-01, QA-05, DOC-01, DOC-02
**Success Criteria** (what must be TRUE):

  1. Owner can read SPEC.md and find every owner decision, the full Restore state machine and the edge-case table in one place
  2. Owner can read GLOSSARY.md and find all twelve defined terms (Board, Mode, Normal, Wordubado, Answer Pool, Guess Pool, Win Streak, Day Streak, Missed Day, Restore, Forfeit, Give Up)
  3. Running install, lint, format check, typecheck, unit tests and build on a fresh clone succeeds (React + Vite + TypeScript 6.0.x, Node 24)
  4. Opening a pull request triggers a baseline GitHub Actions run and a Vercel preview URL that shows the placeholder app; merging to main publishes to production

**Plans**: 6 plans

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Scaffold React/Vite/TS 6 with ESLint 10, Prettier, Vitest; Unlimited Wordle placeholder page test-first

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — SPEC.md: ID-tagged rules, Restore state machine, EC-01..EC-44, owner-overridable defaults

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — GLOSSARY.md with the twelve terms, cross-linked with SPEC.md

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — Baseline CI check job, PR 1 green, fresh-clone proof, owner reviews SPEC/GLOSSARY

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-05-PLAN.md — Merge PR 1, owner connects Vercel (checkpoint), proof PR 2 with preview

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 01-06-PLAN.md — Owner verifies preview, merge PR 2, prove production deploy from main

**Notes**: Baseline CI (lint, format, typecheck, unit, build) starts here; QA-04 is completed in Phase 8 after later phases add word-drift and E2E jobs. Research flag: confirm whether the scaffold installs TS 6 or 7 and typescript-eslint's peer range.

### Phase 2: Playable Normal Game

**Goal**: Users can play a complete, correctly scored Normal game at 4, 5 or 6 letters in the browser
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04, PLAY-05, PLAY-06, WORD-02, WORD-05, WORD-07, WORD-09, UI-01, UI-06, UI-09, QA-06
**Success Criteria** (what must be TRUE):

  1. User can pick 4, 5 or 6 letters and play with 5, 6 or 7 attempts, using the on-screen or physical keyboard, and keys keep their best colour
  2. User sees correct scoring on repeated letters (e.g. a guess with two of a letter against an answer with one) and the tile flip, pop and shake animations; input is blocked mid-reveal and key colours update after the flip
  3. User who types an invalid or too-short word sees the row shake and a toast, and no attempt is used
  4. User who runs out of attempts sees the answer revealed; every new game draws a random common word (repeats allowed) that is never a plural or inflection or a blocklisted word
  5. The largest grid (6 letters x 7 rows) fits a 320 px phone with a dvh-safe layout, animations are disabled under prefers-reduced-motion, and the production build keeps word pools out of the entry chunk

**Plans**: TBD
**UI hint**: yes
**Notes**: Scoring and answer picking are pure modules written test-first. The word build script, blocklist and committed JSON land here (Normal pools plus guess pools); slang is added in Phase 3. Slang drafting for slang.json starts in parallel during this phase so the owner's review does not block Phase 3.

### Phase 3: Wordubado Mode and Slang

**Goal**: Users can switch to Wordubado and play slang-heavy games, and can guess slang words in Normal
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: WORD-01, WORD-03, WORD-04, WORD-06, WORD-08, UI-05
**Success Criteria** (what must be TRUE):

  1. User can use the header mode toggle and length picker to switch between Normal and Wordubado at any length (header also has help/stats/settings buttons)
  2. In Wordubado, about 75% of answers are slang and 25% are common words; in Normal, a slang word is accepted as a guess but never appears as the answer
  3. User can open the Wordubado (i) popup and read what the mode is and the warning about mildly crude content
  4. Owner has reviewed slang.json (about 80-150 words per length, each with a definition, no slurs or hate terms) and the validation test passes

**Plans**: TBD
**UI hint**: yes
**Notes**: Human gate: owner review of slang.json. The 75/25 split is verified over 10,000 seeded draws.

### Phase 4: Six Boards and Persistence

**Goal**: Users keep six independent games that survive refresh, mode/length switches and bad storage
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: SAVE-01, SAVE-02, SAVE-03, SAVE-04, SAVE-05, SAVE-06, SAVE-07, SAVE-08, SAVE-09, PLAY-07, PLAY-08, UI-11
**Success Criteria** (what must be TRUE):

  1. User can play on any of the six Boards, switch mode or length without losing progress, refresh the page and resume (half-typed row discarded)
  2. User returning to a finished Board sees the finished grid, a result banner and Play again; a new game starts only on Play again
  3. User can press Give Up or New game mid-game only when exactly 2 tries are left; a confirm dialog appears, Give Up reveals the answer, and it counts as a loss
  4. User with corrupt or hand-edited saved data, or with blocked/full localStorage, still gets a working site; two open tabs stay in sync
  5. User can reset all data from Settings after a confirm, and sees a note that progress is stored in this browser only

**Plans**: TBD
**UI hint**: yes
**Notes**: Schema versioning and the migration chain are settled here, before any streak data exists. A Modal primitive (focus trap, Esc, focus return) is built here for the confirm dialogs.

### Phase 5: Stats, Streaks and Restore

**Goal**: Users see accurate Win Streaks, a global Day Streak with monthly Restores, and full statistics
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: STRK-01, STRK-02, STRK-03, STRK-04, STRK-05, STRK-06, STRK-07, STRK-08, STAT-01, STAT-02, STAT-03, STAT-04, QA-02
**Success Criteria** (what must be TRUE):

  1. User's Board Win Streak goes up on a win and resets on a loss, Give Up or Forfeit; Day Streak goes up at most once per local day when any game finishes
  2. User who misses days sees all Win Streaks reset; if the Day Streak is above 0, missed days are 4 or fewer and a Restore is left, a blocking prompt asks to Restore (K left this month), and the prompt reappears after a refresh until answered
  3. User choosing Restore keeps the streak number for one Restore; choosing No resets the Day Streak; 3 Restores refill on the 1st of each month and do not carry over
  4. User can open Stats with 4 / 5 / 6 / All tabs, separate for Normal and Wordubado, showing games played, win rate, current/longest Win Streak, guess distribution, average guesses, Day Streak and "Restores left: N/3"; zero games shows no errors
  5. The missed-day check runs on open, on tab focus and on date change, is repeatable, and is DST-safe and clock-moved-backwards-safe

**Plans**: TBD
**UI hint**: yes
**Notes**: Table-driven streak/Restore tests (DST, month boundary, clock backwards, year end, Feb 29, TZ matrix) plus scoring, 75/25, forfeit and storage unit tests complete QA-02 here.

### Phase 6: Result Screen, Share and Definitions

**Goal**: Users get a satisfying end-of-game screen where they can replay, learn the word and share the result
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: RSLT-01, RSLT-02, RSLT-03, RSLT-04
**Success Criteria** (what must be TRUE):

  1. User finishing a game sees won/lost, the answer, attempts used, stats and a Play again button
  2. User can click "Show definition" (hidden until clicked) and see a curated definition for slang, a dictionaryapi.dev definition for common words, or "Definition unavailable" on timeout, error or offline
  3. User can share an emoji grid headed "Unlimited Wordle - Wordubado 5 - 4/6" (X/n for a loss, orange/blue squares in colour-blind mode) plus the site URL
  4. User on a phone gets the share sheet; otherwise the result is copied to the clipboard with a "Copied" toast

**Plans**: TBD
**UI hint**: yes
**Notes**: Research flag: dictionaryapi.dev availability/CORS and iOS Web Share/clipboard behaviour.

### Phase 7: Themes, Accessibility and Polish

**Goal**: The game looks soft and polished in every theme, works for screen-reader and keyboard-only players, and is ready to be linked publicly
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: UI-02, UI-03, UI-04, UI-07, UI-08, UI-10
**Success Criteria** (what must be TRUE):

  1. User can switch to dark mode (first visit follows the system preference, no theme flash on load) and turn on the colour-blind high-contrast palette
  2. New user sees the How-to-play modal automatically on the first visit and can reopen it from the header
  3. Screen-reader user hears each guess result through an aria-live region and tiles and keys have accessible labels
  4. Keyboard-only user can play the whole game; modals trap focus, close on Esc and return focus
  5. Sharing the link shows a title, description, Open Graph image (absolute URL) and favicon; with JavaScript disabled a noscript message appears

**Plans**: TBD
**UI hint**: yes
**Notes**: Needs an iOS dvh/device or WebKit check. The production domain is set when deploying (needed for OG tags and share URL).

### Phase 8: E2E, CI Hardening and Pipeline Docs

**Goal**: The whole game is proven by automated end-to-end tests, CI gates every change, and the owner has a learning guide to the pipeline
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: QA-03, QA-04, DOC-03
**Success Criteria** (what must be TRUE):

  1. Playwright tests against the production build pass in desktop and mobile projects: full win and loss, invalid guess, resume after refresh, switching Boards, Give Up rule, Restore prompt (fake clock) and an axe accessibility check
  2. Every PR and push to main runs lint, format check, typecheck, unit tests, build, E2E and the word-drift check, and a failing check is visible on the PR
  3. Owner can read docs/PIPELINE.md and follow the phases, the GSD workflow (discuss, plan, execute, verify) and the words-build, Vite, Vitest, Playwright, CI, Vercel flow with "what you'll learn" notes

**Plans**: TBD
**Notes**: Research flag: Playwright page.clock/reducedMotion and current actions/* versions. Includes the bundle budget and branch protection.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation, Spec and CI Skeleton | 4/6 | In Progress|  |
| 2. Playable Normal Game | 0/TBD | Not started | - |
| 3. Wordubado Mode and Slang | 0/TBD | Not started | - |
| 4. Six Boards and Persistence | 0/TBD | Not started | - |
| 5. Stats, Streaks and Restore | 0/TBD | Not started | - |
| 6. Result Screen, Share and Definitions | 0/TBD | Not started | - |
| 7. Themes, Accessibility and Polish | 0/TBD | Not started | - |
| 8. E2E, CI Hardening and Pipeline Docs | 0/TBD | Not started | - |
