---
phase: 07-themes-accessibility-and-polish
plan: 04
subsystem: ui
tags: [dark-theme, css-tokens, no-flash, prefers-color-scheme]
requires: ["07-02", "07-03"]
provides:
  - dark token set and --color-overlay
  - inline head script that sets data-theme / data-palette before paint
  - startAppearance (store + OS follow)
affects: [07-06, 07-07]
tech-stack:
  added: []
  patterns: [started-once module outside React (copied from streakWatch)]
key-files:
  created: [e2e/theme.spec.ts, src/state/appearance.ts, src/state/appearance.test.ts]
  modified: [src/styles/tokens.css, src/styles/game.css, index.html, src/main.tsx]
key-decisions:
  - "No second storage key: head script reads the versioned save doc inside try/catch and writes only constant strings"
requirements-completed: [UI-02]
duration: ~20min
completed: 2026-10-14
---

# Phase 7 Plan 04: Dark theme Summary

Soft dark theme painted by an inline head script before the bundle runs, following the OS live while on System via a started-once `startAppearance`.

## Commits
- d7b7b5d test: failing theme E2E (RED)
- cc6dc40 feat: dark tokens, overlay token, head script
- 3158e3f feat: startAppearance + boot wiring

## Deviations from Plan
None. The dark axe smoke check passed with the UI-SPEC hex values untouched. Full tuning is still left to 07-07.

## Verification
typecheck, lint, format:check and 660 unit tests pass. Full Playwright run: 406 passed, 14 skipped, none failed (both projects). dist/index.html keeps the inline script.

## Self-Check: PASSED
