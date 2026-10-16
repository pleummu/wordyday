---
phase: 02-playable-normal-game
plan: 10
subsystem: ci
tags: [ci, bundle-check, eslint, github-actions, playwright, word-drift]
requires: [02-04, 02-09]
provides:
  - scripts/check-bundle.mjs and `npm run check:bundle`
  - ESLint no-restricted-imports guard for words-*.json
  - CI jobs check (+check:bundle), words (drift), e2e (Playwright + report artifact)
affects: []
key-files:
  created:
    - scripts/check-bundle.mjs
  modified:
    - package.json
    - eslint.config.js
    - .github/workflows/ci.yml
    - docs/PIPELINE.md
key-decisions:
  - "check:bundle uses the first 20 answers per length as a sentinel substring; Vite 8 kept it verbatim, so RESEARCH A1 fallback (words-N.ts modules) was not needed."
metrics:
  tasks: 2
  files: 5
  completed: 2026-10-02
---

# Phase 2 Plan 10: CI guarantees Summary

Word pools are now provably kept out of the entry chunk on every PR (check:bundle), static imports of pools are blocked by lint, and CI has word-drift and E2E jobs.

## Tasks

1. Bundle check and import guard: commit c098e16. check:bundle prints OK with three distinct chunks (words-4 15.9 KB, words-5 38.4 KB, words-6 74.9 KB). A temporary static import in App.tsx failed lint with the WORD-09 message (reverted).
2. CI jobs and PIPELINE.md: commit 8d559f7. Jobs `check`, `words`, `e2e`; `words` fails on diff or untracked files in src/data and scripts/words; e2e uploads playwright-report (14 days). PIPELINE.md markers updated and the three jobs explained.

## Verification

Locally: lint, format:check, build + check:bundle, drift command (exit 0), `npx playwright test` (28 passed).

## Deviations from Plan

None - plan executed exactly as written. (Prettier reformatted check-bundle.mjs and eslint.config.js; formatting only.)

## Self-Check: PASSED
