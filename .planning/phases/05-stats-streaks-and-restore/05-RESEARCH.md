# Phase 5: Stats, Streaks and Restore - Research

**Researched:** 2026-10-04
**Domain:** Pure state-machine logic (streaks/Restore), versioned localStorage migration v1 to v2, two-tab merge, React modal UI, date/TZ testing
**Confidence:** HIGH (codebase read in full for the touched seams; SPEC rules are exact; no new packages)

## Summary

This phase adds no dependencies. Everything is built from the existing stack: Zustand 5 store with a custom `PersistStorage`, the pure-logic folder pattern (`src/logic/*` with injected inputs), the shared native `<dialog>` `Modal`, and Vitest/Playwright. The hard part is not UI: it is (1) a pure `(state, event, today) -> state` Restore reducer whose table-driven tests are the QA-02 deliverable, (2) a v1 to v2 save migration that fits the existing `loadSave`/`MIGRATIONS` chain, (3) making the finish seam idempotent and the new slices merge-safe across two tabs, and (4) five places where the existing code or the approved UI spec collides with the new feature (see "Conflicts and traps").

The SPEC (sections 7, 8, 9) already defines every rule and the 44-row edge-case table; the planner should treat EC-01..EC-44 as the test list, not invent cases. Date maths must use injected `YYYY-MM-DD` strings and `Date.UTC` part differences; the only place a `Date` is read is a small edge function. Verified in this environment: Node 24 honours runtime `process.env.TZ` changes inside a Vitest worker, so the TZ matrix can run in plain `vitest run` on Windows and Linux CI with no extra tooling.

**Primary recommendation:** Build `src/logic/streaks.ts` (pure reducer + `daysBetween`/`monthOf`/`prevDay`), `src/logic/stats.ts` (zero-safe derive), bump `SAVE_VERSION` to 2 with a `MIGRATIONS[1]` step adding zeroed slices, keep prompt state as persisted `pendingRestore` (not a `dialog` value), count finishes inside the store behind a per-Board `(id, answer)` ledger, and merge the streak slice with a persisted `rev` counter.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Already locked elsewhere and not re-decided here:
- **SPEC.md section 7 (R-WIN-1..3, R-DAY-1..4):** Win Streak is per Board. Day Streak goes up at most once per local day, on any finish: win, loss, Give Up or Forfeit. The missed-day formula is `missed = max(0, days(today) - days(lastActiveDate) - 1)`, with days taken from UTC parts.
- **SPEC.md section 8:** The Restore state machine `(state, event, today) -> state`, events E1-E5, and R-RESTORE-1..13. The persisted names: `dayStreak { current, longest, lastActiveDate }`, `restores { month, used }`, `pendingRestore`, and per-Board `winStreak`. The edge-case table EC-01..EC-44; unit tests cite these IDs in their titles. The prompt text in R-RESTORE-13 is locked: `Your {streak}-day streak broke. Restore it? ({restoresLeft} left this month)`.
- **SPEC.md section 8 open questions 1-3 keep their stated defaults.** Owner confirmed open question 1 (EC-40): record the Board result now, defer the Day Streak credit until the prompt is answered, then apply +1.
- **SPEC.md section 9 (R-STAT-1..5):** stats fields, separate stats per Mode, the All tab without Win Streaks, global Day Streak and Restores, and no NaN.
- **Phase 4 decisions:** D-06 dialogs use the shared `Modal`, header buttons go in `.header-actions`. Phase 3 D-14: the stats button counts toward UI-05. Phase 4 D-09: a reset behaves like a first visit; it now also clears streaks, Restores and stats (R-RESTORE-11).

- **D-01:** Stats modal: **Normal | Wordubado segmented toggle** on top, **4 / 5 / 6 / All tabs** below. One mode at a time. Headline row: Played, Win %, Current Win Streak, Best Win Streak (All tab omits streak cells). Below: guess distribution chart and "Avg guesses". Bottom: global footer "Day streak N · Best M" and "Restores left: N/3".
- **D-02:** Stats **opens on the current Board** (active mode and length tab).
- **D-03:** The All tab's guess distribution is **one combined chart with rows 1-7**: wins from all lengths added together. Only 6-letter games can fill row 7.
- **D-04:** The distribution **highlights the bar for the most recent finished game on that Board when it was a win**. Nothing after a loss. On the All tab, highlight the row of the latest win in that mode, or nothing (Claude's discretion).
- **D-05:** **Empty state:** numbers show 0, Win % and Avg guesses show "—" (never 0%, NaN or Infinity), the chart area shows a short friendly line ("No wins yet. Go play one!").
- **D-06:** **Stats button** is a bar-chart icon button in `.header-actions`, **left of the Settings gear**, styled like `SettingsButton`.
- **D-07:** **"Gave up: N"** on each tab including All. It **combines Give Ups and Forfeits** (a Forfeit is already saved as a gave-up snapshot). Both still count as played games and losses. The distribution and average include wins only.
- **D-08:** A **Day Streak chip in the header** (sun/flame icon with count) appears **only when Day Streak > 0**. Must fit the 320 px two-row header (`e2e/layout.spec.ts`).
- **D-09:** The chip is a **button that opens Stats**; accessible name like "Day streak 5, open statistics".
- **D-10:** The chip is **dimmed or muted until a game has been finished today** (`lastActiveDate !== today`), then full strength.
- **D-11:** A **toast when the Day Streak goes up** (first finished game of the day), e.g. "Day streak: 6". Win Streak changes get no toast.
- **D-12:** The result **banner gets one small Win Streak line** ("Win streak: 4" after a win, a short reset line after loss/Give Up/Forfeit).
- **D-13:** Blocking Restore prompt uses the locked R-RESTORE-13 text **only**, buttons **"Restore"** (primary) and **"No"**.
- **D-14:** Per R-RESTORE-12 the prompt cannot be dismissed: Esc and backdrop do nothing. `Modal` needs a non-dismissable option. **The game loads normally behind the dimmed backdrop**, input blocked.
- **D-15:** After **Restore**, toast "Streak restored. N left this month." (N after use).
- **D-16:** A **"streak ended" modal** appears **only when a Day Streak above 0 is lost without the player choosing it**: more than 4 missed days; no Restores left; the auto-decline when the gap grew while pending (EC-12). Short copy, no reason, one OK button, dismissable (OK/Esc/backdrop), **shows once per break, not again after a refresh** (needs a small persisted marker "or an equivalent"). Choosing "No" does **not** show it.
- **D-17:** **Losing only Win Streaks** is **silent**.
- **D-18:** **v1 to v2 migration starts all streaks and stats at zero.** Existing Boards, `last`, `wordubadoInfoSeen` kept unchanged. Finished v1 games are not backfilled.
- **D-19:** Stats are **running counters per Board**, not a game history: played, wins, gave-up count, distribution, current/best Win Streak, and the last result for the D-04 highlight. The All tab is summed from the three Boards of a mode.
- **D-20:** **Phase 4 WR-02**: `onGameFinished` can fire twice for one game across two tabs. It **must be made idempotent by `(boardKey, gameId)`** before stats/streaks are wired to it. Add a two-tab test where both tabs finish the same game before the sync arrives. Streak/stats fields need a sane two-tab merge rule (discretion; must never double-count).

### Claude's Discretion
- Exact v2 schema field names and placement (per-Board `stats` vs top-level `stats` map), the shape of the "break modal shown" marker, and the migration function. Follow SPEC section 8 names and the existing `MIGRATIONS` chain in `src/logic/save.ts`.
- How the Restore state machine is split: pure `logic/streaks.ts` with injected `today`, plus store actions. CHECK wiring on open, `visibilitychange`/focus and date change uses a StrictMode-safe effect with cleanup; date-change detection could be a check on focus plus a timer to the next local midnight.
- Two-tab merge for streak/Restore/stats state, including closing the prompt in other tabs when answered in one.
- How the pending prompt interacts with an in-progress reveal or other dialogs (the prompt wins).
- Whether to also address WR-03 (skip invalid Boards) and IN-01 (dead `migrate`) while adding the v2 migration; only if cheap.
- Icon choice, dimmed styling, bar-chart icon, exact copy for toasts, empty state and break modal (these are now fixed in 05-UI-SPEC.md).
- The All-tab highlight rule (D-04).
- Coverage of QA-02: table-driven EC-01..EC-44 tests including the TZ matrix via `process.env.TZ` or injected date parts; stats maths with zero games; checks that existing scoring, 75/25, forfeit and storage tests are complete; the migration v1 to v2.

### Deferred Ideas (OUT OF SCOPE)
None. The full result screen, definitions, Share (Phase 6) and themes / how-to-play (Phase 7) are out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STRK-01 | Per-Board Win Streak +1 win, reset on loss/Give Up/Forfeit | `stats[key].winStreak` updated in finish path; R-RESTORE-9; EC-36 |
| STRK-02 | One global Day Streak, +1 once per local day on any finish | `creditDay` (R-RESTORE-8) inside FINISH; EC-14, 17, 32-35, 39, 41 |
| STRK-03 | DST-safe missed days from local dates; clock-backwards = 0, never overwrite lastActiveDate | `daysBetween` via `Date.UTC` parts; `localDateKey` edge fn; EC-24..31 |
| STRK-04 | Missed-day check on open, focus, date change; idempotent | `checkStreaks(today)` + watcher module (visibilitychange/focus + midnight timer); EC-09..12 |
| STRK-05 | Missed day resets all Win Streaks; Restore never revives | CHECK resets all six `winStreak`; EC-37, 38 |
| STRK-06 | Blocking prompt if streak>0, missed<=4, Restore left; else reset silently | eligibility in reducer; `pendingRestore` drives non-dismissable Modal; EC-03..07, 43 |
| STRK-07 | Restore = 1 use, keep number, LAD=yesterday; No resets; refresh re-shows | persisted `pendingRestore`; EC-11, 13, 16, 18, 19, 42 |
| STRK-08 | 3 Restores/month, refill on the 1st before any offer, no carry over, counted in month of use | refill-forward-only at start of CHECK/RESTORE/FINISH; EC-20..23, 31, 44 |
| STAT-01 | Played, win rate, current/longest Win Streak, distribution, avg guesses (wins only) | `BoardStats` counters + `deriveStats` |
| STAT-02 | 4/5/6/All tabs, separate per Mode, All has no Win Streak | `deriveStats(stats, mode, tab)` sums three Boards for All |
| STAT-03 | Day Streak current/longest and "Restores left: N/3" global | footer reads `dayStreak`, `restoresLeft(restores, today)` |
| STAT-04 | Zero games without errors | `deriveStats` returns `null` for win%/avg when divisor 0 |
| QA-02 | Unit tests: scoring, 75/25, streak/Restore table (DST, month, backwards), forfeit, storage (round-trip, migration, corrupt, throwing) | Table-driven tests; existing scoring/pickAnswer/forfeit/storage tests already exist, audit and fill gaps (see Validation Architecture) |
</phase_requirements>

## Architectural Responsibility Map

Static SPA, localStorage only: all tiers collapse to the browser, so the useful split is by layer.

| Capability | Primary Layer | Secondary Layer | Rationale |
|------------|--------------|-----------------|-----------|
| Missed-day maths, Restore reducer, refill, credit | Pure logic (`src/logic/streaks.ts`) | - | R-DATE-3: `today` injected; trivially table-testable |
| Zero-safe stats derivation | Pure logic (`src/logic/stats.ts`) | - | R-STAT-5; derived, never stored |
| Reading the clock, local date string | Store edge deps (`deps.now`, `localDateKey`) | - | Only place `new Date()` is allowed |
| Finish idempotency, counters, streak writes | Zustand store (`finishGame` internal) | Pure logic | CLAUDE.md: do finishes in store actions, not effects (StrictMode) |
| Persist, version, migrate, validate | `src/logic/save.ts` + `storage.ts` | Zustand `persist` | Existing `loadSave` runs the migration chain |
| Two-tab merge of new slices | `save.ts` pure merge fns + `applyExternal` | - | Same pattern as `mergeBoards` |
| CHECK triggers (open, focus, midnight) | Module like `sync.ts` started from `main.tsx` | - | Outside React so StrictMode cannot double-register |
| Prompt / break / Stats UI | React components + shared `Modal` | CSS | UI-SPEC 05 |

## Standard Stack

No new packages. Everything below is already in `package.json` and pinned by CLAUDE.md.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.15 (persist middleware, custom `PersistStorage`) | Store + persistence already built | Already the Phase 4 save path |
| React | ^19.2.8 | UI | Existing |
| Vitest | ^5.0.3 | Unit tests; `vi.useFakeTimers` + `vi.setSystemTime` | Existing; CLAUDE.md mandates |
| @playwright/test | ^1.63.0 | E2E; `page.clock` API for date control | Existing |
| jsdom | ^30.1.1 | Component tests | Existing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written date maths | date-fns/dayjs | CLAUDE.md forbids; `Date.UTC` parts are 5 lines |
| `rev` counter merge | Semantic field-by-field merge | Semantic merge of decline/restore/credit across tabs is ambiguous; `rev` is one rule |
| zod validation | Hand-written guard | CLAUDE.md: zod not necessary; extend `validateSave` style |

**Installation:** none. **Package Legitimacy Audit:** no external packages are installed in this phase, so slopcheck is not applicable. Packages removed: none. Packages flagged: none.

## Architecture Patterns

### System Architecture Diagram

```
 triggers                          store (single owner of the clock)                 persisted doc (v2)
 --------                          ---------------------------------                 ------------------
 main.tsx boot ------------------> checkStreaks()  --+
 visibilitychange / focus -------> checkStreaks()    |   today = localDateKey(deps.now())
 midnight timer (re-armed) ------> checkStreaks()    |        |
 submit()/giveUp()/forfeit() ----> finishGame() -----+--> [idempotency ledger (id,answer) per Board]
                                                     |        | already counted? -> stop
                                                     |        v
                                                     |   streaks.reduce(state, CHECK(today))   (pure)
                                                     |        | missed>=1: all winStreak=0; maybe PENDING
                                                     |        v
                                                     |   record Board result (stats counters, winStreak)
                                                     |        v
                                                     |   PENDING? --yes--> credit deferred (flag in pendingRestore)
                                                     |        | no
                                                     |        v
                                                     |   creditDay(today)  -> toast "Day streak: n" at reveal end
 Restore / No buttons -----------> restore()/declineRestore() -> reduce(RESTORE|DECLINE) -> apply deferred credit
                                                     |
 storage event (other tab) ------> applyExternal() -> mergeBoards + mergeStats + mergeStreakSlice(rev)
                                                     v
 persist(partialize=docFromState) ---------------> localStorage "unlimited-wordle" {version:2, state}

 UI reads: pendingRestore (prompt, non-dismissable), breakNotice (transient), stats, dayStreak, restores
```

### Recommended Project Structure
```
src/logic/streaks.ts        # types, daysBetween, monthOf, prevDay, restoresLeft, reduce(), creditDay()
src/logic/streaks.test.ts   # EC-01..EC-44 table
src/logic/stats.ts          # BoardStats, emptyBoardStats, recordResult, deriveStats (zero-safe)
src/logic/stats.test.ts
src/logic/save.ts           # SAVE_VERSION=2, MIGRATIONS[1], validate/merge for new slices
src/state/clock.ts          # localDateKey(Date), msUntilNextLocalMidnight(Date)  (the only Date readers)
src/state/streakWatch.ts    # startStreakWatch(store, ...) like sync.ts; idempotent guard
src/components/StatsModal.tsx, StatsButton.tsx, StreakChip.tsx, RestorePrompt.tsx, StreakBreakModal.tsx
```

### Pattern 1: Pure reducer with injected `today`
**What:** One exported `reduce(state, event, today)` returning `{ state, effect }` where `effect` is `'none' | 'prompt' | 'broke'` (`'broke'` = involuntary loss of a streak above 0, drives the streak-ended modal) and `state` is the streak slice `{ dayStreak, restores, pendingRestore, winStreakReset: boolean }`. Win Streak zeroing is a flag the store applies to the stats map, keeping the reducer ignorant of Boards (or pass the six streak numbers in; either works, the flag is simpler to test).
**When to use:** all of E1-E5. No `Date` anywhere in the file.
```typescript
// Source: SPEC.md sections 7-8 (R-DATE-2, R-DAY-3, R-RESTORE-1/8)
export function dayNumber(d: string): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day) / 86_400_000
}
export const monthOf = (d: string) => d.slice(0, 7)
export function missedDays(lad: string | null, today: string): number {
  if (lad === null) return 0
  return Math.max(0, dayNumber(today) - dayNumber(lad) - 1)
}
export function prevDay(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day - 1)).toISOString().slice(0, 10)
}
// refill is forward-only (R-RESTORE-1); string compare of 'YYYY-MM' orders correctly
export const refill = (r: Restores, today: string): Restores =>
  monthOf(today) > r.month ? { month: monthOf(today), used: 0 } : r
export const restoresLeft = (r: Restores): number => Math.min(3, Math.max(0, 3 - r.used))
```
`restoresLeft` must be called on the refilled value ("evaluated after the monthly refill"). Chip/footers that display it without running the reducer must call `refill` first so the footer shows "3/3" on the 1st before any event ran.

### Pattern 2: Edge date function and midnight timer isolated in one file
```typescript
// src/state/clock.ts  (only file allowed to call new Date())
export function localDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function msUntilNextLocalMidnight(now: Date): number {
  // constructing from local fields is DST-correct (23/25 h days)
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return Math.max(1000, next.getTime() - now.getTime() + 50)
}
```
Watcher (mirrors `startTabSync`): module-level `started` guard, one `visibilitychange` listener (check only when `document.visibilityState === 'visible'`), one `focus` listener, one midnight `setTimeout` that re-arms itself and also re-arms after every visible/focus event (browsers throttle/suspend background timers, sleeping laptops skip them). Started from `main.tsx` next to `startTabSync` (outside React, StrictMode-safe, the pattern already used for `resume()`).

### Pattern 3: Prompt state is persisted state, not `dialog`
`loadBoard`, `startGame`, `switchBoard`, `applyExternal` all do `dialog: null` or `closeConfirms(...)`. If the Restore prompt were `dialog: 'restore'` it would be wiped by any board load (including the initial `resume()` that runs right after boot CHECK). Make it derived: `restorePromptOpen = pendingRestore !== null`; extend `isInputBlocked` to `s.dialog !== null || s.infoOpen || s.pendingRestore !== null`. This also gives R-RESTORE-12, "prompt shows again after refresh" (EC-11), and "closes silently in the other tab" for free, because the merged `pendingRestore` becomes null. `openSettings`/`openDialog`/`openStats` must refuse while pending (they already refuse when `dialog !== null || infoOpen`; add the pending check), and the Wordubado popup must be deferred (`autoOpenInfo` sets `infoOpen`; skip while pending and re-trigger on answer, or simply render the popup only when no prompt is pending).

### Pattern 4: Streak-ended modal needs no persisted marker
D-16 allows "a small persisted marker or an equivalent". Equivalent: make the reducer's `effect === 'broke'` set a transient store field `breakNotice: true`. A refresh cannot show it again because the persisted state already has `current = 0` and CHECK is idempotent (EC-10). Trade-off: if the player refreshes before pressing OK the notice is lost; acceptable ("once per break"). Two tabs running CHECK in the same instant may both show it; acceptable. Do not add a persisted field.

### Pattern 5: Idempotent finish by `(boardKey, gameId)` (D-20 / WR-02)
Per-Board persisted ledger `lastCounted: { id: number, answer: string } | null` inside `BoardStats`. `finishGame(key, outcome, guesses)` reads `id = get().gameId` and `answer`, and returns early if `lastCounted` equals `{id, answer}`. Compare by equality, not `>`: ids are per-tab Lamport counters and can be lower after a reset or fresh tab (Phase 4 WR-05), so a `>` test could silently drop a real finish. Because `lastCounted` is persisted and merged, a tab that merges the other tab's doc before finishing skips the count. For the narrow true race (both tabs submit before either sync arrives) both count locally; the merge then picks ONE copy of the per-Board stats (never sums), so the result is `played = n+1`, not `n+2`.

### Pattern 6: Two-tab merge rules (must never double-count)
- **Per-Board stats:** keep the copy with the higher `played`; on a tie keep the one with the lexicographically smaller `JSON.stringify` (total order, so `merge(a,b) === merge(b,a)` like `pickGame`). Document the accepted loss: two tabs finishing DIFFERENT games on the same Board concurrently lose one count.
- **Streak slice (`dayStreak`, `restores`, `pendingRestore`):** add a persisted integer `streakRev`, incremented by every reducer transition that changes the slice and by every credit. Higher `streakRev` wins; tie breaks by `JSON.stringify` order. This resolves "Restore answered in tab A while tab B still shows the prompt": A's rev is higher, B adopts null `pendingRestore`, prompt closes silently (UI-SPEC two-tab rule).
- **Reset:** `resetAll` zeroes all three, as today for boards. A reset in A removes the key, so B receives `raw === null` and resets itself.
- Keep `applyExternal` behaviour: no toast for streak/stats-only changes; the existing "Updated from your other tab" toast only fires when the visible Board changed. Add `changedForMe`/`behindThem` comparisons for the new slices or the "no ping-pong" early return will skip writing back.

### Anti-Patterns to Avoid
- **Crediting inside a React effect.** StrictMode double-invokes effects (CLAUDE.md). All credits happen in store actions.
- **`(now - then) / 86400000` on local timestamps** (R-DATE-2). Use `dayNumber` differences only.
- **Storing a derived value** (`restoresLeft`, `missed`, win rate, average): never persisted.
- **Calling `new Date()` in `src/logic/**`.** Add an ESLint `no-restricted-globals`/`no-restricted-syntax` rule for `new Date()` scoped to `src/logic/**` if cheap (optional).
- **Summing stats across tabs on merge.** Pick one copy.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persist + version | A second persistence layer | Existing `createSaveStorage` + `loadSave` + `MIGRATIONS` | The chain, corrupt backup, read-only 'newer' guard already exist |
| Dialog focus trap, backdrop, focus return | New dialog component | `Modal` plus a `dismissible` prop | Native `<dialog>` + existing trap; only Esc/backdrop/close need a switch |
| Toast display | New toast system | Existing `toast` store field and `Toast` | One-at-a-time rule already built |
| Calendar maths | A Date library | `Date.UTC` day numbers | Required by R-DATE-2 and CLAUDE.md |
| TZ testing harness | A CI matrix of `TZ=` env jobs | `process.env.TZ` set in the test (verified working) | See Validation Architecture |
| Clock in Playwright | Test-only hooks in app | `page.clock.install` / `setFixedTime` / `fastForward` | Built into Playwright 1.63 |

**Key insight:** every hard rule here is a pure function of strings, so the risk is wiring (trigger points, persistence, merge), not logic. Spend test effort on wiring.

## Common Pitfalls

### Pitfall 1: `finishGame` fires at submit, but UI-SPEC says "when the reveal completes"
**What goes wrong:** `submit()` calls `finishGame` immediately (before the tile flip), and `giveUp`/`forfeitNewGame` call it directly. UI-SPEC 05 line 251 states "the finish is recorded when the reveal completes, as today's `onGameFinished`", which is not how the code behaves.
**Why it matters:** if recording moved to `finishReveal`, a refresh mid-reveal reloads a finished game (the saved doc already holds `outcome: won/lost` via `viewToSaved`) whose count was never recorded: a lost count and a lost streak step. If recording stays at submit, a Stats modal opened during the ~1.7 s reveal shows a win/win-rate before the tiles flip (spoiler, and a half-revealed result).
**How to avoid (recommended):** keep recording at submit (atomic with the persisted outcome, no lost counts). Make `openStats` a no-op while `status === 'revealing'` and disable the header Stats button and chip while revealing (like ModeSwitch/LengthPicker `busy`). Fire the Day Streak toast and set the banner streak data at `finishReveal`, not at submit. This deviates from UI-SPEC "Enabled while `revealing`"; flag to the planner/owner (see Open Questions).

### Pitfall 2: A winning finish already shows a PRAISE toast; Day Streak toast would replace it
`finishReveal` sets the praise toast; Toast is one-at-a-time and a newer toast replaces an older one. The Day Streak toast fires on the same moment on the first win of the day. Decide explicitly: recommended is to show the Day Streak toast after the praise lifetime (single queued slot) or only when it is not a win. See Open Questions.

### Pitfall 3: Boot ordering
`useGameStore.getState().resume()` then `startTabSync` run in `main.tsx`. Persist with a synchronous storage hydrates during `create`, so `pendingRestore` is available at first render. Run the boot `checkStreaks()` once in `main.tsx` after hydration. `loadBoard` clears `dialog`, which is why the prompt must not live in `dialog` (Pattern 3).

### Pitfall 4: Migration plumbing is easy to get wrong
- `MIGRATIONS` is `{}` today and `migrateSave` loops `for v = from; v < to`. Add `MIGRATIONS[1] = (s) => ({ ...s, stats: zeroStats(), dayStreak: {current:0,longest:0,lastActiveDate:null}, restores: {month: <?>, used:0}, pendingRestore: null, streakRev: 0 })`.
- The migration step must be a pure function with no clock. `restores.month` for a v1 migration has no `today`. Use `month: ''` (sorts before any real month, so the first CHECK/FINISH refills to the current month with `used = 0`); make `validateSave` accept `''` or a `YYYY-MM` string. Likewise a fresh `emptySave()` uses `''` and `RESET_ALL` sets the real month (R-RESTORE-11).
- `storage.getItem` returns `version: SAVE_VERSION` always, so Zustand's `persist.migrate` never runs (Phase 4 IN-01). Change `migrate` to throw with a comment pointing at `loadSave`, so nobody relies on it.
- Bump `version` constant everywhere tests assert `SAVE_VERSION`/`version: 1` (grep `version: 1`, `SAVE_VERSION` in `save.test.ts`, `storage.test.ts`, `twoTabs.test.ts`, e2e `storage.spec.ts`/`persistence.spec.ts`). A v1 build opening a v2 doc enters read-only 'newer' mode (CR-01): expected behaviour for rollbacks.
- `validateSave` currently rejects any unknown top-level shape only through its destructure; it silently drops extra keys. Extend it to validate and RETURN the new slices, and add them to `emptySave`, `docFromState`, `mergeDocIntoState`, and the `resetAll`/`applyExternal(null)` clears. Missing any one of these four drops the slice on write-back.
- Validation policy (recommended, covers WR-03 for the new data): a malformed `stats`/`dayStreak`/`restores` slice falls back to its default and the boards are kept; SPEC EC-44 (`used = 7`) is then handled by clamping in `restoresLeft` AND by sanitising on load (`used` outside 0..3 becomes the default). Cap numeric counters (for example `<= 1e9`) to avoid unsafe-integer growth like IN-07.

### Pitfall 5: `Modal` non-dismissable mode
Native `<dialog>` can close on Esc even if `cancel` is `preventDefault`ed (Chrome's close-watcher behaviour: a second Esc without intervening user activation may close the dialog without a cancelable event). The existing `onClose` handler already treats "native close while `open` is still true" as the browser closing it. For `dismissible={false}`: `onCancel` only `preventDefault()`; backdrop click does nothing; native `close` while `openRef.current` is true calls `ref.current.showModal()` again instead of `onClose`. [CITED: HTML spec close watchers; behaviour MEDIUM, verify in Playwright with two Esc presses]. The Tab focus trap already covers the two buttons. Add `Modal.test.tsx` cases (stubDialog already exists).

### Pitfall 6: Reduced-motion / timers with fake clocks in Playwright
`page.clock.install()` overrides `setTimeout`, `Date`, `requestAnimationFrame`; time then flows naturally unless paused, so reveal timers still fire. Call `install` before `goto`, and use `setFixedTime` for most date cases, `fastForward` to cross midnight. Seed saves with `addInitScript` writing the v2 envelope to `localStorage` before the page loads. Existing helper `fixAnswers` uses the same `addInitScript` pattern.

### Pitfall 7: Header at 320 px
UI-SPEC changes the header below 400 px (title left-aligned, actions in flow, 36 px buttons). The Phase 4 `e2e/layout.spec.ts` assertions (centred title, absolute-positioned actions, 40/44 px targets) will fail and must be updated in the same plan that changes the CSS. Add the new overflow/overlap checks for Day Streak 12 and 123 at 320x500/568/640 (UI-SPEC).

### Pitfall 8: Existing tests that pin the seam signature
`gameStore.test.ts` asserts `onGameFinished` toHaveBeenCalledWith('normal-5','gave-up') and call counts. Keep `deps.onGameFinished(key, outcome)` as a notification hook that fires once AFTER the idempotency check (so counts stay valid and add a duplicate-id test), and do the new streak/stats work inside the store's own `finishGame`. Do not change its arguments.

### Pitfall 9: `forfeit` with credit and `startGame`
`forfeitNewGame` calls `finishGame` before the board snapshot `set`, using `get().gameId`/`answer`. The ledger `(id, answer)` must be read in that same call. Forfeit counts as gave-up (stats `gaveUp += 1`, `played += 1`, `winStreak = 0`); the seam's outcome value `'forfeit'` and `'gave-up'` map to the same counter.

## Code Examples

### Reducer sketch (R-RESTORE-1..9)
```typescript
// Source: SPEC.md section 8
export function check(s: StreakSlice, today: string): { s: StreakSlice; effect: Effect } {
  const restores = refill(s.restores, today)
  let next = { ...s, restores }
  const missed = missedDays(s.dayStreak.lastActiveDate, today)
  if (missed === 0) return { s: next, effect: 'none' }          // R-RESTORE-2 (null LAD, same day, yesterday, clock backwards)
  const eligible = (cur: number) => cur > 0 && missed <= 4 && restoresLeft(restores) > 0
  if (s.pendingRestore) {                                         // R-RESTORE-3
    if (eligible(s.dayStreak.current)) return { s: next, effect: 'none' }
    return declined(next, 'broke')                                // auto-decline -> break modal (D-16)
  }
  next = { ...next, resetWinStreaks: true }                       // R-RESTORE-4
  if (eligible(s.dayStreak.current)) {
    return { s: { ...next, pendingRestore: { streak: s.dayStreak.current, missed, creditDeferred: false } }, effect: 'prompt' }
  }
  return { s: { ...next, dayStreak: { ...s.dayStreak, current: 0 } }, effect: s.dayStreak.current > 0 ? 'broke' : 'none' }
}
```
Notes: `pendingRestore.streak` is the pre-break streak; EC-43 prompt text uses `restoresLeft` computed BEFORE the Restore is used (SPEC open question 2). The deferred-credit flag lives inside `pendingRestore` (extra persisted field) so a refresh while pending does not lose the EC-40 credit; on `RESTORE`/`DECLINE`/auto-decline apply `creditDay(today)` when `creditDeferred` is true.

### Zero-safe stats derivation (R-STAT-5)
```typescript
// Source: SPEC.md section 9
export type StatsView = { played: number; winPct: number | null; avgGuesses: number | null; gaveUp: number; dist: number[]; ... }
const winPct = played === 0 ? null : Math.round((wins / played) * 100)
const avg = wins === 0 ? null : sumGuesses / wins   // sumGuesses = sum(i * dist[i-1])
```
The component renders `null` as "—". Fixed row counts: 4-letter 5, 5-letter 6, 6-letter 7, All 7 (pad shorter arrays with 0 before summing).

### Table-driven test with TZ matrix (verified approach)
```typescript
// Verified in this repo: Node 24 + Vitest 5 pick up runtime process.env.TZ changes.
import { describe, it, expect, vi, afterEach } from 'vitest'
const ZONES = ['UTC', 'America/Los_Angeles', 'Pacific/Auckland', 'Asia/Kolkata']
describe.each(ZONES)('EC-28 TZ %s', (tz) => {
  const prev = process.env.TZ
  afterEach(() => { vi.useRealTimers(); process.env.TZ = prev })
  it('same missed-day results as UTC', () => {
    process.env.TZ = tz
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 5, 3, 0, 30)) // local 00:30
    expect(localDateKey(new Date())).toBe('2026-06-03')
    expect(missedDays('2026-06-01', '2026-06-03')).toBe(1)
  })
})
```
Pure `check`/`missedDays` take strings so they are TZ-independent by construction; the matrix exists to prove that (EC-26..28) and to exercise `localDateKey` + `msUntilNextLocalMidnight` across DST (2026-03-08 and 2026-11-01 in `America/Los_Angeles`: 23 h and 25 h days).

### Playwright date control
```typescript
// Source: https://playwright.dev/docs/clock
await page.clock.install({ time: new Date('2026-06-03T09:00:00') })   // before goto
await page.addInitScript((doc) => localStorage.setItem('unlimited-wordle', doc), v2SaveJson)
await page.goto('/')
await expect(page.getByRole('dialog', { name: 'Streak broke' })).toBeVisible()
await page.clock.fastForward('15:00:00')   // cross midnight; fires the re-armed timer
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Playwright tests faking `Date` via `addInitScript` | `page.clock` API (since 1.45, here 1.63) | Use it; no hand-rolled Date mocks |
| `TZ` env var in npm scripts for tz tests | Runtime `process.env.TZ` in the test (works in Node 13+ and verified here on Node 24.19, Windows) | No cross-platform env tooling |
| `persist.migrate` for migrations | Chain in `loadSave` (this repo) | Keep it there; make `migrate` throw |

**Deprecated/outdated:** the Phase 4 absolute-positioned header actions rule (UI-SPEC 05 replaces it).

## Runtime State Inventory

Not a rename/refactor phase, but it is a persisted-schema migration. Relevant items:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Real players' localStorage `unlimited-wordle` v1 envelopes | Data migration via `MIGRATIONS[1]` (zeros); boards untouched |
| Live service config | None (static site, no server) | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `:corrupt` backup key unaffected; e2e fixtures in `e2e/*.spec.ts` that seed v1 docs or assert `version: 1` | Update to v2 or add a v1-seed test for the migration |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Vitest, Vite | yes | 24.19.0 (.nvmrc 24) | - |
| Vitest | unit tests | yes | 5.0.3 | - |
| Playwright + Chromium | E2E, a11y, layout | yes (declared; per memory note, browser install here is via curl+unzip, not `npx playwright install`) | 1.63 | CI installs with `--with-deps` |
| Runtime TZ switching | TZ matrix | yes (verified with a throwaway Vitest file, removed) | - | Inject date strings only |

No missing blockers.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.3 (node env default; jsdom per-file for components) + Playwright 1.63 |
| Config file | `vite.config.ts` (`test.include: src/**/*.test.{ts,tsx}`), `playwright.config.ts` (projects chromium + Pixel 7 "mobile") |
| Quick run command | `npx vitest run src/logic src/state` |
| Full suite command | `npm run lint && npm run typecheck && npm test && npm run test:e2e` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRK-03 | missed-day maths, DST, leap, year end, clock backwards (EC-24..31) | unit table | `npx vitest run src/logic/streaks.test.ts` | Wave 0 |
| STRK-04/05/06/07/08 | CHECK/RESTORE/DECLINE/FINISH reducer, EC-01..23, 32..44 | unit table | same | Wave 0 |
| STRK-01/02 | Win Streak and Day Streak via store finish (win/loss/give-up/forfeit, once per day) | store unit | `npx vitest run src/state/gameStore.test.ts` | extend |
| STRK-04 (triggers) | focus/visibility/midnight watcher registers once, is idempotent, cleans up | unit with fake timers + stub target | `npx vitest run src/state/streakWatch.test.ts` | Wave 0 |
| STRK-06 | prompt blocks input, not dismissable, survives refresh, EC-11 | component + store | `npx vitest run src/components/RestorePrompt.test.tsx src/components/Modal.test.tsx` | Wave 0 / extend |
| STRK-07 (E2E) | prompt after missed day, Restore keeps number, No resets, reload re-shows | e2e with `page.clock` | `npx playwright test e2e/streaks.spec.ts` | Wave 0 |
| STAT-01..04 | derive, tabs, All sums rows 1-7, empty state "—" never NaN | unit + component | `npx vitest run src/logic/stats.test.ts src/components/StatsModal.test.tsx` | Wave 0 |
| D-18 | v1 doc migrates to v2 with zero stats, boards kept | unit | `npx vitest run src/logic/save.test.ts src/state/storage.test.ts` | extend |
| D-20 | idempotent finish; two tabs finish same game before sync; merge never double-counts | two-tab unit | `npx vitest run src/state/twoTabs.test.ts` | extend |
| UI/a11y | axe on Stats (each tab), Restore prompt, break modal, both modes; 320 px header with Day Streak 12/123 | e2e | `npx playwright test e2e/layout.spec.ts e2e/stats.spec.ts` | extend / Wave 0 |
| QA-02 completeness | scoring, 75/25 over 10,000 seeded draws, forfeit, storage already covered | audit | `npx vitest run src/logic/score.test.ts src/logic/pickAnswer.test.ts src/logic/save.test.ts src/state/storage.test.ts` | exist; confirm in plan |

### Sampling Rate
- **Per task commit:** `npx vitest run src/logic src/state` (fast, no browser)
- **Per wave merge:** `npm run lint && npm run typecheck && npm test`
- **Phase gate:** full suite incl. `npm run test:e2e`, plus `npm run build` and `npm run check:bundle`, green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/logic/streaks.test.ts`: EC-01..EC-44 as `it.each` rows whose titles start with the EC ID
- [ ] `src/logic/stats.test.ts`: zero games, losses-only, wins distribution, All sum, highlight rule
- [ ] `src/state/clock.test.ts`: `localDateKey`, `msUntilNextLocalMidnight` across the TZ matrix and both DST days
- [ ] `src/state/streakWatch.test.ts`
- [ ] `src/components/{StatsModal,RestorePrompt,StreakChip}.test.tsx`; extend `Modal.test.tsx` for `dismissible`
- [ ] `e2e/streaks.spec.ts`, `e2e/stats.spec.ts` (+ update `e2e/layout.spec.ts`)
- [ ] A shared factory for v2 save docs (extend `src/test/storageDoubles.ts`) so tests do not hand-write the envelope
- [ ] Optional: a lint guard against `new Date()`/`Date.now()` in `src/logic/**`

## Security Domain

`security_enforcement` is not set to false in `.planning/config.json`, so included. The surface is local only (no network, no auth).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | - |
| V3 Session Management | no | - |
| V4 Access Control | no | - |
| V5 Input Validation | yes | Hand-written `validateSave` guard for every new field (types, ranges, `YYYY-MM-DD`/`YYYY-MM` regexes, array lengths, counter caps) |
| V6 Cryptography | no | - |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hand-edited/corrupt save (negative or huge counters, `used = 7`, bad date strings, prototype keys such as `__proto__` in `stats`) | Tampering | Validate shape; reject non-Board keys with the existing `getOwnPropertyNames` pattern; clamp; fall back per slice |
| Cross-tab race double-count | Tampering (integrity) | `(id, answer)` ledger + pick-one merge |
| Rendering saved strings | Injection | React escapes; never `dangerouslySetInnerHTML`; numbers only in chart |
| Newer-build document overwritten | Tampering | Existing read-only 'newer' guard; the v2 bump relies on it |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Chrome can close a modal `<dialog>` on a second Esc without a cancelable `cancel` event, so the `close`-event reopen fallback is needed | Pitfall 5 | Low: the fallback is harmless if unneeded; verify with an e2e double-Esc test |
| A2 | `page.clock.install` leaves reveal `setTimeout`s running naturally (docs: "time flows naturally unless paused") | Pitfall 6 | Low-medium: if animations stall, use `fastForward`/`runFor` in specific tests |
| A3 | Owner accepts that the Stats opener is disabled while `revealing` (deviates from UI-SPEC "enabled while revealing") | Pitfall 1 | Medium: needs owner/planner decision |
| A4 | Owner accepts the transient (non-persisted) break-modal marker, so a refresh before OK drops it | Pattern 4 | Low: D-16 allows "an equivalent" |
| A5 | `restores.month = ''` sentinel for migrated/empty saves is acceptable (instead of needing a clock in migration) | Pitfall 4 | Low: internal detail |

## Open Questions

1. **Stats while revealing vs recording at submit (UI-SPEC says enabled and "recorded when the reveal completes", code records at submit).**
   - What we know: recording at submit is atomic with the persisted outcome; moving it risks a lost count on refresh mid-reveal.
   - What's unclear: whether the owner prefers the UI-SPEC wording or the safe behaviour.
   - Recommendation: record at submit, disable Stats opener during `revealing`, fire toast/banner data at `finishReveal`. Update UI-SPEC line 130/251.
2. **Day Streak toast vs PRAISE toast on the first win of the day** (one toast at a time, newer replaces older).
   - Recommendation: queue the Day Streak toast to appear after the praise toast's lifetime (one extra slot in the store), or skip the praise on that win. Needs a one-line decision; default to queueing.
3. **Header test churn:** the Phase 4 layout spec assumptions change with the UI-SPEC header. Confirm the plan owns updating `e2e/layout.spec.ts`.
4. **WR-03 / IN-01:** cheap to include with this migration (skip-bad-Board, `migrate` throws). Recommended yes; WR-05 (clock seeding after reset) only matters for `lastCounted` equality, which is why equality (not `>`) is recommended.

## Sources

### Primary (HIGH confidence)
- Repository code read this session: `src/logic/save.ts`, `src/state/gameStore.ts`, `storage.ts`, `sync.ts`, `src/components/Modal.tsx`, `Header.tsx`, `Banner.tsx`, `SettingsModal.tsx`, `src/App.tsx`, `src/main.tsx`, `copy.ts`, `e2e/helpers.ts`, `playwright.config.ts`, `vite.config.ts`, `.github/workflows/ci.yml`, `.planning/config.json`
- `SPEC.md` sections 5-9 (rules R-DATE, R-WIN, R-DAY, R-RESTORE, R-STAT, EC-01..EC-44)
- `04-REVIEW.md` (WR-02, WR-03, IN-01, WR-05) and `05-CONTEXT.md`, `05-UI-SPEC.md`
- Local experiment: Vitest 5.0.3 / Node 24.19 honours runtime `process.env.TZ` changes (throwaway test, removed)

### Secondary (MEDIUM confidence)
- https://playwright.dev/docs/clock (install, setFixedTime, fastForward, natural time flow)

### Tertiary (LOW confidence)
- Chrome close-watcher Esc behaviour (A1), from general knowledge, flagged for e2e verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (no new dependencies; versions from CLAUDE.md and package.json)
- Architecture: HIGH for logic/persistence/merge (read the code); MEDIUM for the `rev`/ledger merge choices (design recommendations, not external facts)
- Pitfalls: HIGH for codebase-derived ones (finish at submit, `loadBoard` clearing dialog, v1 envelope/test churn); MEDIUM for browser dialog behaviour

**Research date:** 2026-10-04
**Valid until:** 30 days (stable stack; only the repo changes it)
