---
phase: 05-stats-streaks-and-restore
plan: 03
subsystem: stats UI
tags: [react, zustand, playwright, axe, vitest, stats]
requires:
  - phase: 05-stats-streaks-and-restore
    provides: BoardStats counters, pick-one merges
provides:
  - deriveStats zero-safe view model
  - openStats store action (guards: dialog, info popup, revealing)
  - StatsButton, StatsModal (mode radios, 4/5/6/All tabs, distribution)
  - three-action header layout at 320 px
  - e2e seedSave/defaultV2State and shared e2e/axe.ts helpers
affects: [05-04, 05-06, 05-07, 05-08]
tech-stack:
  added: ["@axe-core/playwright 4.13.0 (dev, exact pin)"]
key-files:
  created: [src/components/StatsButton.tsx, src/components/StatsModal.tsx, src/components/StatsModal.test.tsx, e2e/stats.spec.ts, e2e/axe.ts]
  modified: [src/logic/stats.ts, src/state/gameStore.ts, src/state/copy.ts, src/components/Header.tsx, src/App.tsx, src/styles/game.css, e2e/helpers.ts, e2e/layout.spec.ts, e2e/wordubado.spec.ts]
key-decisions:
  - "All tab highlights the latest win in the mode by last.seq"
  - "Distribution rows are li with aria-label; visual parts aria-hidden"
  - "expectNoA11yViolations waits for document animations so the dialog fade-in does not read as low contrast"
requirements-completed: [STAT-01, STAT-02, STAT-04]
duration: ~25 min
completed: 2026-10-05
---

# Phase 5 Plan 03: Statistics dialog Summary

Header Statistics button opens a dialog with Normal/Wordubado toggle and 4/5/6/All tabs showing zero-safe per-Board stats and guess distribution, with axe-clean accessibility in both modes.

## Tasks

| Task | Commit |
|------|--------|
| 1. Failing Stats E2E, seed/axe helpers, header checks | 7cdc669 |
| 2. deriveStats and openStats (tests and impl) | 674cbac |
| 3. Button, dialog, header layout, CSS | 158c1e1 |

## Deviations from Plan

**1. [Rule 1 - Bug] AxeBuilder import:** the package exposes a named export, so `import { AxeBuilder }` is used instead of the default import (typecheck failed otherwise).

**2. [Rule 1 - Bug] Axe color-contrast flake:** the empty-state axe test caught the dialog mid fade-in. The shared helper now awaits `document.getAnimations()` before running axe.

**3. TDD ordering (Task 2):** tests and implementation were committed together, no separate RED commit.

## Verification
- `npx vitest run`: 434 passed; lint and typecheck clean.
- `npx playwright test --project=chromium`: 84 passed (includes both axe tests, header fit at 320x500/568/640, D-21 disabled-while-revealing). Mobile project is left to the 05-08 gate.
- `grep -rn axe-core src`: no matches.

## Known Stubs
None. The global Day Streak footer is intentionally deferred to 05-04.

## Self-Check: PASSED
Commits 7cdc669, 674cbac, 158c1e1 present; created files exist.
