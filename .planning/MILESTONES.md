# Milestones

## v1.0 MVP (Shipped: 2026-10-17)

**Delivered:** An endless, correct Wordle for 4, 5 and 6 letters in Normal and Wordubado modes, with six saved Boards, streaks with monthly Restores, statistics, sharing, definitions, themes and full keyboard/screen-reader support, deployed on Vercel behind a complete CI pipeline.

**Phases completed:** 8 phases, 64 plans
**Timeline:** 2026-10-01 → 2026-10-17 (17 days, 355 commits)
**Size:** ~14.9k lines in `src/` (TypeScript, TSX, CSS), ~4.3k lines of E2E specs
**Tests at close:** 686 unit/component tests, 437 E2E tests (Chromium + mobile, axe checks included)
**Requirements:** 62/62 v1 requirements complete

**Key accomplishments:**

- Pure, test-first scoring (repeated letters included) and a build-time word pipeline that generates per-length answer and guess pools from SCOWL with a profanity filter and owner-reviewed exclusions.
- Wordubado mode with an owner-reviewed slang list, lazy-loaded so Normal players never download it.
- Six independent Boards that survive refresh, backed by a versioned, validated localStorage save (now v4) with migrations, corrupt/newer-save handling and safe two-tab sync.
- Win Streaks per Board, a global Day Streak with up to 3 Restores a month, and a Statistics dialog, all driven by a table-tested state machine (EC-01..EC-44).
- Result modal with Play again, Share and on-demand definitions, plus light/dark/colour-blind themes, How to play, reduced motion and keyboard/screen-reader play.
- Full CI (lint, format, typecheck, unit, build, bundle check, word-data check, Playwright E2E) with Vercel previews and the PIPELINE.md learning guide.

**Closed at milestone end:** CR-01 (Restore credited the answer day instead of the play day), fixed in PR #10 with save v3 → v4 migration; Phase 5 verification re-run and passed.

**Known follow-ups (not blocking):** Phase 5 review warnings WR-01..WR-05 and info items IN-01..IN-07 (see `phases/05-stats-streaks-and-restore/05-REVIEW.md`).

---
