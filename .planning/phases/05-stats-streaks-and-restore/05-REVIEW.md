---
phase: 05-stats-streaks-and-restore
reviewed: 2026-10-05T00:00:00Z
depth: standard
files_reviewed: 46
files_reviewed_list:
  - e2e/axe.ts
  - e2e/helpers.ts
  - e2e/layout.spec.ts
  - e2e/restore.spec.ts
  - e2e/stats.spec.ts
  - e2e/storage.spec.ts
  - e2e/streaks.spec.ts
  - e2e/wordubado.spec.ts
  - eslint.config.js
  - package.json
  - src/App.tsx
  - src/components/Banner.tsx
  - src/components/Header.tsx
  - src/components/Modal.tsx
  - src/components/RestorePrompt.tsx
  - src/components/StatsButton.tsx
  - src/components/StatsModal.tsx
  - src/components/StreakBreakModal.tsx
  - src/components/StreakChip.tsx
  - src/components/Toast.tsx
  - src/logic/save.ts
  - src/logic/stats.ts
  - src/logic/streaks.ts
  - src/main.tsx
  - src/state/clock.ts
  - src/state/copy.ts
  - src/state/gameStore.ts
  - src/state/streakWatch.ts
  - src/styles/game.css
  - src/test/storageDoubles.ts
  - src/components/Banner.test.tsx
  - src/components/Modal.test.tsx
  - src/components/RestorePrompt.test.tsx
  - src/components/StatsModal.test.tsx
  - src/components/StreakBreakModal.test.tsx
  - src/components/StreakChip.test.tsx
  - src/logic/save.test.ts
  - src/logic/stats.test.ts
  - src/logic/streaks.test.ts
  - src/logic/score.test.ts
  - src/logic/pickAnswer.test.ts
  - src/state/clock.test.ts
  - src/state/gameStore.test.ts
  - src/state/storage.test.ts
  - src/state/streakWatch.test.ts
  - src/state/twoTabs.test.ts
findings:
  critical: 1
  warning: 5
  info: 7
  total: 13
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-10-05
**Depth:** standard
**Files Reviewed:** 46
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

I reviewed the Phase 5 stats, Day Streak, Restore and two-tab merge work. Most of it is solid:

- Date maths uses `Date.UTC` on parsed parts, so DST is handled correctly.
- The local `YYYY-MM-DD` key and the midnight timer use local fields.
- The v1 to v2 migration is additive.
- Validation fails per slice to safe defaults.
- Merges are total orders, so the result does not depend on which tab merges first.

The main defect is in the deferred-credit path of the Restore offer. When a game finishes on the day the offer appears and the player answers on a **later** day, the code credits the day they answer, not the day they played. This gives a phantom credit, and I reproduced it by running `src/logic/streaks.ts` directly (see CR-01).

The warnings cover:

- a streak that freezes for good after one session with a wrong clock;
- possible streak-slice loss or resurrection across tabs;
- a Day-streak toast that is lost when the player presses Play again quickly;
- the Fresh start dialog stacking over other dialogs and losing focus.

## Critical Issues

### CR-01: Deferred Day credit is applied to the answer day, not the day the game was played (phantom credit)

**File:** `src/logic/streaks.ts:75-77, 96-111, 134-168, 182-192`
**Issue:** `PendingRestore.creditDeferred` is a boolean. `withCredit(s, deferred, today)` credits whatever `today` is when the offer is answered or lapses. It does not credit the day the finishing game was played. A pending offer survives day changes (`check` keeps it while `eligible`), so the offer can be answered on a later day. Reproduced (lad `2026-10-01`, current 5, game finished `2026-10-05` and the offer was not answered that day):

```
decline on 2026-10-06 -> {"current":1,"lastActiveDate":"2026-10-06"}   // should be lad 2026-10-05
restore on 2026-10-06 -> {"current":6,"lastActiveDate":"2026-10-06"}   // should be lad 2026-10-05; Oct 6 not played
lapse   on 2026-10-10 -> effect 'broke', {"current":1,"lastActiveDate":"2026-10-10"}  // Oct 10 not played
```

In every case the player is credited for a day on which they finished no game:

- The chip shows "credited" (not dimmed).
- No game is needed that day.
- The next missed-day check then counts from the wrong date.

The real play day (Oct 5) is lost in the decline and lapse paths.

In `streaks.test.ts:~495-507` the deferred tests answer only on the same day, so this is not covered.
**Fix:** Store the play date instead of a boolean, and credit that date:

```ts
export type PendingRestore = { streak: number; missed: number; creditDate: string | null }

function withCredit(s: StreakSlice, creditDate: string | null) {
  return creditDate === null ? s : creditDay(s, creditDate).slice
}
// finishDay: pendingRestore: { ...pending, creditDate: pending.creditDate ?? today }
// restore(): lastActiveDate = prevDay(today); then credit only if creditDate === today
//            (an earlier creditDate is already covered by the restored gap)
// decline()/lapse: credit creditDate, then re-run check(slice, today) so a gap
//            after creditDate is still detected.
```

Bump `SAVE_VERSION` to 3 and add a migration that maps `creditDeferred: true` to a best-effort date, or to `null`. Update `validatePending`. Add tests where the offer is answered on D+1 and lapses on D+5.

## Warnings

### WR-01: A single session with a future clock freezes the Day Streak and Restores until that date

**File:** `src/logic/streaks.ts:33-42, 49-56`; `src/logic/save.ts:409-430`
**Issue:** `missedDays` clamps negatives to 0. `creditDay` refuses when `today <= lastActiveDate`, and `refill` is forward-only. If the device clock is ever ahead, a `lastActiveDate` and `restores.month` in the future are persisted. Possible causes: a manual change, a dead RTC, or a test with a time-travel extension. After the clock is fixed:

- no day is credited;
- no break is detected;
- Restores never refill;
- the chip stays dimmed.

This lasts until the real date catches up, which could be months.

`validateDayStreak`/`validateRestores` accept any future date. The code comments call this intentional ("clock moved backwards never lowers"), but the result is a permanently stuck streak with no recovery.
**Fix:** Add a sanity cap in `check()`. When `dayNumber(lad) > dayNumber(today) + 1` (more than a timezone hop in the future), treat `lad` as `today` (or `prevDay(today)`) and clamp `restores.month` to `monthOf(today)` when it is later. Bump `streakRev` and add tests for "clock was a year ahead, then corrected".

### WR-02: The streak slice has no reset floor and no read-before-write, so a stale tab can resurrect or overwrite it

**File:** `src/state/gameStore.ts:435-471, 559-588, 673`; `src/state/streakWatch.ts:32-41`
**Issue:**

- Phase 5 adds storage writes with no user action: `checkStreaks` runs on focus, visibilitychange and local midnight.
- Persist's `setItem` writes the whole in-memory document without reading storage first.
- Suppose a tab misses `storage` events, for example while frozen by the browser's tab freezing or energy saver. When it wakes on a new day, `checkStreaks` changes its slice and writes its stale document over the newer one.
- If the newer tab is closed, that tab's credits, Restores used and stats are lost.
- Also, after `resetAll` the slice gets `streakRev = old + 1` and has no floor. Boards and stats do have one (`resetFloor`). A stale tab that made one more streak change before the reset reached it has the same `streakRev`. `pickStreak` then breaks the tie with `JSON.stringify`, which can bring back the pre-reset Day Streak.

**Fix:**

- In `checkStreaks` (and before any streak write), re-read `localStorage` through `deps.storage.read(...)` and `applyExternal` it first, so the tab merges before it writes.
- Keep a `streakResetRev` floor next to `resetFloor`. On a reset, set `streakRev` to a value that dominates, for example `max(seen) + 1_000_000`, or ignore incoming streak slices with `streakRev <= streakResetRev`.

### WR-03: When two tabs change the streak at the same time, one change is silently lost

**File:** `src/logic/save.ts:330-333`; `src/state/gameStore.ts:311, 463, 481, 501`
**Issue:** Each tab bumps `state.streakRev + 1` from its own copy. If both tabs change the slice from the same revision, both get rev R+1 with different content, and `pickStreak` keeps the one with the smaller JSON. For example: tab A credits a finish while tab B accepts a Restore or runs the midnight `checkStreaks`. The other change is dropped. For instance, a used Restore can be rolled back, or a Restore can be applied while the finish credit is lost. Unlike stats, nothing re-applies the dropped intent.
**Fix:** Make the slice merge field-aware instead of picking one whole copy:

- `restores.used`: take the max within the same month.
- `lastActiveDate`: take the max.
- `current` and `longest`: use the copy with the later `lastActiveDate`.

At minimum, break ties on `(lastActiveDate, restores.used)` before the JSON compare, so a credit or a used Restore always wins over a no-op revision.

### WR-04: The Day-streak toast is lost if the player starts the next game within 1.86 s of a win

**File:** `src/state/gameStore.ts:951-977`
**Issue:**

- After a win, `dayToastDue` is cleared at once and the "Day streak: N" toast is scheduled `TOAST_LIFE_MS` later.
- The timer is guarded by `loadToken`.
- The Banner auto-focuses Play again, so pressing Enter at once is natural. That calls `startGame`, which bumps `loadToken` and drops the toast for good.
- `switchBoard` → `loadBoard` does the same.

The day's single Day Streak announcement (D-11) is then never shown or announced to screen readers.
**Fix:** Do not guard the queued toast with `loadToken`; keep a dedicated `pendingDayToast` id. Or keep `dayToastDue` set until it is shown, and have `startGame` show it instead of clearing it:

```ts
// in startGame's first set: replace `dayToastDue: null, toast: null` with
...(get().dayToastDue !== null
  ? { toast: { id: ++toastSeq, text: dayStreakToast(get().dayToastDue!), kind: 'info' }, dayToastDue: null }
  : { toast: null }),
```

### WR-05: The Fresh start notice can stack over another open dialog and lose focus when it closes

**File:** `src/state/gameStore.ts:466-469, 313-314`; `src/components/StreakBreakModal.tsx:18-25`
**Issue:**

- **Stacking.** A `prompt` effect clears `dialog` and `infoOpen`, but a `broke` effect does not. If `checkStreaks` runs from the focus or midnight watcher while Statistics, Settings or Reset confirm is open, `StreakBreakModal` calls `showModal()` on top of it, so two modal dialogs are in the top layer.
- **Lost focus.** On dismissal, the `Modal` focus-restore logic finds an opener inside a `dialog` (`o.closest('dialog')`). It falls back to `fallback.current`, which `StreakBreakModal` does not provide. Focus ends on `<body>` while the Statistics dialog is still open, which breaks keyboard-only play.
- **Same gap in two-tab sync.** `applyExternal` can adopt a slice with a new `pendingRestore` while `dialog === 'stats'`, so RestorePrompt stacks over Statistics in the same way.

**Fix:**

- Treat `broke` like `prompt`: `...(r.effect === 'broke' || r.effect === 'prompt' ? { dialog: null, infoOpen: false } : {})`. Do the same in `applyExternal` when the merged slice newly has `pendingRestore`.
- Give `StreakBreakModal` and `RestorePrompt` a `fallbackFocus` (e.g. the Stats button or the grid).

## Info

### IN-01: `PendingRestore.missed` is persisted but never read and goes stale

**File:** `src/logic/streaks.ts:96-99`, `src/logic/save.ts:57-61`
**Issue:** `missed` is set when the offer is made and is never updated as days pass (it stayed 3 when the actual gap was 4 in the CR-01 repro). No UI or logic reads it.
**Fix:** Remove it in the v3 migration needed for CR-01, or recompute it in `check`.

### IN-02: `pendingRestore` is validated without checking it against `dayStreak`

**File:** `src/logic/save.ts:432-445, 476`
**Issue:** A document with `pendingRestore` set but `dayStreak.lastActiveDate === null` gives `missed === 0`. `check` then keeps the pending offer, so the prompt appears. Accepting it spends a Restore to "restore" a streak of `current` (possibly 0). This can only come from a tampered or inconsistent save, but the validator is the defense.
**Fix:** In `validateSave`, drop `pendingRestore` when `dayStreak.lastActiveDate === null` or `dayStreak.current === 0`.

### IN-03: `DATE_RE` accepts dates that do not exist

**File:** `src/logic/save.ts:406`
**Issue:** `2026-02-31` passes, and `Date.UTC` silently rolls it over to March 3, which skews `missedDays`.
**Fix:** After the regex, round-trip the date: `new Date(Date.UTC(y, m-1, d)).toISOString().slice(0,10) === s`.

### IN-04: `validateBoardStats` does not check cross-field consistency

**File:** `src/logic/save.ts:345-356`
**Issue:** Only `wins > played` is rejected. `wins + gaveUp > played`, `sum(dist) !== wins` and `bestWinStreak < winStreak` are all accepted, and they produce impossible Statistics (for example a win % that does not match the distribution).
**Fix:** Add these checks and fall back to empty stats for that Board.

### IN-05: The "All" tab highlights an older win when the latest game was a loss

**File:** `src/logic/stats.ts:103-106`
**Issue:** The highlight takes the highest `seq` among the `last` entries **that are wins**. The per-length tab highlights nothing when the latest game was a loss, so the "latest win" label differs between tabs. Also, `seq` comes from `nextSeq`, which is per tab, so two tabs can produce the same `seq`.
**Fix:** Take the highest `seq` across all `last` entries, then highlight only if that entry is a win.

### IN-06: `restore()` falls back to a decline without telling the player

**File:** `src/logic/streaks.ts:141-143`, `src/state/gameStore.ts:473-492`
**Issue:** If no Restores are left at answer time, pressing **Restore** silently resets the Day Streak to 0. There is no toast and no break notice.
**Fix:** When `!r.applied`, set `breakNotice: true` or show a toast saying no Restores are left.

### IN-07: E2E negative assertions are vacuous or timing-based

**File:** `e2e/streaks.spec.ts:138-142`
**Issue:**

- `toHaveCount(0)` immediately after `winOnce` passes before any toast could appear.
- `waitForTimeout(3000)` is a fixed sleep under an installed clock, which is brittle.

**Fix:** Assert positively that the praise toast has been shown and then dismissed, or use `page.clock.runFor(TOAST_LIFE_MS * 2)`, then assert that the text is absent.

---

_Reviewed: 2026-10-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
