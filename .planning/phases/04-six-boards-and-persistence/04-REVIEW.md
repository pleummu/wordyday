---
phase: 04-six-boards-and-persistence
reviewed: 2026-10-03T00:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - src/logic/save.ts
  - src/logic/boards.ts
  - src/state/storage.ts
  - src/state/sync.ts
  - src/state/gameStore.ts
  - src/state/copy.ts
  - src/main.tsx
  - src/App.tsx
  - src/data/wordData.ts
  - src/components/Banner.tsx
  - src/components/ForfeitRow.tsx
  - src/components/GiveUpConfirm.tsx
  - src/components/NewGameConfirm.tsx
  - src/components/ResetConfirm.tsx
  - src/components/SettingsButton.tsx
  - src/components/SettingsModal.tsx
  - src/components/Grid.tsx
  - src/components/Header.tsx
  - src/components/LengthPicker.tsx
  - src/components/Modal.tsx
  - src/components/Toast.tsx
  - src/components/usePhysicalKeyboard.ts
  - src/styles/game.css
  - src/styles/tokens.css
  - src/test/storageDoubles.ts
  - e2e/tabs.spec.ts
findings:
  critical: 2
  warning: 7
  info: 6
  total: 15
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-10-03
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

I reviewed the persistence layer (`save.ts`, `storage.ts`, `sync.ts`), the Board-aware store (`gameStore.ts`) and the new dialogs and components. Validation of a single document is careful: prototype keys are rejected, outcomes are checked against the guesses, and `JSON.parse` is wrapped. The reveal-timer token works for the paths it covers. The weak points are what happens between tabs and between versions:

- **A v1 build destroys a newer save (CR-01).** A save from a later version is treated as corrupt and overwritten. Phase 5 adds v2, so this v1 code is the code that will run in old tabs after that deploy.
- **Tabs can end up on different games (CR-02).** When another tab's document is missing the active Board, the store starts its *own* random game. Play again, New game and Reset in one tab make the two tabs race. I reproduced a state where both tabs show different answers for the same Board and both show "Updated from your other tab."
- **Stale data gets written.** `startGame` writes the old snapshot of the active Board while it loads (WR-01). A deferred external document can outlive a reset (WR-03).

I confirmed CR-02 and WR-01 with a throwaway Vitest script in the session scratchpad (two `createGameStore` instances sharing one storage map, with `storage` events delivered by `setTimeout`). No project files were changed.

## Critical Issues

### CR-01: A save from a newer version is treated as corrupt and overwritten (forward-compat data loss)

**File:** `src/logic/save.ts:171-179`, `src/state/storage.ts:74-85`, `src/state/storage.ts:134-138`, `src/state/gameStore.ts:359-360`
**Issue:** `loadSave` returns `{ ok: false }` for `version > SAVE_VERSION`. Nothing separates that case from real corruption:
- **On boot**, `getItem` copies the document to `:corrupt`, shows "We couldn't read your saved games, so we started fresh", and returns `null`. The next `set` (the `startGame` in `resume`) overwrites the newer document with a v1 one.
- **Across tabs**, `read()` returns `'invalid'` and `applyExternal` silently ignores it. The old tab's next action (any guess) then writes its v1 document over the v2 document. The v2 tab receives that v1 text, migrates it v1→v2, and loses whatever v2 added.

This is the expected case right after the Phase 5 deploy. A user has an old tab open, or Vercel rolls back, and `dayStreak`, `restores` and `winStreak` are wiped. The `:corrupt` slot has one entry and is overwritten on every corruption. Nothing ever restores from it. This code has to be fixed in v1, because v1 is the code running in those old tabs.
**Fix:** Return a separate result for a newer version and make storage read-only for the rest of the session:
```ts
// save.ts
if (version > SAVE_VERSION) return { ok: false, reason: 'newer' }
// storage.ts getItem
if (!res.ok && res.reason === 'newer') { readOnly = true; emit('storage-failed'); return null }
// storage.ts setItem / removeItem
if (readOnly) return
// storage.ts read(): return 'newer' and have applyExternal set readOnly too
```
Do not show the "corrupt" toast or write the backup for this case. Optionally ask the user to reload.

### CR-02: An external document without the active Board makes each tab start its own random game, so tabs diverge

**File:** `src/state/gameStore.ts:420-431` (with `453-467`, `447-450`, `304-318`)
**Issue:** `startGame` sets `status: 'loading'` synchronously, and `persist` writes that state right away. For a Board with no snapshot in `s.boards`, that document has no entry for the active Board. Other tabs on the same Board then go through the `theirs === undefined` branch and call `startGame` with their own `rng`. Both tabs now hold different fresh games, each writes its own, and each adopts the other's. They end up crossed. Reproduced:

```
A WRITE {}                                   <- Play again, loading
A WRITE {"normal-5":{"answer":"ghost",...}}
B WRITE {"normal-5":{"answer":"house",...}}  <- B started its own game
final: A shows "house", B shows "ghost", storage "house"; BOTH tabs toast "Updated from your other tab."
```

The same happens after `forfeitNewGame` (it deletes the key before `startGame`) and after `resetAll` (the reset scenario also ended crossed). The player who just clicked Play again gets a "from your other tab" toast and a different game from the one first shown. The tabs stay out of sync until the next guess. This breaks the phase goal that "tabs sync through the storage event". The e2e suite does not catch it because `fixAnswers` makes both tabs pick the same answer (see WR-07).
**Fix:** Do not invent a game in response to a document that lacks the Board. When the active Board is missing from `doc.boards` and `raw !== null`, keep the live game. Merge only the other Boards and write back so the other tab adopts yours:
```ts
if (!theirs && raw !== null) {
  set({ boards: { ...doc.boards }, wordubadoInfoSeen: doc.wordubadoInfoSeen })
  return // our live game is re-added by docFromState and broadcast
}
```
Also avoid broadcasting the board-less "loading" document. One way is to pick the answer before the first `set` when pools are already cached. Another is to have `docFromState` keep the previous entry while `status === 'loading'`. Keep the reset path (`raw === null`) as the only external trigger that starts a fresh game.

## Warnings

### WR-01: `startGame` writes the stale snapshot of the active Board, so other tabs briefly bring back a finished game

**File:** `src/state/gameStore.ts:153-166`, `453-467`
**Issue:** `s.boards[activeKey]` is only refreshed on `switchBoard`, `applyExternal` and hydrate. During play it keeps the snapshot from boot. When `startGame` sets `status: 'loading'`, `viewToSaved` returns `null`, so `docFromState` writes that old snapshot. Confirmed: the game was loaded with `crane / ["ghost"] / playing`, then won, then Play again. Storage first received `{"answer":"crane","guesses":["ghost"],"outcome":"playing"}` again, then the new game. Another tab on that Board adopts the old game, with its now-known answer, as `playing` and shows a toast, then replaces it a moment later. If the page dies between the two writes, or if pools fail to load (the `status: 'error'` branch keeps writing the snapshot), the finished game comes back as playable after a reload.
**Fix:** Keep `boards[activeKey]` in sync whenever the live view changes. Or, in `startGame`'s first `set`, remove the key (`const { [key]: _, ...rest } = get().boards; set({ boards: rest, answer: '', ... })`), together with the CR-02 fix so that a missing key does not trigger a race.

### WR-02: A second storage failure after a recovery is never reported

**File:** `src/state/storage.ts:50-56`, `96-105`
**Issue:** `failedEmitted` is set once and never cleared. After `storage-recovered`, the store sets `storageOk: true`. If writes fail again (quota fills up again), `fail()` sets `ok = false` but emits nothing. The store keeps `storageOk: true`, Settings drops the "Saving isn't working" note, and the player loses progress without being told.
**Fix:** Reset the flag on recovery (`ok = true; failedEmitted = false; emit('storage-recovered')`). Keep the toast deduped with the store's `storageToastShown` if only one toast is wanted, but always send `storageOk: false`.

### WR-03: A `pendingExternal` deferred during a reveal survives `resetAll`, and the stale document is applied later

**File:** `src/state/gameStore.ts:304-322`, `355-358`, `613-617`
**Issue:** Settings can be opened during a reveal (`openSettings` does not check `status`, and `SettingsButton` is not disabled while busy). If an external event arrives during the reveal, `pendingExternal` is set. A Reset then bumps `loadToken`, so the reveal timer never calls `finishReveal`, and `pendingExternal` is never consumed. On the next guess's `finishReveal`, the pre-reset document is applied. It restores the old Boards and writes them back, which undoes the reset. It can also overwrite newer documents that were applied in the meantime.
**Fix:** Clear `pendingExternal: undefined` in `resetAll` and in `startGame`/`loadBoard`, or wherever `loadToken` is bumped. Consider disabling Settings while `status === 'revealing'`, as is done for the mode switch and length picker.

### WR-04: Whole-document last-writer-wins can roll back a game that has already been reported as finished

**File:** `src/state/gameStore.ts:354-418`, `565-572`
**Issue:** `applyExternal` replaces all of `boards` with the other tab's document and adopts its version of the active Board. If the other tab wrote before it saw this tab's latest write (more likely now because of CR-02's automatic `startGame` writes), the deferred document is applied at `finishReveal`. That rolls this tab back to the earlier guesses, even though `finishGame(key, 'won')` already ran at submit. The player can then win the same game again, and `onGameFinished` fires twice. CONTEXT says "Do not lose submitted guesses, and do not double-count a finished game (Phase 5 stats depend on this)". Phase 5 will hang streaks off this seam.
**Fix:** Merge per Board instead of replacing everything. For a Board with the same `answer`, keep the version with more guesses, and never move a finished outcome back to `playing`. Adopt the other document only when the answer differs, which means a genuinely new game.

### WR-05: One invalid Board throws away all six Boards (and in Phase 5, all streaks)

**File:** `src/logic/save.ts:150-156`
**Issue:** `validateSave` returns `null` if any single Board fails `validateGame`, so one bad entry discards the whole document. The validator also depends on the current `BOARD_CONFIG` attempts (`guesses.length > attempts`, `lost` requires `>= attempts`). A later change to attempts or rules would make every existing save "corrupt", which goes against "saved data survives updates".
**Fix:** Drop invalid Boards one by one (`if (!game) continue`) and keep the rest of the document. Reject the whole document only when its envelope or top-level shape is invalid. Optionally record that something was dropped so a quieter notice can be shown.

### WR-06: Toasts render behind open modals, so the "All data reset" announcement is likely missed

**File:** `src/App.tsx:51`, `src/components/Modal.tsx:72-77`, `src/components/ResetConfirm.tsx:42-48`
**Issue:** `Toast` is outside the `<dialog>`. While any dialog opened with `showModal()` is open, the rest of the document is inert and below the top layer. Toasts that arrive while Settings is open ("Updated from your other tab", storage-failed) are hidden behind the backdrop and not announced. After Reset, the toast is rendered while the reset dialog is still open for its 120 ms close animation. By the time the page is no longer inert, the live region's text has not changed, so screen readers may never announce "All data reset". This undermines the accessibility constraint in CLAUDE.md.
**Fix:** Render the toast layer in the top layer (a `popover="manual"` element shown after the dialog, or inside the open dialog), or set the toast text only after the dialog's `finish()` has closed it.

### WR-07: The two-tab e2e tests fix the answer in both tabs, which hides CR-02; one test uses a fixed sleep

**File:** `e2e/tabs.spec.ts:14-24`, `44`
**Issue:** `fixAnswers` gives both pages the same answer, so tabs that each start their own game look "in sync" even when they raced. No test covers Play again or New game with a second tab open, or checks that both tabs show the same answer after Reset. `b.waitForTimeout(300)` followed by a `toHaveCount(0)` assertion is timing-dependent and can pass before the event has been handled.
**Fix:** Add a test that fixes the answer only in tab A (or gives each tab different answers), clicks Play again or New game in A, and asserts that B shows the same answer and that A shows no "other tab" toast. Replace the sleep with a positive condition (for example, wait for the in-progress dot, which is already done, then assert the toast count with `expect.poll` over a bounded window).

## Info

### IN-01: The persist `migrate` option is dead and skips validation

**File:** `src/state/gameStore.ts:631`
**Issue:** `getItem` always returns `version: SAVE_VERSION` because `loadSave` already migrates, so persist never calls `migrate`. If it ever did, it would return an unvalidated object cast to `SaveDoc`. This is a trap for Phase 5, where someone may add migration logic here instead of to `MIGRATIONS`.
**Fix:** Remove it or make it throw, and add a comment that migration happens in `loadSave`.

### IN-02: `validateGame` is looser than the game rules

**File:** `src/logic/save.ts:117-132`
**Issue:** `gave-up` is accepted with any number of guesses from 0 to `attempts - 1`, but `canForfeit` only allows `attempts - 2`. `won` does not reject an answer that also appears earlier in the list. Hand-edited data can produce states the game itself cannot.
**Fix:** For `gave-up`, require `clean.length === attempts - 2`. For `won`, require `clean.indexOf(answer) === clean.length - 1`.

### IN-03: Reset also deletes the corrupt backup, and the backup slot is overwritten

**File:** `src/state/storage.ts:79-83`, `113-114`
**Issue:** `removeItem` also removes `:corrupt`, so "Reset my data" deletes the only copy of an unreadable save. Each new corruption overwrites the previous backup. A backup that fails (for example, quota) still shows the "started fresh" toast, and the original is overwritten on the next write.
**Fix:** Keep the backup on reset, or document that it is cleared. Consider adding a timestamp to the backup key.

### IN-04: `startTabSync` silently ignores a second call with different arguments

**File:** `src/state/sync.ts:19`
**Issue:** The module-level `started` guard returns the first listener's `stop`, even if a different store, target or key is passed. That is harmless in production, but tests that pass a different store get the old listener.
**Fix:** Key the guard on `target`, or throw if called again with different arguments.

### IN-05: Arrow keys move focus in a disabled length picker

**File:** `src/components/LengthPicker.tsx:25-32`
**Issue:** While `disabled` (during a reveal), `change()` does nothing, but `refs.current[next]?.focus()` still moves focus. Focus lands on an unchecked radio with `tabIndex -1`, so roving focus and `aria-checked` disagree.
**Fix:** Return early from `onKeyDown` when `disabled`.

### IN-06: Switching back to a length whose chunk failed reloads the page without a user retry

**File:** `src/data/wordData.ts:32-44`
**Issue:** Any `loadPools` call for a failed length reloads the page when online, including `switchBoard`, not only the explicit Try again button. Saved games are safe because `switchBoard` captures the live game first, but the reload happens without warning.
**Fix:** Only reload from `retryLoad`, for example by passing a `{ allowReload }` flag. Otherwise reject straight away so the error UI is shown.

---

_Reviewed: 2026-10-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
