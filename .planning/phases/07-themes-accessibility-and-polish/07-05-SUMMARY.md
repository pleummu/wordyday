---
phase: 07-themes-accessibility-and-polish
plan: 05
subsystem: accessibility
tags: [aria-live, popover, zustand, playwright]
requires: [07-03]
provides:
  - pure guessAnnouncement / giveUpAnnouncement builders
  - transient store `announcement` set in finishReveal and giveUp
  - always-mounted LiveRegion (manual popover, re-raised above dialogs)
affects: [07-08]
tech-stack:
  added: []
  patterns: [Toast raiseKey popover re-raise reused for the live region]
key-files:
  created:
    - src/logic/announce.ts
    - src/logic/announce.test.ts
    - src/components/LiveRegion.tsx
    - src/components/LiveRegion.test.tsx
    - e2e/announce.spec.ts
  modified:
    - src/state/copy.ts
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
    - src/App.tsx
    - e2e/restore.spec.ts
    - e2e/settings.spec.ts
    - e2e/streaks.spec.ts
key-decisions:
  - "Phase 07: live region is a popover=manual layer raised with raiseKey=dialog so Give Up line is outside the inert page"
  - "Phase 07: announcement set only in finishReveal/giveUp, cleared in startGame, loadBoard, resetAll and external reset"
requirements-completed: [UI-07]
duration: 25min
completed: 2026-10-14
---

# Phase 7 Plan 05: Screen-reader announcements Summary

Polite, atomic live region reads each guess (word, per-letter result, tries left) after the flip, plus win, loss and Give Up lines, kept speakable above open dialogs via a re-raised manual popover.

## Tasks
1. Pure builders, copy lines and failing announce E2E: f1cff35 (+ name-clash fix)
2. Store announcement, LiveRegion, App mount: 626085b

## Deviations from Plan

**1. [Rule 3 - Blocking] `gaveUpLine` already existed in copy.ts** (Stats modal, takes a number). Named the new line `forfeitLine`.

**2. [Rule 1 - Bug] Existing E2E used `getByRole('status')`** and became ambiguous with the new live region (restore, settings, streaks specs). Scoped them to `.toast[role=status]`.

## Known Stubs
None.

## Notes
- Verified: vitest 670 pass, lint and typecheck clean, full Playwright run passed in both projects after fixing the 4 ambiguous selectors (the re-run of those specs plus announce passed 96/96). NVDA proof of Give Up is deferred to 07-08.
- loadBoard clears the announcement (per plan), so a Board switch removes text silently; it never announces.

## Self-Check: PASSED
