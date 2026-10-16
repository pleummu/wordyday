---
phase: 08-e2e-ci-hardening-and-pipeline-docs
plan: 03
subsystem: infra
tags: [github, merge, ci, vercel]
requires: [08-02]
provides: [main holds Phases 2-7, production updated]
key-files:
  created: []
  modified: []
requirements-completed: [QA-04]
completed: 2026-10-16
---

# Phase 8 Plan 03: Land the stacked PR chain Summary

Phases 2-7 landed on main through six ordered merge commits (no squash, rebase, admin or branch deletion); main CI and production are green.

## Merges (mergeStateStatus was CLEAN before each)

| PR | Branch | Merge commit |
|----|--------|--------------|
| #3 | phase-02/playable-normal-game | 7c2f9b0c993ca57dd705290fd1b86a2d5d124f97 |
| #4 | phase-03/wordubado-mode-and-slang | eb5aa24a5acd189fb285c601fe5c70940d8d60d7 |
| #5 | phase-04/six-boards-and-persistence | 091de6110664ba3a1f03b5d46fe0d8f21930c7ee |
| #6 | phase-05/stats-streaks-and-restore | 2b992fcbeab3f21876dafed8f1f7dbbf839093ef |
| #7 | phase-06/result-screen-share-and-definitions | 4e6cf8ba9d7d011553e13baa0ec6018eb95f62df |
| #8 | phase-07/themes-accessibility-and-polish | 08bc356316b1c3e7664c99b9119d809d0162a261 |

Each child PR was retargeted to main (`gh pr edit --base main`) before its parent's turn; it stayed CLEAN (required checks match on the head SHA).
`git merge-base --is-ancestor 01f6bae origin/main` exits 0.

## BLOCKED observation

PR #5 was retargeted, closed and reopened to trigger a fresh run. Polling `mergeStateStatus` gave UNKNOWN, then BLOCKED (x5) while `check` and `e2e` were pending (`words` already passed). After `gh pr checks 5 --watch --required` it became CLEAN and was merged. Protection blocked merging while a required check was pending.

## Main CI and production

- Final main push 08bc356: CI run 38927377862, conclusion success (check, words, e2e all success). Earlier main runs (for 2b992fc, 4e6cf8b) were cancelled by cancel-in-progress, as expected.
- https://wordyday.vercel.app returns 200, title "Unlimited Wordle".
- Vercel status on 08bc356: success.

## Deviations from Plan

None. The BLOCKED observation was produced deliberately with a close/reopen on #5, as step 1 allows.

## Self-Check: PASSED
