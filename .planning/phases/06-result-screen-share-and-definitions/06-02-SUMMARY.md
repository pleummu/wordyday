---
phase: 06-result-screen-share-and-definitions
plan: 02
subsystem: ui
tags: [react, banner, result-modal, playwright, layout]
requires: [06-01]
provides:
  - slim Banner (heading, See result, Play again) with busy-disabled buttons
  - Win Streak reset suffix in the Result modal Streak cell hidden text
  - 320 px layout checks for banner and Result modal
affects: [06-03, 06-08]
tech-stack:
  added: []
  patterns: [data-see-result focus-return target for the Result modal]
key-files:
  created: []
  modified:
    - src/components/Banner.tsx
    - src/components/Banner.test.tsx
    - src/components/ResultModal.tsx
    - src/components/ResultModal.test.tsx
    - src/App.tsx
    - src/App.test.tsx
    - src/state/copy.ts
    - src/styles/game.css
    - e2e/result.spec.ts
    - e2e/layout.spec.ts
    - e2e/axe.ts
key-decisions:
  - "Banner is not a live region and takes no focus; the modal owns announcements"
  - "Modal fallbackFocus is only [data-see-result]"
requirements-completed: [RSLT-01]
duration: ~35min
completed: 2026-10-12
---

# Phase 6 Plan 02: Slim banner with See result Summary

Closing the Result modal now leaves a slim banner (Solved in n, The word was X, or You gave up) with See result and Play again; See result reopens the modal, focus returns to it, and the Win Streak lives only in the modal.

## Tasks

| Task | Commit | Notes |
| ---- | ------ | ----- |
| 1. Failing E2E (banner, See result, D-31, D-05, 320 px layout) | 135658c | 9 banner tests plus 18 layout cases per project |
| 2. Slim Banner, copy retirement, modal reset text | abd9adf | Banner/App/ResultModal/copy/CSS and unit tests |

## Verification

- npm test: 564 passed; lint, typecheck, prettier clean
- npx playwright test e2e/result.spec.ts e2e/layout.spec.ts: 136 passed (chromium and mobile)
- Grep for retired copy names in src and e2e: no matches; no banner-streak/data-streak CSS left
- Legacy E2E specs were not run (expected to fail until 06-08)

## Deviations from Plan

**1. [Rule 1 - Bug in own spec] Give Up needs four guesses.** The Give up button only appears with 2 tries left, so the plan's "two wrong guesses" was raised to four in result.spec and layout.spec. Commit abd9adf.

**2. [Rule 3 - Blocking] e2e/axe.ts tolerates cancelled animations.** `Promise.all(getAnimations().map(a => a.finished))` rejected with AbortError when the keyboard unmounted and cancelled a running transition at win time, failing the existing axe test deterministically. Now `a.finished.catch(() => undefined)`. Commit abd9adf.

**3. [Test hardening] The Enter-on-See-result spec first waits for See result to be focused,** because the modal closes before focus returns. One full-suite run saw this test fail once under load; it passed in 24 repeat runs at 12 workers and in two later full runs, so the cause was not isolated.

ResultModal.test additions seed `emptyStats()` for the reset case so the number matches the finish note.

## Known Stubs

None.

## Self-Check: PASSED

Commits 135658c and abd9adf exist; all files listed above are present.
