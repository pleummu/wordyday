---
phase: 01-foundation-spec-and-ci-skeleton
plan: 03
subsystem: docs
tags: [glossary, spec, vocabulary]
requires:
  - phase: 01-02
    provides: SPEC.md with rule IDs and Restore state machine
provides:
  - GLOSSARY.md with the twelve domain terms, avoid notes and SPEC rule references
  - SPEC.md section 0 link to GLOSSARY.md
affects: [all later phases (shared vocabulary for code, tests, UI copy)]
tech-stack:
  added: []
  patterns: [one glossary term per heading, "Avoid saying" and "See: R-*" lines per entry]
key-files:
  created: [GLOSSARY.md]
  modified: [SPEC.md]
key-decisions:
  - "Glossary defines exactly twelve terms (D-11), grouped Play and Streaks"
requirements-completed: [DOC-02, DOC-01]
duration: 5min
completed: 2026-10-01
---

# Phase 1 Plan 03: Glossary Summary

**GLOSSARY.md with the twelve domain terms, each citing real SPEC.md rule IDs, cross-linked from SPEC.md section 0.**

## Accomplishments
- GLOSSARY.md (93 lines): twelve `###` terms, 12 "Avoid saying" lines, 12 "See:" lines, Forfeit vs Give Up difference explicit (both only at exactly 2 tries left, both a loss and a finished game), Missed Day and Board examples.
- SPEC.md section 0 now links to GLOSSARY.md and lists the twelve terms. All cited rule IDs exist in SPEC.md, all twelve terms appear there with exact capitalisation, and "daily streak" appears 0 times in SPEC.md.

## Task Commits
1. Task 1 GLOSSARY.md: 6fad1e4
2. Task 2 vocabulary alignment (only edit needed was the section 0 link): 5279a1d

## Verification
Both plan automated verify commands passed as written (chained).

## Deviations from Plan
None - plan executed exactly as written. Lowercase "missed day(s)" in edge-case table prose was left as a plain count, not the defined term.

## Known Stubs
None.

## Self-Check: PASSED
