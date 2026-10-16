---
phase: 04-six-boards-and-persistence
plan: 08
subsystem: storage-resilience
tags: [storage, versioning, gap-closure, CR-01]
requires: ["04-07"]
provides:
  - "loadSave result reason 'invalid' | 'newer'"
  - "Read-only storage session on newer-version saves (isReadOnly)"
affects: [src/logic/save.ts, src/state/storage.ts, src/state/gameStore.ts]
key-files:
  modified:
    - src/logic/save.ts
    - src/logic/save.test.ts
    - src/state/storage.ts
    - src/state/storage.test.ts
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
decisions:
  - "A newer-version document is never backed up, never overwritten; storage goes read-only for the session and reuses the storage-failed toast"
metrics:
  tasks: 2
  completed: 2026-10-04
---

# Phase 4 Plan 08: Newer-version saves are read-only, not corrupt Summary

Closes CR-01: `loadSave` now reports `reason: 'newer'` for any integer version above `SAVE_VERSION`. Storage then goes read-only for the session. It emits the existing storage-failed notice once, writes no `:corrupt` backup, and ignores `setItem` and `removeItem`. `applyExternal` ignores newer documents from other tabs.

## Commits
- 36c0635: test(04-08) failing CR-01 tests (RED)
- d9b8f0d: fix(04-08) newer result and read-only storage (GREEN)

## Verification
- `npx vitest run`: 331 passed
- `npm run typecheck` and `npm run lint`: clean
- `npx playwright test e2e/storage.spec.ts --project=chromium`: 3 passed

## Deviations from Plan
- The existing storage test row "version 2 backs up as corrupt" was changed to "version 0", because version 2 is now the newer path. Prettier was run on the touched files.

## Known Stubs
None.

## Self-Check: PASSED
