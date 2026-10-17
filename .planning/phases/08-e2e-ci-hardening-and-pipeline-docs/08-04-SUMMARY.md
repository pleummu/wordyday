---
phase: 08-e2e-ci-hardening-and-pipeline-docs
plan: 04
subsystem: infra
tags: [ci, bundle-budget, playwright-cache]
requires: [08-03]
provides: [gzip budget gate, size table, cached e2e browsers, Phase 8 PR #9]
key-files:
  modified: [scripts/check-bundle.mjs, .github/workflows/ci.yml]
requirements-completed: [QA-04, QA-03]
completed: 2026-10-16
---

# Phase 8 Plan 04: Bundle budget and cached e2e Summary

check:bundle now fails when entry JS exceeds 100 KB gzip or entry CSS exceeds 10 KB gzip and always prints a per-chunk size table; the e2e job caches Playwright browsers; Phase 8 PR #9 is open with check, words and e2e green.

## Size table (local, gzip level 9)

| File | Raw KB | Gzip KB | Tag |
|------|--------|---------|-----|
| index.css | 20.6 | 4.4 | entry |
| index.js | 281.9 | 85.9 | entry |
| words-4 | 20.3 | 9.9 | 4-letter pool |
| words-5 | 43.1 | 19.9 | 5-letter pool |
| words-6 | 79.1 | 33.5 | 6-letter pool |

Entry JS 85.9 / 100 KB, entry CSS 4.4 / 10 KB. (CI log shows the same table.)

## Overage proof (T-08-16)

With `js: 50`: exit 1, `check:bundle FAILED: entry JS is 85.9 KB gzip, budget 50 KB.`, table still printed. Reverted to 100; exit 0 confirmed; `git diff` shows `BUDGET_KB = { js: 100, css: 10 }`.

## e2e and sharding decision

- e2e job on PR #9: 5m51s, first run is a cache miss ("Cache not found for input keys: pw-Linux-1.63.0"), so cache-hit was false. The second push (08-05) should hit.
- No sharding and no workers change: slowest measured e2e (Phase 7 PR) was 5m45s, and this run 5m51s, both under 10 minutes. playwright.config.ts untouched (retries 1, trace on-first-retry, chromium and mobile projects).

## Commits

- merge of Phase 8 planning commits onto phase-08 branch (only .planning differed from origin/main)
- 1c5e795 feat(08-04): gzip budget and size table in check:bundle
- ci(08-04): cache Playwright browsers in the e2e job

## Deviations

None to the plan. Minor: a stray backspace character from my own edit tooling corrupted two regex literals mid-task (ESLint no-control-regex caught it); fixed before commit.
