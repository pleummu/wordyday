---
phase: 01-foundation-spec-and-ci-skeleton
plan: 02
subsystem: docs
tags: [spec, restore-state-machine, edge-cases]
requires: [01-01]
provides:
  - SPEC.md at repo root: ID-tagged rules (R-<AREA>-<n>) with Covers lines, sections 0-13
  - Restore state machine (R-RESTORE-1..13) and 44-row edge-case table (EC-01..EC-44)
  - Four owner-overridable open questions with stated defaults
affects: [phase 2-7 implementation, phase 5 table-driven tests]
tech-stack:
  added: []
  patterns: [stable rule IDs cited by tests, Given/Event/Expected edge-case table]
key-files:
  created: [SPEC.md]
  modified: []
key-decisions:
  - "Open question defaults written into SPEC.md (EC-40 deferred credit, K left before use, refill on answer date, zero-guess board cannot be abandoned)"
  - "R-LEN-1 is the attempts rule, as cited by the plan 01-01 boards test"
requirements-completed: [DOC-01]
duration: 20min
completed: 2026-10-01
---

# Phase 1 Plan 02: SPEC.md Summary

SPEC.md (318 lines) supersedes plan.txt with ID-tagged rules, the full Restore state machine (R-RESTORE-1..13) and 44 edge-case rows ready for Phase 5 table-driven tests.

## Commits

- 9919ddb: SPEC.md sections 0-7 (modes, pools, scoring, Boards, Give Up/Forfeit, streaks)
- 5b06f73: SPEC.md section 8 state machine, EC table, open questions, sections 9-13

## Deviations from Plan

None in scope. One self-correction: the first draft of EC-39 carried a confusing "missed 1" note copied from the research draft; it was rewritten before commit as a clean row (LAD=Jun 3, finish Jun 4, missed 0, S becomes 6).

## Known Stubs

None.

## Self-Check: PASSED

SPEC.md exists, both commits exist, all EC-01..EC-44 present, 13 R-RESTORE rules, no "daily streak", Prettier check passes.
