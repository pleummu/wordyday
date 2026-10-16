---
phase: 04-six-boards-and-persistence
plan: 07
subsystem: storage-resilience
tags: [storage, toasts, cross-tab-sync, chunk-retry]
requires: ["04-06"]
provides:
  - "startTabSync and applyExternal for cross-tab sync"
  - "Corrupt and storage-failed toasts with Toast lifeMs"
  - "Safe loadPools retry (offline reject, 3 s reload timeout)"
affects: []
key-files:
  created:
    - src/state/sync.ts
    - src/state/sync.test.ts
    - src/state/storageToasts.test.ts
    - e2e/storage.spec.ts
    - e2e/tabs.spec.ts
  modified:
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
    - src/state/storage.ts
    - src/state/storage.test.ts
    - src/state/copy.ts
    - src/components/Toast.tsx
    - src/components/Toast.test.tsx
    - src/styles/game.css
    - src/main.tsx
    - src/data/wordData.ts
    - src/data/wordData.test.ts
    - e2e/loading.spec.ts
key-decisions:
  - "applyExternal does one set per sync and returns without setting when boards and wordubadoInfoSeen already match, so tabs never ping-pong their own last pointer"
  - "Unavailable storage (null area) is now a storage failure notice, not silence"
requirements-completed: [SAVE-06, SAVE-07, SAVE-08]
completed: 2026-10-03
---

# Phase 4 Plan 07: Bad Storage, Two Tabs, Safe Retry Summary

Corrupt, blocked and full storage now show one calm 4 s toast and never stop play; two tabs stay in sync through the storage event without loops or double counting; and Try again after a failed word-list load no longer hangs or reloads while offline.

## Tasks

1. Storage and tabs E2E, Toast lifeMs, copy, notice toasts, `onNotice` wired in main.tsx. Commit 14a39d4.
2. `applyExternal`, `pendingExternal`, `startTabSync`, tests. Commit 7f6d65d.
3. wordData retry fix, 2 unit tests, offline E2E. Commit 6f1a4f4.

Gate: 324 unit tests, lint, typecheck, format:check, build and 118 Playwright tests (both projects) pass.

## Deviations from Plan

**1. [Rule 1 - Bug] Blocked storage produced no notice.** The adapter treated an unavailable area (getter throws, so `getLocalStorage` returns null) as silent. Now `getItem`/`setItem` call `fail()` on a null area; the older storage unit test asserting silence was updated. Files: src/state/storage.ts, storage.test.ts.

**2. [Rule 1 - Bug] Sync writes could ping-pong.** A first draft set boards, then the view, causing an intermediate write and each tab writing its own `last`. applyExternal now returns without setting when nothing differs and applies a single set otherwise.

**3.** Storage-toast unit tests live in `src/state/storageToasts.test.ts` rather than gameStore.test.ts (sync tests are in gameStore.test.ts `describe('sync')` as planned).

## Known Stubs

None.

## Threat Flags

None. T-04-20 to T-04-25 mitigated as planned; T-04-26 accepted.

## Self-Check: PASSED
