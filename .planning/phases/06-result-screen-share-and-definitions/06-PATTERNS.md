# Phase 6: Result Screen, Share and Definitions - Pattern Map

**Mapped:** 2026-10-12
**Files analyzed:** 22 new/modified (source + tests + docs)
**Analogs found:** 20 / 22 (2 partial, see No Analog Found)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/ResultModal.tsx` (new) | component (dialog) | request-response + event-driven | `src/components/StatsModal.tsx` (+ `GiveUpConfirm.tsx`) | exact |
| `src/components/StatsBlock.tsx` (new, extracted `Stat` + dist chart) | component | transform | `StatsModal.tsx` lines 37-61, 182-239 | exact (extract) |
| `src/components/Banner.tsx` (modify, slim) | component | request-response | itself | exact |
| `src/components/Modal.tsx` (modify: Tab trap selector) | component | event-driven | itself (line 88-91) | exact |
| `src/components/Toast.tsx` (modify: top layer / in-dialog) | component | event-driven | itself | exact |
| `src/App.tsx` (modify: mount ResultModal, drop streakLine) | component (composition) | request-response | itself | exact |
| `src/state/gameStore.ts` (modify: `'result'` dialog, `resultPending`, delays, definition-revealed flag) | store | event-driven | itself: `revealDurationMs` L159, `isInputBlocked` L165, `giveUp` L749, `finishReveal` L942 | exact |
| `src/state/copy.ts` (modify: add strings, retire 6 exports) | config (strings) | n/a | itself | exact |
| `src/logic/share.ts` + `share.test.ts` (new) | utility (pure) | transform | `src/logic/score.ts`, `src/logic/stats.ts` + `stats.test.ts` | role-match |
| `src/logic/definition.ts` + `definition.test.ts` (new) | service | request-response (fetch) | none for fetch; `src/data/wordData.ts` `loadPools` for session Map cache + failure handling | partial |
| `src/data/wordData.ts` + `wordData.test.ts` (modify: `defs`) | service | batch/lazy-load | itself | exact |
| `scripts/words/lib.mjs` `serialisePools` + `lib.test.mjs` (modify) | utility | transform | itself L143-158 | exact |
| `scripts/build-words.mjs` (modify: pass defs) | build script | batch | itself L78-104 | exact |
| `scripts/check-bundle.mjs` (modify: defs sentinel) | build script | batch | itself L44-70 | exact |
| `src/styles/game.css` (modify: slim banner, remove streak rules, `.result-*`, `.definition`) | config (CSS) | n/a | `.banner*` L505-565, 618-624; Stats modal CSS | exact |
| `src/components/ResultModal.test.tsx` (new) | test | n/a | `src/components/StatsModal.test.tsx` | exact |
| `src/components/Banner.test.tsx` (rewrite) | test | n/a | itself | exact |
| `src/App.test.tsx` (update L186-187) | test | n/a | itself | exact |
| `src/state/gameStore.test.ts` (extend) | test | n/a | itself | exact |
| `e2e/result.spec.ts` (new), `e2e/layout.spec.ts` (extend) | test (e2e) | n/a | `e2e/streaks.spec.ts`, `e2e/stats.spec.ts`, `e2e/layout.spec.ts`, `e2e/helpers.ts` | role-match |
| `SPEC.md` section 10 R-SHARE-1 (doc edit, D-12) | doc | n/a | n/a | n/a |

## Tests that import or assert the copy being retired (MUST be updated in the same plan as the Banner/copy change)

Retired exports: `winStreakLine`, `WIN_BODY`, `LOSS_BODY`, `winHeading`, `lossHeading` (UI-SPEC also retires `WIN_STREAK_RESET`, `GAVE_UP_BODY`).

Source files that import them (production, will not compile after retirement):
- `src/App.tsx:20` imports `winStreakLine`; used at L88-90 (`streakLine={...}`). Remove import, prop and the `finishNote` selector (L39) if unused afterwards (ResultModal reads it instead).
- `src/components/Banner.tsx:3-9` imports `GAVE_UP_BODY, LOSS_BODY, WIN_BODY, lossHeading, winHeading`.
- `src/state/copy.ts:17,18,20,24,44,66,68` definitions.

Unit tests importing a retired export directly:
- `src/components/Banner.test.tsx:5` imports `winStreakLine`; uses at L69-77 (`'winStreakLine words the win and the reset'` test: delete). Also tests at L36-67 pass `streakLine` and assert `.banner-streak` / `[data-streak]`: delete/rewrite. L22-34 test `autoFocus` prop (removed per UI-SPEC): rewrite to "See result" + "Play again" buttons.

Tests asserting the retired literal strings (no import, will fail at runtime):
- `src/App.test.tsx:186` `'The word was CRANE'` (banner give-up body; now banner body for Give Up is still "The word was CRANE" but modal also contains it, so `getByText` may match twice: use `within(banner)` or `getAllByText`) and L187 `'You gave up. Ready for another?'` (GAVE_UP_BODY retired; banner heading becomes "You gave up").
- `e2e/game.spec.ts:16-17` `'You got it in 2 of 6'`, `'Ready for another?'`; L34-35 `'The word was GOLD'`, `'Better luck next time.'`.
- `e2e/wordubado.spec.ts:42, 59` `'You got it in 1 of 6'` / `'You got it in 1 of'`.
- `e2e/tabs.spec.ts:74, 83, 91, 92, 112, 113, 148, 149` `'You got it in 1 of 6'` (banner per Board; new banner heading is `Solved in 1`; modal heading `You got it in 1/6!`).
- `e2e/storage.spec.ts:13, 30, 38, 95` and `e2e/persistence.spec.ts:32, 37, 39` (and L71 `'The word was CRANE'`), `e2e/boards.spec.ts:92, 96`, `e2e/streaks.spec.ts:27`.
- `e2e/forfeit.spec.ts:60-61, 67` `'The word was CRANE'`, `'You gave up. Ready for another?'`.
- `e2e/streaks.spec.ts:42-72, 90-91` assert `.banner` contains `Win streak: N` / `Win streak reset` and `getByText(/Win streak/)` count 0: these must move to the Result modal Streak cell (value + visually hidden "Current win streak N, reset").
- Cross-cutting E2E impact: the modal now auto-opens after a delay and makes the page inert; every E2E that finishes a game and then clicks the banner/Play again/other UI must wait for or close the Result modal (Esc) first. Check `e2e/helpers.ts` for a shared finish helper and add a `closeResultModal` / wait helper there rather than per-spec edits.
- Stale CSS tied to the retired line: `src/styles/game.css:538-550` (`.banner-streak`, `.banner[data-streak]`) and L622-624.

## Pattern Assignments

### `src/components/ResultModal.tsx` (component, request-response)

**Analog:** `src/components/StatsModal.tsx` (store selectors, `Modal` usage, `Stat`, dist chart, `data-initial-focus`) and `src/components/GiveUpConfirm.tsx` (fallbackFocus, button wiring).

**Imports / selector pattern** (StatsModal.tsx 1-29, 63-72):
```tsx
import { deriveStats } from '../logic/stats'
import { BEST, BEST_FULL, EM_DASH, GUESS_DISTRIBUTION, NO_WINS_YET, PLAYED, STREAK, STREAK_FULL,
  WIN_PCT, WIN_PCT_FULL, distRowLabel } from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'

const open = useGameStore((s) => s.dialog === 'stats')   // -> s.dialog === 'result'
const closeDialog = useGameStore((s) => s.closeDialog)
```

**Modal wrapper + fallbackFocus** (StatsModal.tsx 114-126; GiveUpConfirm 16-24):
```tsx
<Modal open={open} onClose={closeDialog} titleId="stats-title" bodyId="stats-panel"
  fallbackFocus={() => document.querySelector<HTMLElement>('.streak-chip') ?? document.body}>
  <h2 id="stats-title" className="modal-heading">...</h2>
```
Result version: `titleId="result-title"` (h2 `className="modal-heading result-heading" data-result={status}`), `bodyId="result-answer"`, `fallbackFocus={() => document.querySelector<HTMLElement>('[data-see-result]')}` (RESEARCH Pitfall 7).

**Stat row + distribution (reuse; extract, do not copy)** (StatsModal.tsx 37-61 `Stat`, 182-203 stat-row, 206-239 chart): use `deriveStats(stats, mode, length)` with a concrete length (not `'all'`) so `winStreak`/`bestWinStreak` are non-null. Slice `dist` to `BOARD_CONFIG[length].attempts` rows (Pitfall 9: for a concrete length `dist` is already the board's own array, check length vs attempts). Highlight only when `status === 'won'`: `v.highlightRow` is set from `b.last.won`, so gate with `status === 'won' ? v.highlightRow : null`. Empty state: `v.wins === 0 ? <p className="stats-line stats-empty">{NO_WINS_YET}</p> : <ol className="dist">...`. Omit `gaveUpLine`, `avgLine`, footers, mode/tab controls.

**Actions + initial focus** (StatsModal.tsx 249-259; GiveUpConfirm 31-56):
```tsx
<div className="modal-actions">
  <button type="button" className="modal-button" data-variant="primary"
    data-initial-focus="" data-own-enter onClick={closeDialog}>
```
Result version: Share (`data-variant="secondary"`, `data-own-enter`) then Play again (`data-variant="primary" data-initial-focus data-own-enter`); Play again onClick = `playAgain()` then blur activeElement (copy from Banner.tsx 54-61 / GiveUpConfirm 47-52).

**Held-Enter guard** (new, UI-SPEC): capture listener on dialog content `onKeyDownCapture={(e) => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault() }}`.

**Share handler**: RESEARCH Pattern 3 (sync `navigator.share` / `clipboard.writeText` in click, text precomputed with `useMemo`). `matchMedia` accessed as `globalThis.matchMedia?.(...)` (Modal.tsx 16-20 pattern).

**Definition area state**: store flag (transient, reset in `startGame`/board switch) plus `definition.ts` lookup in an effect with AbortController cleanup; no recording in effects (CLAUDE.md StrictMode pitfall).

---

### `src/components/Banner.tsx` (component, slim)

**Analog:** itself (current file L1-67). Keep: `<section className="banner" data-result={status}>`, `<h2 className="banner-heading">`, Play again button block (L51-64: `className="play-again" data-own-enter`, onClick calls `onPlayAgain()` then blurs `document.activeElement`).

Remove: `autoFocus` prop and the mount effect (L31-35), `streakLine` prop, `data-streak`, `aria-live="polite"` (L42), `.banner-streak` line, `WIN_BODY/LOSS_BODY/GAVE_UP_BODY`.

Add: `onSeeResult` prop, button `<button type="button" className="see-result" data-see-result data-own-enter onClick={openResult}>` rendered before Play again. New heading copy per UI-SPEC table (win `Solved in {n}`, loss `The word was {ANSWER}`, give up `You gave up` + body `The word was {ANSWER}`); `maxAttempts` no longer needed for the heading.

---

### `src/state/gameStore.ts` (store, event-driven)

**Analog:** itself.

**Timing source** (L157-161): put new constants beside it.
```ts
const REVEAL_BUFFER_MS = 50
export function revealDurationMs(length: WordLength, reduced: boolean): number {
  return reduced ? 150 : (length - 1) * 300 + 500
}
```
Add `bounceMs(length) = 400 + (length - 1) * 100` and `resultDelayMs(outcome, length, reduced)` (reduced 300, win bounceMs+400, loss 600) as exported functions (E2E computes from them).

**Input block** (L165-167): extend with the pending flag.
```ts
export function isInputBlocked(s: GameState): boolean {
  return s.dialog !== null || s.infoOpen || s.pendingRestore !== null
}
```
Other guards that repeat this triple instead of calling `isInputBlocked` (must also honour `resultPending`): L519-521 (`dialog !== null || infoOpen || pendingRestore !== null`), L531-532, L537-542 (switchBoard/openStats/openSettings area), and `DialogName` L65 (add `'result'`), `closeConfirms` L633-634, `openDialog` L135.

**Timer scheduling idiom** (submit L931-938; reuse verbatim for the result open):
```ts
const token = get().loadToken
deps.setTimer(() => {
  if (get().loadToken === token) get().finishReveal()
}, revealDurationMs(length, deps.prefersReducedMotion()) + REVEAL_BUFFER_MS)
```
**finishReveal** (L942-993): the won branch sets `status: 'won'`, toast and queued Day Streak toast; the lost branch L978-984. After each of those two branches, set `resultPending: true` and `deps.setTimer(() => { if (get().loadToken !== token) return; set({ resultPending: false, ...(get().pendingRestore === null && !get().breakNotice ? { dialog: 'result' } : {}) }) }, resultDelayMs(...))`. Keep this before the `pendingExternal` handling (L988-992) in mind: `applyExternal` must clear `resultPending`.

**giveUp** (L749-756): currently `set({ dialog: null })` first, then sets `status: 'gave-up'`. Replace the first `set` with the result open after the guard (RESEARCH Pattern 1: set `dialog: 'result'` directly in the same `set` that sets `status: 'gave-up'`), leaving the not-forfeitable early return clearing the dialog.

**playAgain** (L873-875): `void get().startGame(get().length, get().mode)`; `startGame` already resets `dialog: null`, `finishNote`, `finishedInSession` (L369-370, L422-426, L816-817). Reset the definition-revealed and `resultPending` flags in the same places. Keep them out of `partialize`/`docFromState` (L170-250) to avoid a saved-doc change (D-25).

---

### `src/logic/share.ts` (utility, pure transform) and `share.test.ts`

**Analog:** `src/logic/score.ts` (pure fn over `TileState`, imports `TileState` type from L1) and `src/logic/stats.ts` (pure, typed input, injected values) with `src/logic/stats.test.ts` for the node-env test layout.

Type import: `import type { TileState } from './score'` and `import type { Mode, WordLength } from './boards'` (stats.ts L8 uses `import type { Mode } from './boards'`).

Core: RESEARCH Pattern 4. Pass `origin` in, never read `window` (RESEARCH anti-pattern). Test file uses default node env (no `@vitest-environment` line, per CLAUDE.md for `src/logic/**`); `isTouchFirst()` takes an injectable env object.

---

### `src/logic/definition.ts` (service, request-response) and `definition.test.ts`

**Analog (partial):** `src/data/wordData.ts` L24-54 for the module-level `Map` cache pattern (cache only successes: failure `.catch` deletes the entry, L46-51):
```ts
const cache = new Map<WordLength, Promise<Pools>>()
...
.catch((err: unknown) => { cache.delete(length); failed.add(length); throw err })
```
Copy that discipline for D-26 (cache successes only). Fetch/AbortController/shape guard: RESEARCH Pattern 6. Tests: `vi.useFakeTimers()` for the 5 s abort (CLAUDE.md stack note), injected `fetch`.

---

### `src/data/wordData.ts` + `scripts/words/lib.mjs` + `scripts/build-words.mjs` + `scripts/check-bundle.mjs` (curated definitions)

**Analog:** themselves.

`wordData.ts` L3-15:
```ts
export type RawPools = { answers: string; guesses: string; slang: string }
export type Pools = { answers: readonly string[]; slang: readonly string[]; guesses: ReadonlySet<string> }
export function toPools(raw: RawPools): Pools { ... const slang = raw.slang.split(' ').filter(Boolean) ... }
```
Add `defs: Record<string, string>` to `RawPools` and `Readonly<Record<string,string>>` to `Pools`; `toPools` copies it. Existing mock pools in tests (`StatsModal.test.tsx:7-11`, `App.test.tsx`, others) construct `Pools` literals and will need `defs: {}`: grep `slang:` in `*.test.*` when adding the field (or make `defs` optional in the type).

`lib.mjs` L143-158 (add a `reviewedDefs(entries, length)` beside `reviewedSlang`, same filter `e.reviewed === true && e.word.length === length`, and extend `serialisePools({ answers, guesses, slang, defs })`):
```js
export function serialisePools({ answers, guesses, slang }) {
  return JSON.stringify({ answers: answers.join(' '), guesses: guesses.join(' '), slang: slang.join(' ') }) + '\n'
}
```
`build-words.mjs` L78 and L90: `const slangAnswers = reviewedSlang(slangEntries, length)` / `const text = serialisePools({ answers, guesses, slang: slangAnswers })`; gzip guard at L32 `GZIP_BUDGET` and L102. Tests to extend: `scripts/words/lib.test.mjs` (`serialisePools` L187, `reviewedSlang` L256) and `scripts/words/pools.test.mjs:48` (`expect(data.slang).toBe(reviewedSlang(...).join(' '))`; add the analogous defs assertion).

`check-bundle.mjs` L44-70 builds sentinels from the JSON and asserts they are absent from `startNames` chunks; add a defs sentinel (first few definition strings per length) with the same check.

---

### `src/components/Modal.tsx` (Tab trap) and `Toast.tsx`

**Modal.tsx L86-101** trap builds from `querySelectorAll<HTMLButtonElement>('button')`; extend selector to include `textarea` (Pitfall 6) and extend `Modal.test.tsx`.

**Toast.tsx L16-41**: current page-level `.toast-layer` (`game.css:627-632`, `position: fixed; z-index: 10`). Keep `role`/`aria-live` logic (L33-34). Option A popover (`popover="manual"` plus `showPopover()` in an effect keyed on toast id and dialog open); option B render the same `<Toast>` inside the open result dialog, one at a time (RESEARCH Pitfall 2). `Toast.test.tsx` exists to extend.

---

### Test analogs

- `src/components/ResultModal.test.tsx`: copy the harness from `src/components/StatsModal.test.tsx` L1-50 (`// @vitest-environment jsdom`, `stubDialog()` in `beforeAll`, `vi.hoisted` + `vi.mock('../data/wordData', () => ({ loadPools }))`, `matchMedia` stub, `beforeEach` resets `useGameStore.setState({...})` and `await startGame(5, 'normal')`).
- `src/state/gameStore.test.ts`: extend with `deps.setTimer` stubs (injectable) for result delay, skip on `pendingRestore`/`breakNotice`, `resultPending` blocking.
- E2E: `e2e/helpers.ts` (shared finish helpers; check before writing), `e2e/axe.ts` (axe run with modal open), `e2e/layout.spec.ts` (320x500 no-scroll).

## Shared Patterns

### All user-facing strings in `src/state/copy.ts`
**Source:** `src/state/copy.ts` (functions like `distRowLabel` L95-96, `dayStreakToast` L99). Add new strings (headings, definition states, Share, "Copied", clipboard note, banner headings, `See result`) here; `TRY_AGAIN` already exists at L15 ('Try again') and `PLAY_AGAIN` at L16: reuse, do not duplicate. Retire per list above.

### Dialog open/close via single `dialog` field
**Source:** `gameStore.ts` L65 `DialogName`, StatsModal L64 `useGameStore((s) => s.dialog === 'stats')`.

### Play again = blur after action
**Source:** `Banner.tsx` L54-61 and `GiveUpConfirm.tsx` L47-52 (`onClick: action(); if (document.activeElement instanceof HTMLElement) document.activeElement.blur()`). Apply to modal Play again.

### Keyboard coordination
**Source:** `src/components/usePhysicalKeyboard.ts` L8-13, 15-20: Enter/Space skipped when target is inside `[data-own-enter]`, and all keys ignored when `dialog[open]` exists or `isInputBlocked`. Put `data-own-enter` on all new buttons (Share, Show definition, Try again, See result, Play again).

### matchMedia access in jsdom
**Source:** `Modal.tsx` L16-20 `globalThis.matchMedia?.('...').matches ?? false`.

### Injectable timers/time
**Source:** `gameStore.ts` L85 `setTimer` dep and L1026 default `globalThis.setTimeout`; tests inject. Use for result delay.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/logic/definition.ts` (fetch part) | service | request-response (network) | No `fetch` use exists in `src/`; use RESEARCH Pattern 6 (only the cache discipline has an analog, `wordData.ts`) |
| Share sheet / clipboard handlers | utility | event-driven (browser API) | No prior Web Share / Clipboard use; use RESEARCH Pattern 3 and Pattern 5 |

## Metadata

**Analog search scope:** `src/components`, `src/state`, `src/logic`, `src/data`, `src/styles`, `scripts`, `e2e` (grep for retired exports ran repo-wide excluding node_modules, .planning, dist, .git)
**Files scanned:** about 25 read/grepped
**Pattern extraction date:** 2026-10-12
