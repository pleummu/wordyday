---
phase: 02-playable-normal-game
reviewed: 2026-10-02T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - src/logic/score.ts
  - src/logic/keys.ts
  - src/logic/pickAnswer.ts
  - src/state/gameStore.ts
  - src/state/testHook.ts
  - src/data/wordData.ts
  - src/components/usePhysicalKeyboard.ts
  - src/components/Keyboard.tsx
  - src/components/LengthPicker.tsx
  - src/components/Toast.tsx
  - src/App.tsx
  - src/main.tsx
  - src/test-hook.d.ts
  - scripts/check-bundle.mjs
  - e2e/helpers.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 2: Code Review Report

**Depth:** standard. Files read in full: the 15 listed above (logic, store, data, hooks, key components, bundle check, e2e helper). The remaining files in scope (CSS, other tests, CI, config, other components) were not read in depth.

## Summary

Two-pass scoring is correct (greens first, then a count of unmatched answer letters consumed left to right). Key best-state merging is correct (absent < present < correct, never downgraded). The reveal lock is sound: `typeLetter`, `backspace` and `submit` require `status === 'playing'`, `selectLength` is blocked while revealing, and `finishReveal` is a no-op unless status is `revealing`. The StrictMode listener is cleaned up properly, and the first game is started outside effects. No blockers found. The test hook and the reload-on-retry behaviour have the weaknesses below.

## Warnings

### WR-01: Test hook is live in production and lets players read or set the answer

**File:** `src/state/testHook.ts:7` (consumed at `src/state/gameStore.ts:84`)
**Issue:** `readTestAnswer` is unconditional. Anyone can run `globalThis.__WORDLE_TEST__ = {answers:{5:'crane'}}` in the console and fix the answer for the next game. This is cheating-only, with no security impact, but the hook ships in the production bundle. It is also a risk later when stats, streaks and Restores exist. Playwright runs against the production build, so a plain `import.meta.env.DEV` gate would break E2E.
**Fix:** Gate it with a build-time flag, for example `import.meta.env.VITE_E2E === 'true'`. Build the preview for E2E with that variable set, and have the production build tree-shake the hook. Alternatively, have `check-bundle.mjs` assert that the string `__WORDLE_TEST__` is absent from the production dist.

### WR-02: Enter on a focused on-screen letter key submits the guess instead of activating the key

**File:** `src/components/usePhysicalKeyboard.ts:8-17`, `src/components/Keyboard.tsx:29-40`
**Issue:** Only elements inside `[data-own-enter]` are exempt. Keyboard-only users who Tab to an on-screen key (or the Backspace key) and press Enter get `preventDefault()` plus `submit()`, so the key's own click never fires. This conflicts with the project's keyboard-only accessibility requirement. Space does work, because the handler ignores it.
**Fix:** Add `data-own-enter` to the keyboard buttons. Keep the blur-on-pointer-click behaviour already in `Keyboard.tsx`, which avoids the "Enter re-clicks the last key" problem for pointer users.

### WR-03: Reload-on-retry hangs forever and breaks when offline

**File:** `src/data/wordData.ts:28-34`
**Issue:** When a chunk import has failed, the next `loadPools` call reloads the page and returns a never-resolving promise. There is no service worker, so if the user is still offline the reload shows the browser's error page and the whole app is lost. The remaining state is permanent `loading` with a spinner. A `location.reload()` that is blocked or ignored (for example in some embedded contexts) leaves the UI stuck in `loading` with no way out. The comment says reloading is safe because Phase 2 has no saved progress. That assumption will break when Phase 3 adds persistence and streaks, so it needs revisiting then.
**Fix:** Retry with a cache-busting dynamic import first, for example `import(\`./words-${n}.json?retry=${Date.now()}\`)`. That is awkward with Vite's static analysis, so as an alternative reload only when `navigator.onLine` is true. Otherwise reject so the error UI stays visible. Add a TODO linking to the persistence phase.

### WR-04: Reveal timer is never cancelled or tied to the game

**File:** `src/state/gameStore.ts:143-147`
**Issue:** `setTimer` is fire-and-forget. The only protection is the `status !== 'revealing'` check in `finishReveal`. Today `selectLength` is blocked while revealing, so this is safe. But if another path ever calls `startGame` while revealing (a future Restore or reset action), the new game would move straight from `loading` or `playing` to a state where a stale timer could fire. If the new game is also `revealing`, a stale timer from the old game would finish its reveal early. `startGame` called directly (it is public) is not guarded.
**Fix:** Store a reveal token (or reuse `loadToken`) when submitting, and have the timer callback ignore itself if the token has changed: `const t = get().loadToken; setTimer(() => { if (get().loadToken === t) get().finishReveal() }, ...)`.

## Info

### IN-01: Guesses typed during the reveal are silently dropped

**File:** `src/state/gameStore.ts:109-111`
**Issue:** `typeLetter` returns early while `status === 'revealing'`, so fast typists lose the first letters of the next guess for about 1.7s. This is a deliberate lock, but it affects the "smooth, responsive feel" goal.
**Fix:** Optionally buffer typing during the reveal, or allow `typeLetter` and `backspace` during `revealing` (rows are already appended). Only submission needs the lock.

### IN-02: `selectLength` ignores the loading state

**File:** `src/state/gameStore.ts:93-98`
**Issue:** Switching length while `loading` is allowed and handled correctly through `loadToken`. However, selecting the same length during `loading` is a no-op, and when the earlier load fails, the status stays on `error` until the user clicks the length again (which then retries).
**Fix:** No change required. Consider documenting this, or handling it in the retry flow.

---

_Reviewed: 2026-10-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
