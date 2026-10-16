---
phase: 03-wordubado-mode-and-slang
plan: 03
subsystem: header-ui
tags: [wordubado, switch, header, accent]
requires: [03-02]
provides:
  - ModeSwitch role=switch control in two-row Header
  - --color-wordubado / --color-mode tokens driven by data-mode on .app
affects: [03-04 confirm/info dialogs]
key-files:
  created: [src/components/ModeSwitch.tsx, src/components/Header.test.tsx]
  modified: [src/components/Header.tsx, src/App.tsx, src/styles/tokens.css, src/styles/game.css, e2e/layout.spec.ts]
key-decisions:
  - "Switch blurs after pointer click (e.detail > 0) like LengthPicker; keyboard toggles keep focus"
  - "Compact tile floor lowered to 32px (UI-SPEC) and layout E2E floor to 31.5"
requirements-completed: [WORD-01, UI-05]
duration: n/a
completed: 2026-10-02
---

# Phase 3 Plan 03: Wordubado switch and header Summary

Header now has an accessible "Wordubado" switch beside the length picker in a two-row layout with a lilac title and track tint; e2e/wordubado.spec.ts is green.

## Tasks

1. Wordubado switch in header: b8f5f06 (ModeSwitch, Header, data-mode, 5 Header tests)
2. Accent, switch styling, 320 px layout: bc99268 (tokens, game.css, layout E2E +2 tests)

## Results

- Full `npx playwright test`: 42 passed (chromium and mobile), run after the last code change.
- Vitest 151 passing; typecheck, lint, prettier, build green.
- Mode tint only touches .title and .mode-switch; tiles, keys, banner and toast unchanged.

## Deviations from Plan

None - plan executed as written.

## Known Stubs

None.

## Self-Check: PASSED
