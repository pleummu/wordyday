---
phase: 04-six-boards-and-persistence
plan: 02
subsystem: persistence
tags: [zustand-persist, localStorage, resume, restore, tdd]
requires: ["04-01"]
provides:
  - "src/state/storage.ts: createSaveStorage, getLocalStorage, SaveStorage, StorageNotice"
  - "persisted gameStore: boards map, resume(), submit-time outcome, token-checked reveal, finishedInSession, onGameFinished seam, defaultSaveStorage, isFinished"
  - "Grid celebrate prop and Banner autoFocus prop (static restore)"
affects: [04-03, 04-04, 04-06, 04-07]
tech-stack:
  added: []
  patterns: ["never-throwing PersistStorage adapter with validation in getItem", "partialize overlay of live view onto boards map"]
key-files:
  created:
    - src/state/storage.ts
    - src/state/storage.test.ts
    - src/test/storageDoubles.ts
    - src/components/Banner.test.tsx
  modified:
    - src/state/gameStore.ts
    - src/state/gameStore.test.ts
    - src/main.tsx
    - src/App.tsx
    - src/App.test.tsx
    - src/components/Header.test.tsx
    - src/components/Grid.tsx
    - src/components/Grid.test.tsx
    - src/components/Banner.tsx
key-decisions:
  - "Validation lives in the adapter (loadSave) and mergeDocIntoState, because persist only calls migrate on a version mismatch"
  - "Outcome is persisted in the same set as the submitted row (status revealing resolves via resolveOutcome)"
  - "Only the revealing row flips; won bounce/flip needs celebrate (finishedInSession)"
requirements-completed: [SAVE-03, SAVE-04, SAVE-05, SAVE-06, SAVE-07]
duration: ~25min
completed: 2026-10-03
---

# Phase 4 Plan 02: Persisted store, resume and static restore Summary

Refreshing now restores the exact Board (rows, key colours, finished state) with no animation replay or focus steal, via a never-throwing storage adapter and a Zustand `persist` wrapper around the 04-01 save document.

## Tasks

1. Safe storage adapter: RED a192f87, GREEN 84bd7a1 (12 tests: corrupt backup, write dedupe, quota/SecurityError fallback, notices, pure `read`).
2. Persisted store: 8e44e49. `resume()` boot, `loadBoard` shared with `retryLoad`, submit-time outcome, D-16 token check, `finishedInSession`, `onGameFinished` seam, `gave-up` status and `isFinished`.
3. Static restore: c0f8266. Grid flips only the revealing row, bounces only a celebrated win; Banner focuses only when `autoFocus`.

Verification: 269 unit tests, lint, typecheck, prettier pass; `e2e/persistence.spec.ts` 4/4 green; all other chromium E2E (37 excluding boards.spec) pass.

## Deviations from Plan

None in behaviour. Notes:
- The `token` test bumps `loadToken` via `setState` while status stays `revealing`, so the stale timer is actually observable (a real `startGame` would put status in `loading` and mask the check).
- Banner mount effect carries an `exhaustive-deps` disable on purpose (focus on mount only).
- `state.boards` is only refreshed on hydrate/load; the live Board is overlaid at persist time. 04-03 (switchBoard) must fold the live view back into `boards` before switching.

## Known Stubs

None. `wordubadoInfoSeen` is persisted but not yet wired to the info popup (planned for 04-03).

## Threat Flags

None. T-04-04 to T-04-06 and T-04-08 mitigations implemented and tested.

## Self-Check: PASSED
