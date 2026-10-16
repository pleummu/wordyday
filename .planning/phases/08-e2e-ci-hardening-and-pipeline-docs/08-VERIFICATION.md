---
phase: 08-e2e-ci-hardening-and-pipeline-docs
verified: 2026-10-16T00:00:00Z
status: passed
score: 3/3 roadmap success criteria evidenced (owner read-through of PIPELINE.md pending)
overrides_applied: 0
---

# Phase 8: E2E, CI Hardening and Pipeline Docs Verification Report

**Phase Goal:** Every important user journey is covered end-to-end in CI, merging is gated on green checks, and the pipeline is documented as a learning guide.
**Status:** passed, pending the owner read-through in plan 08-05 Task 3.

## Observable Truths

| #   | Truth                                                                                                  | Status   | Evidence                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | E2E covers win, loss, invalid guess, resume, Board switching, Give Up, Restore with a fake clock, axe | VERIFIED | QA-03 map below. Every title is listed by `npx playwright test --list` under `[chromium]` and `[mobile]`. No new spec was written (D-06).                                      |
| 2   | CI runs lint, format, types, unit, build, bundle budget, words drift and E2E; main is protected        | VERIFIED | 08-01: required checks `check`, `words`, `e2e` read back from the API (strict false). 08-03: close and reopen of PR #5 showed BLOCKED while a required check was pending.     |
| 3   | docs/PIPELINE.md describes the finished pipeline as a learning guide                                   | VERIFIED | Refreshed in 08-05 Task 2 (stale markers removed, build:e2e, budget, cache, protection, landing flow, retrospective, Try-it boxes). Owner read-through is the Task 3 checkpoint. |

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
| #9  | pending  | pending | pending | pending      | pending         |

## Gaps Summary

No gaps. Carried forward and not fixed here: Phase 5 CR-01 (deferred Restore credit) and the Phase 6 owner checks (plan 06-07, no 06-VERIFICATION.md).

_Verified: 2026-10-16_
