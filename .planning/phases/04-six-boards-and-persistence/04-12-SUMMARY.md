---
phase: 04-six-boards-and-persistence
plan: 12
subsystem: e2e
tags: [e2e, tab-sync, storage, gap-closure, CR-01, CR-02, WR-07]
requires: ["04-08", "04-11"]
provides:
  - "Two-tab E2E where only tab A has a fixed answer: Play again, New game and Reset converge (CR-02)"
  - "Newer-version save E2E: document untouched, no :corrupt backup, storage-off line in Settings (CR-01)"
  - "No fixed sleeps in e2e/tabs.spec.ts (WR-07)"
affects: [e2e/tabs.spec.ts, e2e/storage.spec.ts]
key-files:
  created: []
  modified:
    - e2e/tabs.spec.ts
    - e2e/storage.spec.ts
decisions:
  - "twoTabs(context, { b }) takes 'same' | 'none' | answers object so B's answer can differ from or be unset relative to A"
  - "After Reset the reset test blurs the focused Settings button before guessing; the focus-return behaviour itself is left for an owner decision"
metrics:
  tasks: 3
  completed: 2026-10-04
requirements: [SAVE-05, SAVE-06, SAVE-08]
---

# Phase 4 Plan 12: End-to-end proof of CR-01 and CR-02 Summary

Chromium E2E now proves that two real tabs stay on the same game through Play again, New game and Reset, even when only one tab has a fixed answer, and that a save from a newer app version is left byte-for-byte untouched. The owner confirmed the same in two real browser tabs.

## Commits
- 45a04d6: test(04-12) two-tab E2E with answer fixed only in tab A, no fixed sleeps
- f7f86ac: test(04-12) newer-version save stays untouched end to end (CR-01)

## Verification
- `npx playwright test` (chromium + mobile): 126 passed
- `e2e/tabs.spec.ts` on chromium with `--repeat-each=3`: 21/21 passed
- `npx vitest run`: 372 passed; typecheck, lint, format:check clean
- Task 3 (human-verify): owner replied "approved" after steps 1-5 on a production build

## Deviations from Plan
- The first executor stalled after writing both spec changes; the orchestrator finished, ran and committed tasks 1 and 2 inline.
- **[Rule 1 - test bug] Reset test pressed Enter on the focused Settings button.** After Reset, focus returns to the Settings button, so `guess()`'s Enter reopened Settings instead of submitting. Sync itself was correct (storage held `crane`, id 2). Fix: blur the active element before guessing, with a comment. No production code changed (plan forbids it).

## Follow-up for owner
After Reset (and after closing Settings), keyboard focus sits on the Settings button, so typing a word then Enter reopens Settings instead of submitting the guess. Pre-existing since 04-06. Owner to decide whether to fix.

## Known Stubs
None.

## Self-Check: PASSED
