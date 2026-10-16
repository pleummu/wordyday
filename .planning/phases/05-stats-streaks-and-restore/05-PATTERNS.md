# Phase 5: Stats, Streaks and Restore - Pattern Map

**Mapped:** 2026-10-04
**Files analyzed:** 27 (11 new source, 9 modified source, 7 test/e2e groups)
**Analogs found:** 27 / 27 (2 are partial: pure state-machine reducer and bar chart have no exact analog)

Line numbers refer to the files as read on 2026-10-04.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/logic/streaks.ts` (new) | utility (pure reducer) | transform | `src/logic/save.ts` (pure fns, `pickGame` total order) | role-match |
| `src/logic/stats.ts` (new) | utility (pure derive) | transform | `src/logic/save.ts` / `src/logic/keys.ts` | role-match |
| `src/logic/save.ts` (mod, v2) | model + migration | CRUD / file-I/O | itself (`MIGRATIONS`, `validateSave`, `mergeBoards`) | exact |
| `src/state/clock.ts` (new) | utility (edge) | request-response | `src/state/testHook.ts` / `storage.ts` `getLocalStorage` | partial |
| `src/state/streakWatch.ts` (new) | service (listener) | event-driven | `src/state/sync.ts` | exact |
| `src/state/gameStore.ts` (mod) | store | CRUD + event-driven | itself | exact |
| `src/state/copy.ts` (mod) | config (strings) | n/a | itself | exact |
| `src/main.tsx` (mod) | config (boot) | event-driven | itself (`startTabSync` line) | exact |
| `src/components/Modal.tsx` (mod, `dismissible`) | component | event-driven | itself | exact |
| `src/components/StatsButton.tsx` (new) | component | request-response | `src/components/SettingsButton.tsx` | exact |
| `src/components/StreakChip.tsx` (new) | component | request-response | `src/components/SettingsButton.tsx` | role-match |
| `src/components/StatsModal.tsx` (new) | component | request-response | `src/components/SettingsModal.tsx` + `LengthPicker.tsx` | role-match |
| `src/components/RestorePrompt.tsx` (new) | component | request-response | `src/components/SettingsModal.tsx` / `GiveUpConfirm.tsx` | role-match |
| `src/components/StreakBreakModal.tsx` (new) | component | request-response | `src/components/SettingsModal.tsx` | role-match |
| `src/components/Header.tsx` (mod) | component | request-response | itself | exact |
| `src/components/Banner.tsx` (mod, streak line) | component | request-response | itself | exact |
| `src/App.tsx` (mod, mounts) | component | request-response | itself | exact |
| `src/styles/game.css` (mod) | config (CSS) | n/a | `.settings-button`, `.length-picker`, `.modal-*` blocks | exact |
| `src/logic/streaks.test.ts` (new) | test | transform | `src/logic/save.test.ts` | role-match |
| `src/logic/stats.test.ts` (new) | test | transform | `src/logic/save.test.ts` | role-match |
| `src/logic/save.test.ts` (ext) | test | CRUD | itself (lines 23, 103-121) | exact |
| `src/state/clock.test.ts` (new) | test | transform | `src/state/sync.test.ts` | partial |
| `src/state/streakWatch.test.ts` (new) | test | event-driven | `src/state/sync.test.ts` | exact |
| `src/state/twoTabs.test.ts` (ext) | test | event-driven | itself (`makeTabs`) | exact |
| `src/state/gameStore.test.ts` (ext) | test | CRUD | itself (lines ~782-815) | exact |
| `src/components/Modal.test.tsx` (ext) + new component tests | test | request-response | `Modal.test.tsx`, `SettingsModal.test.tsx` | exact |
| `src/test/storageDoubles.ts` (ext, v2 doc factory) | test util | n/a | itself | exact |
| `e2e/streaks.spec.ts`, `e2e/stats.spec.ts` (new), `e2e/layout.spec.ts` (mod) | e2e test | request-response | existing `e2e/*.spec.ts`, `e2e/helpers.ts` (not re-read; per RESEARCH) | role-match |

## Pattern Assignments

### `src/logic/save.ts` (model, migration; modify)

**Analog:** itself. Everything below extends existing seams.

**Version + migration chain** (lines 3, 70-86). `MIGRATIONS` is `{}` today; add `1:` step. Keep it pure, no clock (RESEARCH Pitfall 4, `restores.month: ''` sentinel):
```typescript
export const SAVE_VERSION = 1            // -> 2
export const MIGRATIONS: Readonly<Record<number, (s: unknown) => unknown>> = {}
export function migrateSave(state, from, to = SAVE_VERSION, steps = MIGRATIONS): unknown {
  if (from < 1) throw new Error('unsupported save version ' + from)
  let s = state
  for (let v = from; v < to; v++) {
    const step = steps[v]
    if (!step) throw new Error('no migration from v' + v)
    s = step(s)
  }
  return s
}
```

**Doc shape + empty** (lines 34-48): the comment at 34-35 reserves the Phase 5 names. Extend `SaveDoc` and `emptySave()` with `stats`, `dayStreak`, `restores`, `pendingRestore`, `streakRev`, break marker only if chosen (RESEARCH Pattern 4 says transient, no persisted marker).
```typescript
export type SaveDoc = {
  boards: Partial<Record<BoardKey, SavedGame>>
  last: { mode: Mode; length: WordLength }
  wordubadoInfoSeen: boolean
}
```

**Validation pattern** (lines 88-144, 218-244). Hand-written guards: `isObject`, `has`, own-key check rejecting `__proto__` (lines 226-229), safe-integer checks (135-139). Copy the shape of `validateGame` for `validateBoardStats` / `validateDayStreak` / `validateRestores`:
```typescript
if (has(x, 'id')) {
  const id = x.id
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0) return null
  ...
}
// validateSave
for (const k of Object.getOwnPropertyNames(boards)) {
  if (!(BOARD_KEYS as readonly string[]).includes(k)) return null
}
const out: SaveDoc['boards'] = {}
for (const key of BOARD_KEYS) {
  if (!has(boards, key)) continue
  const game = validateGame(boards[key], length)
  if (!game) return null          // <- WR-03 (D-22): change to `continue` (skip the bad Board, keep the rest)
  out[key] = game
}
```
Policy: a malformed new slice falls back to its default; do not return `null` for it. Clamp `restores.used` to 0..3 on load (EC-44); cap counters (e.g. 1e9).

**Merge pattern** (lines 171-216): `pickGame` is a total order so `merge(a,b) === merge(b,a)`. Copy that discipline for `mergeStats` (higher `played`, tie -> smaller `JSON.stringify`) and `mergeStreakSlice` (higher `streakRev`, same tie-break):
```typescript
export function mergeBoards(mine, theirs, floor = -1) {
  const out: SaveDoc['boards'] = {}
  for (const key of BOARD_KEYS) {
    const merged = mergeBoard(mine[key], theirs[key], floor)
    if (merged) out[key] = merged
  }
  return out
}
```

**Load** (lines 250-271): `loadSave` already validates after `migrateSave`; the 'newer' guard (254-257) means v1 builds go read-only on a v2 doc. No change except via `validateSave`.

---

### `src/logic/streaks.ts` (utility, transform; new)

**Analog:** `src/logic/save.ts` for style (pure, exported small fns, injected inputs, no `Date`). No existing reducer. Use RESEARCH Pattern 1 and "Reducer sketch" verbatim as the starting point (`dayNumber`, `monthOf`, `missedDays`, `prevDay`, `refill`, `restoresLeft`, `check`). The pickGame comment style at save.ts:171-174 (document the total order) is the convention for documenting merge/tie rules.

**Constraint:** no `new Date()` / `Date.now()` in this file; only `Date.UTC(y, m-1, d)` on parsed parts (CLAUDE.md pitfalls).

---

### `src/logic/stats.ts` (utility, transform; new)

**Analog:** `src/logic/save.ts` (types + pure helpers) and `src/logic/boards.ts` (`BOARD_CONFIG` attempts per length for row counts: 4->5, 5->6, 6->7). Use RESEARCH "Zero-safe stats derivation": `winPct = played === 0 ? null : Math.round(wins/played*100)`, `avg = wins === 0 ? null : sumGuesses/wins`. Pad dist arrays with 0 to length 7 before summing for All.

---

### `src/state/streakWatch.ts` (service, event-driven; new)

**Analog:** `src/state/sync.ts` (full file, lines 1-33). Copy structure exactly: module-level `started`/`stop` guards, `Pick<StoreApi<GameState>, ...>` store type, injected `target`, returns an unsubscribe, second call is a no-op (StrictMode safe).
```typescript
let started = false
let stop: (() => void) | null = null
type SyncStore = Pick<StoreApi<GameState>, 'getState'>

export function startTabSync(
  store: SyncStore,
  target: Window = window,
  getArea: () => Storage | null = getLocalStorage,
  key: string = SAVE_KEY,
): () => void {
  if (started && stop) return stop
  const onStorage = (e: StorageEvent) => { ... store.getState().applyExternal(...) }
  target.addEventListener('storage', onStorage)
  started = true
  stop = () => {
    target.removeEventListener('storage', onStorage)
    started = false
    stop = null
  }
  return stop
}
```
Add: `visibilitychange` (check only when `document.visibilityState === 'visible'`), `focus`, and a self re-arming midnight `setTimeout`; all three call `store.getState().checkStreaks()`; stop clears the timer and removes all listeners.

---

### `src/state/clock.ts` (utility, edge; new)

**Analog:** partial. Follow the "injected edge dep" convention in `gameStore.ts` `defaultDeps` (lines 708-716: `rng: Math.random`, `setTimer`, `prefersReducedMotion`). Use RESEARCH Pattern 2 code for `localDateKey(d: Date)` and `msUntilNextLocalMidnight(now: Date)`. Add `now: () => Date` (default `() => new Date()`) to `GameDeps` so tests inject time; this file and `defaultDeps` are the only `new Date()` callers.

---

### `src/state/gameStore.ts` (store; modify)

**Analog:** itself.

**Deps seam** (lines 62-70): add `now?: () => Date`. Keep `onGameFinished(key, outcome)` signature unchanged (RESEARCH Pitfall 8); it fires once AFTER the idempotency check.
```typescript
export type GameDeps = {
  loadPools; rng; prefersReducedMotion; setTimer; storage
  // The single "finish game" seam; Phase 5 hangs streaks off it.
  onGameFinished?: (key: BoardKey, outcome: FinishedOutcome) => void
}
```

**Finish seam** (lines 185-187): `finishGame` is the single hook. Extend with: read `id = get().gameId`, `answer`; return if `stats[key].lastCounted` equals `{id, answer}` (D-20, equality not `>`); run `streaks.reduce(FINISH)`; update stats counters + winStreak; then `deps.onGameFinished?.(key, outcome)`. Call sites to keep: `submit()` line 639-641 (recorded at submit, D-21), `giveUp()` lines 472-478, `forfeitNewGame()` lines 480-504 (calls `finishGame` BEFORE the snapshot `set`; ledger read must happen in that same call, Pitfall 9). `'forfeit'` and `'gave-up'` both increment `gaveUp`.
```typescript
function finishGame(key: BoardKey, outcome: FinishedOutcome) {
  deps.onGameFinished?.(key, outcome)
}
```

**Input blocking** (lines 127-129): add the persisted prompt (Pattern 3, not a `dialog` value, because `loadBoard` line 218 and `startGame` line 530 clear `dialog`):
```typescript
export function isInputBlocked(s: GameState): boolean {
  return s.dialog !== null || s.infoOpen          // + || s.pendingRestore !== null
}
```
`openDialog` (284-289), `openSettings` (295-299) guard `dialog !== null || infoOpen`; add the `pendingRestore` and `status === 'revealing'` checks (D-21) to these and to new `openStats`. `DialogName` (line 46) gains `'stats' | 'streakBreak'`.

**Persistence plumbing** (4 places that must all carry new slices or the slice is dropped on write-back): `docFromState` (149-162), `mergeDocIntoState` (164-174), `resetAll` set (316-329), `applyExternal(null)` set (388-398). Also the persist options:
```typescript
{
  name: SAVE_KEY,
  version: SAVE_VERSION,
  storage: deps.storage,
  partialize: docFromState,
  merge: mergeDocIntoState,
  migrate: (p, v) => migrateSave(p, v) as SaveDoc,   // IN-01 (D-22): make this throw with a comment pointing at loadSave
}
```

**Two-tab merge in `applyExternal`** (lines 404-427): the `changedForMe`/`behindThem` comparisons using `sameGame` and the "no ping-pong" early return (418) must also compare the new slices, else write-back is skipped. No toast for stats-only changes; the toast only fires when the visible Board changed (lines 425-457). The `revealing` deferral (367-370) already protects mid-reveal.
```typescript
let changedForMe = seen !== state.wordubadoInfoSeen
let behindThem = seen !== doc.wordubadoInfoSeen
for (const k of BOARD_KEYS) {
  if (!sameGame(merged[k], mine[k])) changedForMe = true
  if (!sameGame(merged[k], doc.boards[k])) behindThem = true
}
if (!changedForMe && !behindThem) return
```

**Toast** (lines 54-59, 667-671, 682-686): toast shape `{ id: ++toastSeq, text, kind: 'info', lifeMs? }`; one at a time. Day Streak toast and banner streak data go in `finishReveal` (lines 653-687), after the existing win branch; PRAISE toast collision is RESEARCH Open Question 2 (default: queue).

**New actions** (follow the `set`/`get` style of `openSettings`/`closeDialog`): `checkStreaks()`, `restore()`, `declineRestore()`, `openStats()`, `dismissBreak()`. Transient `breakNotice` (not persisted, RESEARCH Pattern 4).

---

### `src/main.tsx` (config, boot; modify)

**Analog:** itself, lines 10-15. Boot work runs outside React for StrictMode safety:
```typescript
void useGameStore.getState().resume()
defaultSaveStorage.onNotice((n) => useGameStore.getState().applyStorageNotice(n))
startTabSync(useGameStore)
// add: useGameStore.getState().checkStreaks()  then  startStreakWatch(useGameStore)
```

---

### `src/components/Modal.tsx` (component; add `dismissible`)

**Analog:** itself.

**Props + cancel/close/click handlers** (lines 3-10, 106-117). The three dismiss paths to gate behind `dismissible` (default `true`):
```typescript
onCancel={(e) => { e.preventDefault(); onClose() }}
onClose={() => {
  // Native close with the prop still true = browser closed it (D-14);
  if (openRef.current) onClose()
}}
onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
```
For `dismissible={false}`: `onCancel` only `preventDefault()`; click does nothing; native `close` while `openRef.current` calls `ref.current?.showModal()` instead of `onClose` (Pitfall 5). Tab focus trap (lines 83-98) and `data-initial-focus` (line 46) are reused unchanged. For the Stats modal's scroll behaviour see CSS notes below.

---

### `src/components/StatsButton.tsx` (component; new)

**Analog:** `src/components/SettingsButton.tsx` (lines 1-33), copy whole file; swap label/handler/icon, add `disabled={status === 'revealing'}` (D-21).
```tsx
const openSettings = useGameStore((s) => s.openSettings)
return (
  <button type="button" className="settings-button" aria-label={SETTINGS}
    aria-haspopup="dialog" data-own-enter onClick={openSettings}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
```
Icon paths per UI-SPEC: `M6 20v-5`, `M12 20V10`, `M18 20V4`. Class `stats-button` (share the `.settings-button` rules by extending the selector).

### `src/components/StreakChip.tsx` (component; new)

**Analog:** `SettingsButton.tsx` for button boilerplate (`aria-haspopup="dialog"`, `data-own-enter`). Render `null` when `dayStreak.current === 0`. Accessible name and dimming from `dayStreak.lastActiveDate !== today` (UI-SPEC lines 132); `today` from `localDateKey` via store dep, not a raw `new Date()` in the component.

---

### `src/components/StatsModal.tsx` (component; new)

**Analog:** `src/components/SettingsModal.tsx` (lines 11-58) for the modal skeleton; `LengthPicker.tsx` (`.length-picker`/`.length-option` CSS at game.css 361-396, `aria-checked`) for the segmented/tab look and roving behaviour (read `LengthPicker.tsx` for key handling when implementing).
```tsx
const open = useGameStore((s) => s.dialog === 'settings')   // -> 'stats'
const closeDialog = useGameStore((s) => s.closeDialog)
<Modal open={open} onClose={closeDialog} titleId="settings-title" bodyId="settings-body"
  fallbackFocus={() => document.querySelector<HTMLElement>('.settings-button') ?? document.body}>
  <h2 id="settings-title" className="modal-heading">{SETTINGS}</h2>
  <p id="settings-body" className="modal-body">{SETTINGS_NOTE}</p>
  <div className="modal-actions">
    <button type="button" className="modal-button" data-variant="primary"
      data-initial-focus data-own-enter onClick={closeDialog}>{CLOSE}</button>
```
Local `useState` for the viewed mode/tab, reset to the current Board on each open (D-02). Fallback focus: chip or stats button. Use the `.visually-hidden` utility (game.css 398-408) for the accessible suffixes. Chart: `<ol class="dist">` with no existing analog (see No Analog).

### `src/components/RestorePrompt.tsx` and `StreakBreakModal.tsx` (component; new)

**Analog:** `SettingsModal.tsx` (above) for structure; `GiveUpConfirm.tsx` / `NewGameConfirm.tsx` (confirm dialogs with two buttons, "safe first" ordering and `data-initial-focus`, not read in detail; read before implementing). Open from `pendingRestore !== null` (Restore prompt, `dismissible={false}`) and `breakNotice` (break modal, default dismissible). Button order "No" then "Restore"; `data-initial-focus` on Restore; `.modal-actions` stacks `column-reverse` below 400 px (game.css ~820).

---

### `src/components/Header.tsx` (component; modify)

**Analog:** itself, lines 24-29:
```tsx
<div className="header-top">
  <h1 className="title">Unlimited Wordle</h1>
  <div className="header-actions">
    <SettingsButton />
  </div>
</div>
```
Insert `<StreakChip />` and `<StatsButton />` before `<SettingsButton />`. `busy = status === 'revealing'` (line 21) is the existing disabled-while-revealing idiom, reuse for the stats opener.

### `src/components/Banner.tsx` (component; modify)

**Analog:** itself. Add an optional `streakLine?: string | null` prop; render below `.banner-body` (line 40-42) and above the button:
```tsx
<p className="banner-body">{won ? WIN_BODY : ...}</p>
{streakLine && <p className="banner-streak">{streakLine}</p>}
<button ref={button} ...>
```
`App.tsx` lines 72-80 passes `finishedInSession`; the line should show only for a game finished this session (same flag), none on restored games.

### `src/App.tsx` (component; modify)

**Analog:** itself, lines 51-56: mount `<StatsModal />`, `<RestorePrompt />`, `<StreakBreakModal />` next to `<SettingsModal />` / `<ResetConfirm />`.
```tsx
<Toast toast={toast} onDismiss={dismissToast} />
<WordubadoInfo />
<GiveUpConfirm />
<NewGameConfirm />
<SettingsModal />
<ResetConfirm />
```
Do not wire CHECK listeners here (main.tsx, outside React).

### `src/state/copy.ts` (config; modify)

**Analog:** itself. Flat `export const` strings and small template functions (lines 20-26):
```typescript
export const SETTINGS = 'Settings'
export const CLOSE = 'Close'
export function winHeading(n: number, max: number): string { return `You got it in ${n} of ${max}` }
```
Add every UI string from UI-SPEC "Copywriting Contract" here (`RESTORE_BODY(streak, left)`, `DAY_STREAK_TOAST(n)`, `RESTORE_TOAST(n)`, `BANNER_STREAK(n)`, `WIN_STREAK_RESET`, stats labels, empty state). Reuse `CLOSE`.

---

### `src/styles/game.css` (CSS; modify)

**Analog:** itself.

- `.settings-button` block (lines 314-346) is the template for `.stats-button` and `.streak-chip` (pill, `place-items: center`, hover `--color-surface`, focus-visible `2px solid var(--color-focus)`). Change sizes to 36 px below 400 px / 40 px from 400 px (UI-SPEC).
- Lines 348-359: the `@media (max-width: 399px)` absolute-position `.header-actions` rule is REMOVED/replaced (static, `margin-left: auto`; title left-aligned). This breaks `e2e/layout.spec.ts`, which must be updated in the same plan (Pitfall 7).
- `.length-picker`/`.length-option` (361-396): pattern for the Stats mode toggle and length tabs (`background: var(--color-surface)` track, `aria-checked='true'` -> `--color-accent`).
- `dialog.modal` / `.modal-card` (707-732): add `max-height: calc(100dvh - 32px)` and `overflow-y: auto` for the Stats modal only.
- `.modal-actions` / `.modal-button` variants (748-791) cover Restore, No, OK.
- `.banner` at 461, `.banner-body` at 487, `.banner[data-result=...]` 475; add `.banner-streak` and the tightened padding when present (media block at ~560).

---

### Tests

**`src/logic/streaks.test.ts` / `stats.test.ts`** Analog: `src/logic/save.test.ts` (table-driven style; node environment default, no jsdom). EC IDs in titles. TZ matrix pattern in RESEARCH "Table-driven test with TZ matrix".

**`src/logic/save.test.ts`** Lines 23 and 103-121 already anticipate this phase:
```typescript
// Phase 5's v1 -> v2 migration test must feed this fixture through the chain.
describe('migrateSave', () => { ... })
it('SAVE_VERSION is 1', () => { expect(SAVE_VERSION).toBe(1) })   // -> 2
```
Also `[JSON.stringify({ version: 1 })]` at line 252. Update version assertions (grep `version: 1` in `storage.test.ts`, `twoTabs.test.ts`, e2e `storage.spec.ts`, `persistence.spec.ts`).

**`src/state/streakWatch.test.ts`** Analog: `src/state/sync.test.ts` lines 1-50 (jsdom env, stub store `{ getState: () => ({ checkStreaks }) } as never`, `afterEach` calls `stop?.()`, "registers one listener when called twice", "returned function removes the listener").

**`src/state/twoTabs.test.ts`** (D-20 test): `makeTabs()` (lines 33-89) gives browser-like async storage events between tabs, with `settle()`. Add the "both tabs finish the same game before sync arrives, count once" case and merge-never-double-counts cases using `makeTabs`/`add`/`settle`.

**`src/state/gameStore.test.ts`** lines ~782-815 assert `onGameFinished` call counts and `toHaveBeenCalledWith('normal-5', 'gave-up')`; keep valid, add duplicate-id and streak/stats cases next to them.

**`src/components/Modal.test.tsx`** Analog: itself (lines 1-60): `stubDialog()` in `beforeAll`, `Sample` wrapper, cancel `Event('cancel', { cancelable: true })`. Add `dismissible={false}` cases: cancel prevented, `onClose` not called, backdrop click ignored, native close re-opens. Component tests copy the `// @vitest-environment jsdom` header + `cleanup` pattern.

**`src/test/storageDoubles.ts`** Add a `v2Save(overrides)`/envelope factory next to `createMemoryStorage` / `createThrowingStorage`.

## Shared Patterns

### Injected clock / edge purity
**Source:** `src/state/gameStore.ts` `GameDeps` + `defaultDeps` (lines 62-70, 708-716)
**Apply to:** `clock.ts`, store streak actions, `streakWatch.ts`, all tests (inject `deps.now`; use `vi.useFakeTimers`/`setSystemTime` only for the watcher/clock files).

### Persist four-place rule
**Source:** `docFromState`, `mergeDocIntoState`, `resetAll`, `applyExternal(null)` in `gameStore.ts`, plus `emptySave`/`validateSave` in `save.ts`
**Apply to:** every new persisted slice (`stats`, `dayStreak`, `restores`, `pendingRestore`, `streakRev`). Missing one drops the slice on write-back.

### Global listener once, outside React
**Source:** `src/state/sync.ts` + `src/main.tsx` lines 10-15
**Apply to:** `streakWatch.ts`, boot CHECK. Never in a `useEffect` (StrictMode double-run, CLAUDE.md).

### Total-order, symmetric merge
**Source:** `pickGame` `src/logic/save.ts` 171-192
**Apply to:** `mergeStats`, `mergeStreakSlice`. Must satisfy `merge(a,b) === merge(b,a)`; never sum counters across tabs.

### Hand-written validation, never throw
**Source:** `validateGame`/`validateSave` `src/logic/save.ts` 104-144, 218-244
**Apply to:** new slices. Fall back per slice; skip bad Boards (WR-03).

### Modal skeleton and focus
**Source:** `src/components/SettingsModal.tsx` 18-58 (+ `Modal.tsx` `data-initial-focus`, `fallbackFocus`)
**Apply to:** `StatsModal`, `RestorePrompt`, `StreakBreakModal`. `h2.modal-heading` + `.modal-body` + `.modal-actions` of `.modal-button[data-variant]`; all buttons carry `data-own-enter`.

### Toasts
**Source:** `gameStore.ts` `toast: { id: ++toastSeq, text, kind: 'info' }` (e.g. lines 331-333); strings in `copy.ts`.
**Apply to:** Day Streak toast, Restore toast. One at a time; no toast on load or on cross-tab sync.

## No Analog Found

| File / Part | Role | Data Flow | Reason |
|-------------|------|-----------|--------|
| Restore reducer in `streaks.ts` | utility | state machine | No existing `(state, event, today)` reducer; use RESEARCH Pattern 1 + SPEC section 8 |
| Guess-distribution bar chart (`<ol class="dist">`) in `StatsModal` | component | request-response | No chart exists; build from UI-SPEC "Chart" row (bars `max(24px, count/max*100%)`, colours `--tile-absent` / `--color-accent`) |
| `src/state/clock.ts` midnight maths | utility | transform | No date code exists; use RESEARCH Pattern 2 |
| Playwright `page.clock` specs | e2e | request-response | Per RESEARCH, existing e2e helpers seed via `addInitScript` (`e2e/helpers.ts`, not re-read here); `page.clock` is new |
| Ordered tablist/radiogroup roving tabindex | component | event-driven | `LengthPicker.tsx` is the nearest (read it when implementing); toggle/tabs with `role="tab"` do not exist |

## Metadata

**Analog search scope:** `src/logic`, `src/state`, `src/components`, `src/styles`, `src/test`, `src/main.tsx`, `src/App.tsx` (file list from glob, ~60 files)
**Files read in full:** `save.ts`, `gameStore.ts`, `sync.ts`, `Modal.tsx`, `SettingsButton.tsx`, `SettingsModal.tsx`, `Header.tsx`, `Banner.tsx`, `main.tsx`, `App.tsx`, `copy.ts`, `storageDoubles.ts`; partial: `twoTabs.test.ts`, `sync.test.ts`, `Modal.test.tsx`, `game.css`, `save.test.ts`, `gameStore.test.ts`
**Not read (named for the implementer):** `LengthPicker.tsx`, `GiveUpConfirm.tsx`, `NewGameConfirm.tsx`, `e2e/*`
**Pattern extraction date:** 2026-10-04
