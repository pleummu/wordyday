---
phase: 08-e2e-ci-hardening-and-pipeline-docs
verified: 2026-10-16T00:00:00Z
status: passed
score: 3/3 must-haves verified
overrides_applied: 0
---

# Phase 8: E2E, CI Hardening and Pipeline Docs Verification Report

**Phase Goal:** Every important user journey is covered end-to-end in CI, merging is gated on green checks, and the pipeline is documented as a learning guide.
**Status:** passed. Owner approved PIPELINE.md in 08-05 Task 3 (recorded in 08-05-SUMMARY).

## Observable Truths

| #   | Truth                                                                                                  | Status   | Evidence                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | E2E covers win, loss, invalid guess, resume, Board switching, Give Up, Restore with a fake clock, axe | VERIFIED | QA-03 map below. Every title is listed by `npx playwright test --list` under `[chromium]` and `[mobile]`. No new spec was written (D-06).                                      |
| 2   | CI runs lint, format, types, unit, build, bundle budget, words drift and E2E; main is protected        | VERIFIED | 08-01: required checks `check`, `words`, `e2e` read back from the API (strict false). 08-03: close and reopen of PR #5 showed BLOCKED while a required check was pending.     |
| 3   | docs/PIPELINE.md describes the finished pipeline as a learning guide                                   | VERIFIED | Refreshed in 08-05 Task 2 (stale markers removed, build:e2e, budget, cache, protection, landing flow, retrospective, Try-it boxes). Owner replied "approved" at the Task 3 checkpoint. |

## QA-03 Traceability (checked against `npx playwright test --list`, 2026-10-16)

| Item                     | Spec file : test title                                                       | Projects          | Gap  |
| ------------------------ | ---------------------------------------------------------------------------- | ----------------- | ---- |
| Win                      | game.spec.ts : win a 5-letter game                                           | chromium, mobile  | none |
| Loss                     | game.spec.ts : lose a 4-letter game reveals the answer                       | chromium, mobile  | none |
| Invalid guess            | feedback.spec.ts : invalid word shakes without using an attempt              | chromium, mobile  | none |
| Resume after refresh     | persistence.spec.ts : refresh keeps submitted guesses and drops the half-typed row | chromium, mobile | none |
| Switching Boards         | boards.spec.ts : switching length never ends a game                          | chromium, mobile  | none |
| Give Up                  | forfeit.spec.ts : Give up appears only with exactly 2 tries left             | chromium, mobile  | none |
| Restore with fake clock  | restore.spec.ts : STRK-06 prompt after one missed day                        | chromium, mobile  | none |
| axe accessibility        | a11y-themes.spec.ts : axe and focus ring (light, dark, colour-blind light, colour-blind dark) | chromium, mobile | none |

Grep count over the list for the eight titles: 22 lines (8 items x 2 projects, with axe x4 per project), at least 16 required.

## Behavioral Spot-Checks

| Check                       | Command                                  | Result                                             | Status |
| --------------------------- | ---------------------------------------- | -------------------------------------------------- | ------ |
| Spec titles listed, 2 projects | `npx playwright test --list`          | all 8 QA-03 titles under chromium and mobile        | PASS   |
| Bundle budget gate          | `npm run check:bundle` (08-04)           | entry JS 85.9 / 100 KB gzip, CSS 4.4 / 10 KB        | PASS   |
| Budget overage fails        | `js: 50` then `check:bundle` (08-04)     | exit 1 with the FAILED message, table still printed | PASS   |

## Requirements Coverage

| Req   | Plans            | Status    | Evidence                                                                                                                                    |
| ----- | ---------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-03 | 08-02, 08-04, 08-05 | SATISFIED | QA-03 map above; six stacked PRs each green with 0 flaky (08-02); Phase 8 PR run row below.                                                  |
| QA-04 | 08-01..08-04     | SATISFIED | Protection read-back (08-01); PR chain #3-#8 and merge commits 7c2f9b0, eb5aa24, 091de61, 2b992fc, 4e6cf8b, 08bc356 (08-02, 08-03); budget overage proof and browser cache (08-04). |
| DOC-03 | 08-05           | SATISFIED | docs/PIPELINE.md and README.md refreshed; Prettier clean; owner approval recorded in 08-05-SUMMARY.                                         |

## Phase 8 PR run

| PR  | Head SHA | Run id  | Flaky | Cache-hit line | required checks |
| --- | -------- | ------- | ----- | -------------- | --------------- |
| #9  | c946a04 | 38930577200 | 0 (437 passed, 15 skipped, 5.2m; e2e job 5m40s) | `Cache hit for: pw-Linux-1.63.0` then `Cache restored from key: pw-Linux-1.63.0` | check, words, e2e pass |

## Goal-backward re-check (2026-10-16)

- Branch protection read back live: required contexts `["check","words","e2e"]`.
- `.github/workflows/ci.yml` has jobs check (lint, format:check, typecheck, test, build, check:bundle), words (build:words drift) and e2e (cached Playwright install, `npx playwright test`, report artifact).
- Run 38930577200 on c946a04 concluded success. PR #9 head is now 6343a38 (docs only): check, words, Vercel pass; e2e was still running at check time.
- 26 spec files exist under `e2e/`; QA-03 titles map as in the table above.
- REQUIREMENTS.md: QA-03, QA-04, DOC-03 all marked Complete and mapped to Phase 8; all three IDs appear in plan frontmatter. No orphaned requirements.
- PR #9 is open and unmerged by design; not a gap.

## Code review note (08-REVIEW.md, advisory)

0 critical, 2 warnings, 2 info. Not blockers; CI still fails non-zero in both cases.
- WR-01: `scripts/check-bundle.mjs` has no guard for a missing entry stylesheet, so the CSS budget could pass vacuously if the link tag shape changes.
- WR-02: `gz()` can throw ENOENT before the table prints if an entry href does not resolve to a file.
- IN-01: Playwright cache is saved only when the job succeeds. IN-02: `poolTag` may get an "undefined" key.

## Gaps Summary

No gaps. Carried forward and not fixed here: Phase 5 CR-01 (deferred Restore credit) and the Phase 6 owner checks (plan 06-07, no 06-VERIFICATION.md).

_Verified: 2026-10-16_
