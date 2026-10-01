---
phase: 01-foundation-spec-and-ci-skeleton
plan: 01
subsystem: infra
tags: [vite, react, typescript, eslint, prettier, vitest]
requires: []
provides:
  - Vite 8 + React 19 + TypeScript 6.0.3 scaffold with ESLint 10 flat config, Prettier 3, Vitest 5
  - Unlimited Wordle placeholder page and first CSS tokens
  - BOARD_CONFIG (4/5/6 letters -> 5/6/7 attempts)
  - npm scripts used by CI (lint, format:check, typecheck, test, build)
affects: [01-04 CI workflow, all later phases]
tech-stack:
  added: [react, vite, typescript ~6.0.3, eslint 10, typescript-eslint 8, prettier 3, vitest 5, jsdom, testing-library]
  patterns: [Vitest config inside vite.config.ts, per-file jsdom docblock, LF line endings]
key-files:
  created: [.gitattributes, .nvmrc, .prettierrc.json, .prettierignore, eslint.config.js, vite.config.ts, src/App.tsx, src/App.test.tsx, src/logic/boards.ts, src/logic/boards.test.ts, src/styles/tokens.css, src/styles/global.css, README.md]
  modified: [package.json, index.html, src/main.tsx]
key-decisions:
  - "TypeScript pinned ~6.0.3 (resolves 6.0.3)"
  - "oxlint from the scaffold removed in favour of ESLint 10"
  - "afterEach(cleanup) added in App.test.tsx because two render tests run without Vitest globals"
requirements-completed: [QA-01]
duration: 15min
completed: 2026-10-01
---

# Phase 1 Plan 01: Tooling scaffold and placeholder Summary

Vite/React/TS 6.0.3 scaffold with ESLint 10 flat config, Prettier, Vitest, and a test-first "Unlimited Wordle" placeholder plus tested BOARD_CONFIG, all on branch `phase-01/foundation`.

## Tasks

| Task | Commits |
|------|---------|
| 1 Branch, scaffold, toolchain | 6dc9fda (.gitattributes), 696efd0 (scaffold) |
| 2 Placeholder and BOARD_CONFIG (TDD) | ac231b5 (RED), 77e6876 (GREEN) |

## Verification

`npm run lint`, `format:check`, `typecheck`, `test` (2 files, 4 tests) and `build` all exit 0. `typescript` resolves to 6.0.3 only. dist/index.html has the right title.

## Deviations from Plan

- [Rule 1 - Bug] Added `afterEach(cleanup)` to `src/App.test.tsx`: with two render tests and no Vitest globals, RESEARCH Pitfall 5 would leave duplicate DOM. Included in the GREEN commit.
- `git add --renormalize .` also touched nothing but `.gitattributes`; I unstaged `.planning/STATE.md` and `.planning/config.json` so the orchestrator's uncommitted changes stayed out of task commits.

## Known Stubs

None (the coming-soon text is the intended placeholder per D-17).

## Self-Check: PASSED
