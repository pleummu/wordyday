---
phase: 04-six-boards-and-persistence
reviewed: 2026-10-04T00:00:00Z
depth: standard
files_reviewed: 52
files_reviewed_list:
  - e2e/boards.spec.ts
  - e2e/forfeit.spec.ts
  - e2e/helpers.ts
  - e2e/layout.spec.ts
  - e2e/loading.spec.ts
  - e2e/persistence.spec.ts
  - e2e/settings.spec.ts
  - e2e/storage.spec.ts
  - e2e/tabs.spec.ts
  - e2e/wordubado.spec.ts
  - src/App.test.tsx
  - src/App.tsx
  - src/components/Banner.test.tsx
  - src/components/Banner.tsx
  - src/components/ForfeitRow.test.tsx
  - src/components/ForfeitRow.tsx
  - src/components/GiveUpConfirm.tsx
  - src/components/Grid.test.tsx
  - src/components/Grid.tsx
  - src/components/Header.test.tsx
  - src/components/Header.tsx
  - src/components/LengthPicker.test.tsx
  - src/components/LengthPicker.tsx
  - src/components/Modal.test.tsx
  - src/components/Modal.tsx
  - src/components/NewGameConfirm.tsx
  - src/components/ResetConfirm.tsx
  - src/components/SettingsButton.tsx
  - src/components/SettingsModal.test.tsx
  - src/components/SettingsModal.tsx
  - src/components/Toast.test.tsx
  - src/components/Toast.tsx
  - src/components/usePhysicalKeyboard.ts
  - src/data/wordData.test.ts
  - src/data/wordData.ts
  - src/logic/boards.ts
  - src/logic/save.test.ts
  - src/logic/save.ts
  - src/main.tsx
  - src/state/copy.ts
  - src/state/gameStore.test.ts
  - src/state/gameStore.ts
  - src/state/storage.test.ts
  - src/state/storage.ts
  - src/state/storageToasts.test.ts
  - src/state/sync.test.ts
  - src/state/sync.ts
  - src/state/twoTabs.test.ts
  - src/styles/game.css
  - src/styles/tokens.css
  - src/test/storageDoubles.ts
  - src/test/stubDialog.ts
findings:
  critical: 0
  warning: 5
  info: 9
  total: 14
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-10-04
**Depth:** standard
**Files Reviewed:** 52
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

I reviewed the gap-closure code: id-based per-Board merge (`pickGame`, `mergeBoards`, reset floor), the read-only mode for newer saves, the new `applyExternal` and `startGame`, and the two-tab unit and E2E tests. I traced the merge paths by hand for Play again, New game, Reset, concurrent starts, deferred documents and read-only storage. I did not run the suite.

The two previous BLOCKERs are fixed. The merge order is a total order, so two tabs converge without talking to each other. Reset can no longer be undone by stale documents. No new BLOCKER was found. What remains are honesty gaps in read-only mode, a possible double-finish at the Phase 5 seam, and three previous warnings that the gap closure did not target.

### Status of previous findings

| ID | Status | Notes |
|----|--------|-------|
| CR-01 newer save overwritten | RESOLVED | `loadSave` returns `reason: 'newer'`. `getItem` and `read` switch to read-only without a backup or a corrupt toast. `setItem` and `removeItem` are no-ops while read-only. The E2E test checks that the document is byte-identical after boot, play, Play again and reload. See WR-01 and IN-05 for side effects. |
| CR-02 tabs diverge | RESOLVED | A board-less document no longer starts a game, because `applyExternal` merges per Board and only `raw === null` starts a fresh game. Concurrent starts get equal ids and tie-break on the lower answer. The unit tests cover Play again, New game, Reset and concurrent Play again. |
| WR-01 stale snapshot written | RESOLVED | `startGame` now stores `viewToSaved(prev)` into `boards` before it clears the live view, so the loading document carries the finished game with its own id. |
| WR-02 second storage failure not reported | OPEN | `failedEmitted` is still never cleared (`storage.ts:52-58`, `112-115`). See WR-04. |
| WR-03 pending external survives reset | RESOLVED | `pendingExternal: undefined` is now cleared in `resetAll`, `startGame`, `loadBoard` and the reset path. |
| WR-04 rollback and double-finish | MOSTLY RESOLVED | Rollback is fixed: a higher id wins, and for the same id a finished game beats a playing one, then more guesses. A narrow double-finish race remains. See WR-02. |
| WR-05 one bad Board discards the document | OPEN | `validateSave` still returns `null` on any bad Board (`save.ts:235-236`). See WR-03. |
| WR-06 toast behind modal | OPEN (not touched, not re-verified) | `Toast` is still rendered outside the dialog. |
| WR-07 same answer in both tabs, fixed sleep | RESOLVED | The sleep is gone. `twoTabs(context, { b: 'none' })` and `{ b: { 5: 'slate' } }` now cover Play again, New game and Reset with different answers. |
| IN-01, IN-02, IN-03, IN-04 | OPEN | See IN-01 to IN-04 below. IN-05 and IN-06 were not re-checked. |

## Warnings

### WR-01: Reset in read-only mode claims "All data reset" but changes nothing in storage

**File:** `src/state/storage.ts:121-124`, `src/state/gameStore.ts:311-334`
**Issue:** After the CR-01 fix, `removeItem` returns early while `readOnly` is set. `resetAll` still clears memory, starts a new game and shows the `ALL_DATA_RESET` toast. The newer-version document stays in storage, so the player's real data is untouched and a reload brings it back. The reset button gives a false confirmation. Other tabs also get no reset event, so they are not reset either. The same applies in the other direction: a tab that went read-only from an external newer document keeps showing and running a game that can never be saved.
**Fix:** Disable or hide "Reset my data" while `storage.isReadOnly()`, or show a different toast ("This save is from a newer version and was left untouched"). Expose `readOnly` through `storageOk`-like state so `SettingsModal` can decide.

### WR-02: `onGameFinished` can fire twice for one game when two tabs finish it at the same time

**File:** `src/state/gameStore.ts:472-478`, `609-651`, `src/logic/save.ts:175-192`
**Issue:** `finishGame` runs at the moment of submit, give-up or forfeit, before any merge. Two tabs that show the same game (same id) can finish it in the same window, for example one tab submits the winning word while the other gives up or submits the winning word too. Each fires `onGameFinished`. The merge then converges on one outcome, but both calls already happened. The unit test only covers a stale deferred document, not two real finishes. Phase 5 will hang streaks off this seam, and the earlier requirement was "do not double-count a finished game". The window is narrow, but the result is a wrong streak.
**Fix:** Make the seam idempotent by `(key, gameId)`. Keep a set of finished ids per Board in the store (or in the save document) and skip `onGameFinished` when the id is already finished locally or in the merged document. Add a two-tab test where both tabs finish the same game before delivery.

### WR-03: One invalid Board still discards the whole document, and validation depends on current attempt counts

**File:** `src/logic/save.ts:104-143`, `231-238`
**Issue:** Carried over from the previous WR-05. `validateSave` returns `null` if any single Board fails `validateGame`. The game id check (`Number.isSafeInteger`, `id < 0`) now adds one more way to reject a whole document. All six Boards are lost for one bad entry, and with the corrupt toast and a backup that is overwritten each time. This conflicts with "saved data survives updates" when `BOARD_CONFIG` attempts change.
**Fix:** Skip invalid Boards (`if (!game) continue`) and keep the rest. Reject the whole document only for a bad envelope or top-level shape.

### WR-04: A second storage failure after recovery is still never reported

**File:** `src/state/storage.ts:52-58`, `112-115`
**Issue:** Carried over from WR-02. `failedEmitted` is never reset. After `storage-recovered`, `ok = true` and the store sets `storageOk: true`. If writes fail again, `fail()` sets `ok = false` but emits nothing, so the Settings note stays hidden while progress is not saved. In read-only mode `setItem` returns before it can ever recover, which is correct, but the transient case is still unreported.
**Fix:** Clear `failedEmitted` on recovery, and in `fail()` always emit when `ok` changes from true to false. Keep the toast deduplication in the store (`storageToastShown`).

### WR-05: Reset-in-progress ordering: a tab that boots from the transient board-less document gets ids at or below peers' reset floor and its game is silently replaced

**File:** `src/state/gameStore.ts:311-334`, `384-402`, `409`
**Issue:** `resetFloor` is tab-local and not persisted. `resetAll` writes a board-less document first (`status: 'loading'`, `answer: ''`) and the new game only after pools load. A tab that opens or reloads in that window has `boards = {}` and `clock = 0`, so its first game gets id 1. Peers that saw the reset have a floor equal to their old maximum and drop that game (`gameIdOf(theirs) > floor` fails), write back their own, and the new tab then adopts the peer's game with an "other tab" toast. Typed letters or guesses already made in the new tab are lost. The tabs do converge, so this is not a divergence, but the player loses input and sees a game swap with no cause. The same happens for any tab that reloads while holding only board-less data.
**Fix:** Seed `clock` from a persisted high-water mark (for example store `maxId` in the document, which also survives a reset), or write the reset document with a `floor` field so a booting tab starts above it.

## Info

### IN-01: `persist` `migrate` is still dead and unvalidated

**File:** `src/state/gameStore.ts:700`
**Issue:** Carried over. `getItem` always returns `version: SAVE_VERSION`, so `migrate` never runs. If someone relies on it in Phase 5, it returns an unvalidated cast.
**Fix:** Remove it, or make it throw with a comment that migration lives in `loadSave`/`MIGRATIONS`.

### IN-02: `validateGame` is looser than the game rules

**File:** `src/logic/save.ts:129-131`, `118-122`
**Issue:** Carried over. `gave-up` accepts any count below `attempts`, but `canForfeit` allows only `attempts - 2`. `won` does not reject an earlier occurrence of the answer.
**Fix:** `gave-up` requires `clean.length === attempts - 2`. `won` requires `clean.indexOf(answer) === clean.length - 1`.

### IN-03: Reset deletes the corrupt backup, and the backup slot is overwritten

**File:** `src/state/storage.ts:79-83`, `128`
**Issue:** Carried over. Reset removes `:corrupt`, and each new corruption overwrites it.
**Fix:** Keep the backup on reset, or add a timestamp to the key.

### IN-04: `startTabSync` ignores a second call with different arguments

**File:** `src/state/sync.ts:19`
**Issue:** Carried over. The module-level `started` guard returns the first listener's `stop`.
**Fix:** Key the guard on `target`, or throw when called again with different arguments.

### IN-05: Read-only (newer save) mode reuses the "Saving isn't working" copy

**File:** `src/state/storage.ts:60-64`, `src/state/gameStore.ts:336-349`
**Issue:** `goReadOnly` calls `fail()`, so the player sees "Saving isn't working in this browser. Your progress will be lost when you close this tab." The real cause is that a newer version of the game owns the save. The advice is wrong: reloading the latest build, not changing browser, is the fix. The E2E test pins this exact copy, so it would need to change together.
**Fix:** Add a `'newer'` notice with its own text ("This save is from a newer version of the game, so this tab will not overwrite it. Reload to update.") and a separate flag in the store.

### IN-06: An external change to the active Board during loading closes the Settings dialog

**File:** `src/state/gameStore.ts:205-218`, `459-469`
**Issue:** The "loading or error" branch of `applyExternal` calls `loadBoard()`, which sets `dialog: null`. Unlike the loaded branch, it does not use `closeConfirms`, so an open Settings or Reset dialog is closed by another tab's write. The loaded branch deliberately keeps Settings open.
**Fix:** Let `loadBoard` keep the current dialog when called from `applyExternal`, or restore it afterwards with `closeConfirms(state.dialog)`.

### IN-07: A forged `id` near `Number.MAX_SAFE_INTEGER` makes the next save invalid

**File:** `src/logic/save.ts:135-140`, `src/state/gameStore.ts:190-193`
**Issue:** `validateGame` accepts any safe integer id. With `id = 2**53 - 1`, `nextGameId` returns `2**53`, which fails `Number.isSafeInteger` on the next load, and the whole document is then discarded (see WR-03). Only hand-edited data triggers this.
**Fix:** Cap ids (for example `id <= 1e9`) in `validateGame`.

### IN-08: The "a finished game is not re-finished" E2E test does not check re-finishing

**File:** `e2e/tabs.spec.ts:71-76`
**Issue:** The test asserts the result banner text and that "Play again" is not focused. It never observes a finish count, so it cannot fail if a second finish happens. The unit test in `twoTabs.test.ts` covers the stale-document case only.
**Fix:** Rename the test to what it asserts, or expose the finish count through the test hook and assert it equals 1 in both tabs.

### IN-09: Focus returns to the Settings button after Reset or closing Settings (known, owner-flagged)

**File:** `e2e/tabs.spec.ts:144-146`, `src/components/SettingsModal.tsx`
**Issue:** Already known. Enter on the focused Settings button reopens Settings. The E2E test works around it with `blur()`, which hides the keyboard-only problem from CI.
**Fix:** Return focus to the grid or the body after the dialog closes, and remove the `blur()` workaround from the test.

---

_Reviewed: 2026-10-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
