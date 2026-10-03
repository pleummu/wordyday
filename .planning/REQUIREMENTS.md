# Requirements: Unlimited Wordle

**Defined:** 2026-10-01
**Core Value:** Endless, correct Wordle play. Scoring (including repeated letters), word validation and a smooth, responsive feel must be right for all three lengths.

## v1 Requirements

### Gameplay (PLAY)

- [x] **PLAY-01**: User can play with 4, 5 or 6-letter words, getting 5, 6 or 7 attempts respectively
- [x] **PLAY-02**: User sees each guess scored correct/present/absent, with greens scored first and yellows limited by how many of that letter remain in the answer
- [x] **PLAY-03**: User can only submit guesses from the Guess Pool for that length; an invalid or too-short guess shakes the row, shows a toast and does not use an attempt
- [x] **PLAY-04**: User can type with both the on-screen and the physical keyboard; keys keep their best state (green > yellow > gray)
- [x] **PLAY-05**: User sees tile pop (typing), flip (reveal) and shake (invalid) animations; input is blocked while a row is revealing; keyboard colours update after the flip finishes
- [x] **PLAY-06**: User sees the answer revealed when they lose
- [ ] **PLAY-07**: User can only Give Up when exactly 2 tries are left; Give Up asks to confirm, reveals the answer and counts as a loss
- [ ] **PLAY-08**: User can only press New game mid-game under the same rule (exactly 2 tries left), with the same confirm; it counts as a loss (forfeit). New game is always available once a game is finished

### Modes and Word Pools (WORD)

- [x] **WORD-01**: User can switch between Normal and Wordubado modes
- [x] **WORD-02**: In Normal mode, answers are common English words only: blocklisted words removed, plurals and inflections (-s, -ed, -ing) removed
- [x] **WORD-03**: User can guess slang/meme/Gen Z words in Normal mode, but they are never the answer
- [x] **WORD-04**: In Wordubado mode, each game's answer is slang 75% of the time and a common word 25% of the time
- [x] **WORD-05**: Answers are fully random (repeats allowed)
- [x] **WORD-06**: User can open a Wordubado (i) popup that explains the mode and warns about mildly crude content
- [x] **WORD-07**: A build script generates the answer and guess pools for 4-6 letters from `wordlist-english` with a blocklist; every answer and every slang word is also in the guess pool; generated JSON is committed and CI checks it hasn't drifted
- [x] **WORD-08**: `slang.json` holds ~80-150 curated words per length, each with a definition; mild words are allowed, slurs and hate terms never; owner-reviewed; validated by a unit test (length, non-empty definition, no duplicates, not blocklisted)
- [x] **WORD-09**: Word pools are lazy-loaded per length (not in the initial bundle)

### Boards and Persistence (SAVE)

- [x] **SAVE-01**: User has 6 independent Boards (2 modes × 3 lengths), each with its own saved game
- [ ] **SAVE-02**: User can switch mode or length without forfeiting, and returns to the same game later
- [x] **SAVE-03**: User can refresh the page and resume the in-progress game (submitted guesses only; a half-typed row is discarded)
- [x] **SAVE-04**: User returning to a finished Board sees the finished grid with a result banner and Play again; a new game starts only on Play again
- [x] **SAVE-05**: Saved data has a version number and a migration chain from the first release
- [x] **SAVE-06**: Corrupt or hand-edited saved data never white-screens the site: it is validated on load, backed up under a separate key, and the app starts fresh
- [ ] **SAVE-07**: The app still works (in memory) when localStorage is unavailable or full
- [ ] **SAVE-08**: Two open tabs stay in sync via the `storage` event
- [ ] **SAVE-09**: User can reset all data (games, stats, streaks, Restores) from Settings after a confirm

### Streaks and Restore (STRK)

- [ ] **STRK-01**: Each Board has a Win Streak: +1 on a win; resets to 0 on a loss, Give Up or Forfeit
- [ ] **STRK-02**: User has one global Day Streak: +1 at most once per local calendar day when any game finishes (win, loss or Give Up)
- [ ] **STRK-03**: Missed days are computed from local calendar dates (DST-safe); a clock moved backwards counts as 0 missed days and never overwrites lastActiveDate
- [ ] **STRK-04**: The missed-day check runs on app open, when the tab regains focus and when the date changes; running it again gives the same result
- [ ] **STRK-05**: Any missed day resets every Board's Win Streak to 0; a Restore never brings them back
- [ ] **STRK-06**: If Day Streak > 0, missed ≤ 4 and a Restore is left this month, the user sees a blocking Restore prompt ("Your N-day streak broke. Restore it? (K left this month)") and cannot play until they answer; otherwise the Day Streak resets to 0 with no prompt
- [ ] **STRK-07**: Choosing Restore uses 1 Restore for the whole gap, keeps the streak number and sets lastActiveDate to yesterday; choosing No resets the Day Streak; refreshing without answering shows the prompt again
- [ ] **STRK-08**: User gets 3 Restores per calendar month, refilled on the 1st (before any offer); unused ones don't carry over; each is counted against the month it is used in

### Statistics (STAT)

- [ ] **STAT-01**: User can view games played, win rate, current/longest Win Streak, guess distribution and average guesses (won games only)
- [ ] **STAT-02**: Stats have tabs 4 / 5 / 6 / All, kept separate for Normal and Wordubado; the All tab shows totals only (no Win Streak)
- [ ] **STAT-03**: User can see Day Streak (current/longest) and "Restores left: N/3" globally
- [ ] **STAT-04**: Stats handle zero games without errors (no division by zero)

### Result and Share (RSLT)

- [ ] **RSLT-01**: User sees a result screen with won/lost, the answer, attempts used, stats, and Play again
- [ ] **RSLT-02**: User can click "Show definition": a curated definition for slang, a dictionaryapi.dev lookup for common words, and "Definition unavailable" on timeout, error or offline
- [ ] **RSLT-03**: User can share an emoji grid ("Unlimited Wordle - Wordubado 5 - 4/6", "X/n" for a loss, 🟧🟦 in colour-blind mode) plus the site URL
- [ ] **RSLT-04**: Share uses the phone share sheet when available and falls back to the clipboard, with a "Copied" toast

### UI, Design and Accessibility (UI)

- [x] **UI-01**: The design is minimal, soft and light: airy palette, soft rounded tiles, gentle animations, generous white space
- [ ] **UI-02**: User can switch to dark mode (same soft feel); on first visit the theme follows the system preference; no theme flash on load
- [ ] **UI-03**: User can turn on a colour-blind (high-contrast) palette
- [ ] **UI-04**: User sees a How-to-play modal automatically on the first visit and can reopen it from the header
- [ ] **UI-05**: The header has a mode toggle, length picker, and help/stats/settings buttons
- [x] **UI-06**: The layout works on phone widths (≥320 px) with the largest grid (6 letters × 7 rows), using a `dvh`-safe height
- [ ] **UI-07**: Screen-reader users hear each guess result through an aria-live region; tiles and keys have accessible labels
- [ ] **UI-08**: Modals trap focus, close on Esc and return focus; the whole game is playable by keyboard alone
- [x] **UI-09**: Animations respect prefers-reduced-motion
- [ ] **UI-10**: Page has a title, meta description, Open Graph tags with an absolute image URL, a favicon and a `<noscript>` message
- [ ] **UI-11**: Settings has a note that progress is stored in this browser only

### Docs (DOC)

- [x] **DOC-01**: SPEC.md: the corrected spec, including every owner decision and the full Restore state machine and edge-case table
- [x] **DOC-02**: GLOSSARY.md: Board, Mode, Normal, Wordubado, Answer Pool, Guess Pool, Win Streak, Day Streak, Missed Day, Restore, Forfeit, Give Up
- [ ] **DOC-03**: docs/PIPELINE.md: a learning guide to the phases, the GSD workflow (discuss → plan → execute → verify) and the code pipeline (words build → Vite → Vitest → Playwright → CI → Vercel), with "what you'll learn" notes

### Quality and Pipeline (QA)

- [x] **QA-01**: Project uses React + Vite + TypeScript (pinned 6.0.x), ESLint flat config, Prettier, Node 24
- [ ] **QA-02**: Vitest unit tests cover scoring (ABBEY/BABES, SPEED/ERASE, triples, all lengths), the 75/25 split over 10,000 seeded draws, streaks/Restore (an edge-case table including DST, month boundary and clock moved backwards), forfeit rules, and storage (round-trip, migration, corrupt, throwing storage)
- [ ] **QA-03**: Playwright E2E tests run against the production build: a full win and loss, invalid guess, resume after refresh, switching Boards, Give Up rule, the Restore prompt (fake clock), and an axe accessibility check, in desktop and mobile projects
- [ ] **QA-04**: GitHub Actions CI on every PR and push to main runs lint, format check, typecheck, unit tests, build, E2E and the word-drift check
- [x] **QA-05**: Vercel deploys a preview for every PR and production from main
- [x] **QA-06**: Production build succeeds, with the word pools kept out of the entry chunk

## v2 Requirements

### Retention and Data

- **V2-01**: Export/import of saved data (backup code)
- **V2-02**: Report-a-word / feedback link
- **V2-03**: Privacy-friendly analytics

### Platform

- **V2-04**: PWA / installable, offline play
- **V2-05**: Extra modes or lengths

## Out of Scope

| Feature | Reason |
|---------|--------|
| Hard mode | Explicitly decided against |
| Daily puzzle (same word for everyone) | The game is "unlimited"; the Day Streak covers the daily habit |
| Accounts, backend, cloud sync | localStorage only; no server in v1 |
| Leaderboards / multiplayer | Needs a backend; not part of the core value |
| Hints / undo | Undermines the puzzle and the streaks |
| Restoring Win Streaks | By design, a Restore only covers the Day Streak |
| Ads, sound, confetti | Clashes with the minimal, soft design |
| Blocklist on guesses | Guesses stay permissive; the blocklist applies to answers only |

## Defaults Taken (owner can override)

- Crude real words are accepted as guesses (the blocklist applies to answers only).
- Back-to-back repeated answers are allowed (fully random).
- A game finished after midnight counts for the day it was finished.
- The production domain is set when deploying (needed for the share URL and OG tags).

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DOC-01 | Phase 1 | Complete |
| DOC-02 | Phase 1 | Complete |
| QA-01 | Phase 1 | Complete |
| QA-05 | Phase 1 | Complete |
| PLAY-01 | Phase 2 | Complete |
| PLAY-02 | Phase 2 | Complete |
| PLAY-03 | Phase 2 | Complete |
| PLAY-04 | Phase 2 | Complete |
| PLAY-05 | Phase 2 | Complete |
| PLAY-06 | Phase 2 | Complete |
| QA-06 | Phase 2 | Complete |
| UI-01 | Phase 2 | Complete |
| UI-06 | Phase 2 | Complete |
| UI-09 | Phase 2 | Complete |
| WORD-02 | Phase 2 | Complete |
| WORD-05 | Phase 2 | Complete |
| WORD-07 | Phase 2 | Complete |
| WORD-09 | Phase 2 | Complete |
| UI-05 | Phase 3 (mode switch + length picker), Phase 4 (settings button), Phase 5 (stats button), Phase 7 (help button); split per D-14 | Partial (Phase 3 part done; tick at Phase 7) |
| WORD-01 | Phase 3 | Complete |
| WORD-03 | Phase 3 | Complete |
| WORD-04 | Phase 3 | Complete |
| WORD-06 | Phase 3 | Complete |
| WORD-08 | Phase 3 | Complete |
| PLAY-07 | Phase 4 | Pending |
| PLAY-08 | Phase 4 | Pending |
| SAVE-01 | Phase 4 | Complete |
| SAVE-02 | Phase 4 | Pending |
| SAVE-03 | Phase 4 | Complete |
| SAVE-04 | Phase 4 | Complete |
| SAVE-05 | Phase 4 | Complete |
| SAVE-06 | Phase 4 | Complete |
| SAVE-07 | Phase 4 | Pending |
| SAVE-08 | Phase 4 | Pending |
| SAVE-09 | Phase 4 | Pending |
| UI-11 | Phase 4 | Pending |
| QA-02 | Phase 5 | Pending |
| STAT-01 | Phase 5 | Pending |
| STAT-02 | Phase 5 | Pending |
| STAT-03 | Phase 5 | Pending |
| STAT-04 | Phase 5 | Pending |
| STRK-01 | Phase 5 | Pending |
| STRK-02 | Phase 5 | Pending |
| STRK-03 | Phase 5 | Pending |
| STRK-04 | Phase 5 | Pending |
| STRK-05 | Phase 5 | Pending |
| STRK-06 | Phase 5 | Pending |
| STRK-07 | Phase 5 | Pending |
| STRK-08 | Phase 5 | Pending |
| RSLT-01 | Phase 6 | Pending |
| RSLT-02 | Phase 6 | Pending |
| RSLT-03 | Phase 6 | Pending |
| RSLT-04 | Phase 6 | Pending |
| UI-02 | Phase 7 | Pending |
| UI-03 | Phase 7 | Pending |
| UI-04 | Phase 7 | Pending |
| UI-07 | Phase 7 | Pending |
| UI-08 | Phase 7 | Pending |
| UI-10 | Phase 7 | Pending |
| DOC-03 | Phase 8 | Pending |
| QA-03 | Phase 8 | Pending |
| QA-04 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 62 total
- Mapped to phases: 62
- Unmapped: 0

---
*Requirements defined: 2026-10-01*
*Last updated: 2026-10-01 after initial definition*
