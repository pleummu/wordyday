---
phase: 02-playable-normal-game
plan: 05
subsystem: testing
tags: [playwright, e2e, vite-preview]
requires: [02-01, 02-03]
provides:
  - Playwright E2E harness on the production build (chromium + Pixel 7)
  - Failing win/lose happy-path E2E tests (RED) for 02-07 to turn green
affects: [02-06, 02-07]
tech-stack:
  added: ["@playwright/test@1.63.0"]
key-files:
  created: [playwright.config.ts, e2e/helpers.ts, e2e/game.spec.ts]
  modified: [package.json, package-lock.json, .gitignore, .prettierignore, eslint.config.js, tsconfig.node.json]
key-decisions:
  - "Answer fixed only via globalThis.__WORDLE_TEST__ from addInitScript; no URL parameter"
metrics:
  completed: 2026-10-01
---

# Phase 2 Plan 05: Failing win/lose E2E Summary

Playwright 1.63.0 configured against `vite preview` of the production build with Chromium and Pixel 7 projects, plus failing win (5-letter) and lose (4-letter) E2E tests that use the `__WORDLE_TEST__` hook.

## Commits

- 774d61c chore(02-05): add Playwright on the production build
- 6e5309d test(02-05): add failing win/lose E2E

## Deviations from Plan

- `npx playwright install chromium` timed out downloading the browser (network, cdn.playwright.dev). The package installed correctly and `--list` works without a browser. The browser must be installed before running the suite (rerun `npx playwright install chromium`). Needed by 02-07, not by this plan.
- e2e/game.spec.ts imports `./helpers.ts` with an explicit extension because tsconfig.node.json uses nodenext resolution.

## Verification

All 9 test words confirmed in generated pools. `npx playwright test --list` shows 4 tests (2 x 2 projects). lint, typecheck, format:check pass. No URLSearchParams/location.search in src or e2e. The suite was not run (intended RED state).

## Known Stubs

None.

## Self-Check: PASSED
