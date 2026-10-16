---
phase: 07-themes-accessibility-and-polish
plan: 03
subsystem: ui
tags: [how-to-play, modal, header, onboarding]
requires: [07-01]
provides: [HowToPlayModal, HelpButton, boot and action auto-open of How to play]
affects: [header layout, gameStore dialog flow]
key-files:
  created: [src/components/HowToPlayModal.tsx, src/components/HelpButton.tsx]
  modified: [src/state/copy.ts, src/components/Header.tsx, src/components/Header.test.tsx, src/App.tsx, src/styles/game.css, src/main.tsx, src/state/gameStore.ts, src/state/gameStore.test.ts, e2e/help.spec.ts, e2e/layout.spec.ts]
decisions:
  - HelpButton is first child of .header-actions, before the Day Streak chip
  - maybeOpenHelp is called from boot code and store actions only, never React effects
metrics:
  completed: 2026-10-14
requirements: [UI-04]
---

# Phase 7 Plan 03: How to play Summary

How to play modal with palette-token example rows, a first-in-header "?" button, and auto-open on first visit that waits for any Restore or streak-break prompt.

## Tasks

All three tasks landed in one commit (0924ae3) by an earlier executor; verified against the plan at HEAD with no gaps found (4 `get().maybeOpenHelp()` calls in the store, one in main.tsx after `checkStreaks()`, role="img" examples, `<HowToPlayModal` mounted in App).

- e2e follow-up commit: help button added to 36 px / 40 px header checks, and help.spec waits for the auto-opened dialog before pressing Escape (removes a race).

## Verification

- npm test: 655 passed
- typecheck and lint: clean
- full Playwright suite on the e2e production build (chromium and mobile): 398 passed, 14 skipped, 0 failed

## Deviations from Plan

None in code. Commit granularity differed (tasks 1-3 in one commit).

## Known Stubs

None.

## Self-Check: PASSED
