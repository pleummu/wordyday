---
phase: 05-stats-streaks-and-restore
plan: 01
subsystem: persistence, stats
tags: [zustand, localStorage, save-migration, win-streak, vitest, playwright]
requires:
  - phase: 04-six-boards-and-persistence
    provides: versioned save envelope, loadSave/validateSave, finishGame seam
provides:
  - v2 SaveDoc (stats, dayStreak, restores, pendingRestore, streakRev) with v1 to v2 migration
  - recordResult/nextSeq pure stats logic with (id, answer) ledger
  - Win Streak line in the result banner
  - v2Save/saveEnvelope test helpers
affects: [05-02, 05-03, 05-04, 05-05, 05-06, 05-07, 05-08]
tech-stack:
  added: []
  patterns: [per-slice validation fallback, finish recorded at submit time]
key-files:
  created: [src/logic/stats.ts, src/logic/stats.test.ts, e2e/streaks.spec.ts]
  modified: [src/logic/save.ts, src/logic/save.test.ts, src/state/gameStore.ts, src/state/gameStore.test.ts, src/state/storage.test.ts, src/state/copy.ts, src/components/Banner.tsx, src/components/Banner.test.tsx, src/App.tsx, src/styles/game.css, src/test/storageDoubles.ts, e2e/storage.spec.ts]
key-decisions:
  - "Restores month sentinel is '' so the first refill grants a full month without a clock in the migration"
  - "Forfeit snapshot rides in the same store set as the count (finishGame extra patch) so no persisted write holds a counted game still stored as playing"
requirements-completed: [STRK-01, QA-02]
duration: ~25 min
completed: 2026-10-05
---

# Phase 5 Plan 01: Win Streak Foundation Summary

v2 saved document with per-Board running counters, recorded once per game at submit time, and a "Win streak: N" / "Win streak reset" banner line.

## Tasks

| Task | Commit |
|------|--------|
| 1. Failing E2E for the Win Streak banner | 5cc15de |
| 2. v2 document, recordResult, persistence plumbing | a4b291f |
| 4. Harden v1 to v2 upgrade (D-18, WR-03, IN-01) | a4b291f |
| 3. Record finishes at submit, banner line | 9ecd299 |

Tasks 2 and 4 share one commit: the WR-03 per-Board skip changes validateSave and many shared save/storage tests, so splitting them would have left a red intermediate commit.

## Deviations from Plan

**1. [Rule 1 - Bug] Forfeit wrote a counted-but-playing state**
- Found during: Task 3 (existing WR-01 test "New game stores the forfeit as finished before the next game" failed)
- Issue: finishGame now does a store set, so calling it before the forfeit snapshot set produced a persisted write with the game counted but still stored as playing.
- Fix: finishGame takes an optional `extra` patch merged into the same set; forfeitNewGame passes the snapshot through it.
- Files: src/state/gameStore.ts. Commit: 9ecd299

**2. [Rule 3 - Blocking] Existing tests assumed one bad Board invalidates the whole save**
- With WR-03, tests "rejects X" for bad Boards and the "tampered outcome" storage test changed to "skips the Board" (save.test.ts) and a bad `last` pointer (storage.test.ts). Commit: a4b291f

Otherwise executed as written. Task 1 test 3 (loss with no prior streak) passes in the RED run since no streak text existed yet; the other five failed as intended.

## Verification
- `npx vitest run`: 412 passed. `npm run typecheck`, `npm run lint`: clean.
- `npx playwright test --project=chromium`: 69 passed (streaks, storage, persistence, layout, forfeit, tabs).

## Known Stubs
None. dayStreak, restores, pendingRestore, streakRev are persisted at their zero values by design; later Phase 5 plans populate them.

## Threat Flags
None beyond the plan threat model (T-05-01..05 mitigated and tested).

## Self-Check: PASSED
Files and commits 5cc15de, a4b291f, 9ecd299 verified present.
