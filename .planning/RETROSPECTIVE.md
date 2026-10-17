# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-10-17
**Phases:** 8 | **Plans:** 64 | **Sessions:** not tracked

### What Was Built
- Correct, test-first scoring and a build-time word pipeline (SCOWL + profanity filter + owner review) for 4, 5 and 6 letters.
- Normal and Wordubado modes; six saved Boards with a versioned, migrated, validated localStorage save and two-tab sync.
- Win Streaks, a Day Streak with monthly Restores, Statistics, the result screen with Share and definitions.
- Themes (light/dark/colour-blind), How to play, reduced motion, keyboard and screen-reader play.
- Full CI (lint, format, typecheck, unit, build, bundle, words, Playwright with axe) and Vercel previews; docs/PIPELINE.md.

### What Worked
- Writing SPEC.md with rule IDs and an edge-case table (EC-01..EC-44) first, so streak/Restore logic could be table-tested as pure functions.
- Keeping game logic pure in `src/logic/` and calling store actions from events (not effects), which avoided StrictMode double-counting.
- Phase code reviews plus a verifier pass caught real defects (Phase 4 CR-01/CR-02, Phase 5 CR-01) before or soon after merge.
- Owner checkpoints for public content (slang list, Normal answers) and play-throughs.

### What Was Inefficient
- Phase 5's CR-01 was found by review on 2026-10-05 but only closed at milestone end (2026-10-17); the verification stayed `gaps_found` for 12 days.
- Bumping the save version broke three E2E specs that hard-coded the version number; they were only caught in CI.
- Auto-extracted summary one-liners mixed deviation notes with accomplishments, so milestone notes needed a manual rewrite.

### Patterns Established
- Every save-shape change bumps `SAVE_VERSION`, adds a `MIGRATIONS[n]` step with a test, and updates `validate*` guards.
- Dates are local `YYYY-MM-DD` strings; day math uses `Date.UTC` on parsed parts.
- E2E runs against the production build with injected answers (`fixAnswers`) and a fixed clock.

### Key Lessons
1. Close BLOCKER gaps from verification before starting the next phase, not at milestone end.
2. When a value like the save version changes, grep E2E specs too, not only unit tests.
3. A deferred action should store *what* and *when* (a date), not just a flag.

### Cost Observations
- Model mix: not tracked
- Sessions: not tracked
- Notable: 64 plans in 17 days, with Phases 1-2 finished on day one.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | n/a | 8 | Baseline: spec-first, pure logic, CI from Phase 1 |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 686 unit + 437 E2E | not measured | n/a |

### Top Lessons (Verified Across Milestones)

1. (Needs a second milestone to cross-validate.)
