---
phase: 02-playable-normal-game
plan: 09
subsystem: ui
tags: [css, container-queries, layout, loading, error-state, playwright]
requires: [02-06, 02-07, 02-08]
provides:
  - Height-aware tile fit (container-type size, cqw/cqh) with compact rule at max-height 540px
  - LoadingNotice (Loading words... after 400 ms) and LoadError (Try again)
  - e2e/layout.spec.ts and e2e/loading.spec.ts
affects: []
key-files:
  created:
    - src/components/LoadingNotice.tsx
    - src/components/LoadError.tsx
    - e2e/layout.spec.ts
    - e2e/loading.spec.ts
  modified:
    - src/styles/game.css
    - src/App.tsx
    - src/App.test.tsx
    - src/data/wordData.ts
key-decisions:
  - "Try again after a failed chunk import reloads the page: Chromium caches the failed module import, so an in-place retry makes no new request and fails again (verified). The reload lives in wordData.loadPools (tracks failed lengths), so store unit tests and the mocked App tests are unaffected. Safe in Phase 2 (no saved progress)."
  - "Layout sizes driven by CSS variables on .app (--tile-min, --key-h, --controls-h) so the compact rule only overrides variables; .controls vertical padding removed and spacing moved to .app gap to match the layout budget."
metrics:
  tasks: 2
  files: 8
  duration: ~20 min
  completed: 2026-10-02
---

# Phase 2 Plan 09: Small-screen fit and load states Summary

The 6-letter by 7-row grid now fits without scrolling at 320x500/540/541/568/640 and 1280x720, and slow or failed word-chunk loads show a calm notice or a Try again banner.

## Tasks

1. Height-aware fit, compact rule, no-scroll E2E: commit bdb1829. `.board-area` is `container-type: size`; `--tile` is clamped from min of cqw and cqh fits (floor 40 px, 36 px at max-height 540px, cap 62 px). Compact rule: single 48 px header, 14 px title, 36 px keys and picker. All seven scroll tests passed on chromium and mobile on the first run, including after a lost game with the banner shown.
2. Loading notice and load error (TDD): commit 9c70cdc. RED observed (2 failing App tests) before implementing. LoadingNotice shows after 400 ms; LoadError (role alert, `data-own-enter`, focused on mount) replaces the keyboard while the grid stays visible. E2E aborts the words-5 chunk, expects the error, unroutes and recovers.

## Deviations from Plan

**1. [Rule 3 - Blocking] Try again reloads the page**
- **Found during:** Task 2 E2E
- **Issue:** Retrying the dynamic import in place never recovers: the browser caches the failure and issues no new request (confirmed with a request log).
- **Fix:** Plan-sanctioned fallback, placed in `wordData.loadPools` (reload when a length that already failed is requested again) rather than the default store deps, so jsdom/store tests keep working.
- **Files:** src/data/wordData.ts

**2. [Minor] E2E import extension:** `e2e/layout.spec.ts` and `loading.spec.ts` import `./helpers.ts` (required by tsc for the project's module resolution).

## Verification

vitest 121 passed; playwright 28 passed (chromium + mobile); lint, typecheck, format:check and build pass. `max-height: 540px` present, no `max-height: 520px`, one `container-type: size`, no hex in game.css, no overflow:hidden on shell.

## Known Stubs

None.

## Self-Check: PASSED
