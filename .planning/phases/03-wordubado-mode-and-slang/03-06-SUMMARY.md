---
phase: 03-wordubado-mode-and-slang
plan: 06
subsystem: build-hardening
tags: [bundle-check, test-hook, e2e, sign-off]
requires: [03-05]
provides:
  - Slang sentinels in check:bundle (slang stays out of the entry chunk)
  - __WORDLE_TEST__ hook gated out of production builds (WR-01); Playwright builds with `vite build --mode e2e`
  - Owner sign-off on Normal and Wordubado play on the local production preview
affects: [Phase 7 (UI-05 help, still unchecked per D-14)]
key-files:
  modified: [scripts/check-bundle.mjs, src/state/testHook.ts, package.json, playwright.config.ts, docs/PIPELINE.md, src/components/ModeSwitch.tsx, src/components/InfoButton.tsx, src/components/Header.test.tsx, e2e/helpers.ts]
key-decisions:
  - "Test hook is enabled only when import.meta.env.MODE is 'test' or 'e2e'; production builds drop it"
  - "Enter on the focused Wordubado switch submits the guess; Space and click toggle"
requirements-completed: [WORD-01, WORD-03, WORD-04, WORD-08]
duration: n/a
completed: 2026-10-02
---

# Phase 3 Plan 06: Bundle hardening and sign-off Summary

The production build is checked for slang in the entry chunk and no longer ships the `__WORDLE_TEST__` hook; the owner played both modes on the local production preview and approved.

## Tasks

1. Slang sentinels in check:bundle, test hook gated out of production: 7e1c025
2. Owner sign-off on local production preview (checkpoint): approved 2026-10-02
- Fix (owner-approved deviation): 8f25d06

## Results

- Vitest 177 passing; Playwright 66 passed (chromium and mobile).
- Lint, format, typecheck, build and check:bundle clean; build:words shows no drift.

## Deviations from Plan

**1. [Rule 1 - Bug, owner-approved 2026-10-02] Enter on the focused Wordubado switch now submits the guess.** Space and click toggle. `data-own-enter` was removed from ModeSwitch and an Enter keydown preventDefault added; the E2E blur workaround in `turnOnWordubado` was removed and a focus-return E2E added. Commit 8f25d06.
**2. [Executor decision] Same fix applied to InfoButton.** Focus returns to it after the popup closes, so Enter would have reopened it. Space and click still open it.
**3. Verification.** The two new Header.test.tsx Enter tests fail on the pre-fix ModeSwitch/InfoButton and pass after (2 failed / 7 passed before, 9 passed after).

## Notes

UI-05 stays unchecked in REQUIREMENTS.md until help lands in Phase 7 (D-14).

## Self-Check: PASSED
