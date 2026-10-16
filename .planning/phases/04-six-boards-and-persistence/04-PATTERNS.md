# Phase 4: Six Boards and Persistence - Pattern Map

**Mapped:** 2026-10-02
**Files analyzed:** 30 (new + modified + deleted)
**Analogs found:** 25 / 30 (5 files have no codebase analog; use 04-RESEARCH.md)

## CRITICAL FINDING: research assumption A7 is FALSE

Tiles do NOT animate only on `status === 'revealing'`. The flip is driven purely by the `data-flip` attribute, and `Grid` sets it for every submitted row regardless of status.

- `src/components/Grid.tsx` line 50: `flip={!!submitted}` (true for every row in `rows`).
- `src/components/Grid.tsx` line 39: `const revealed = !(status === 'revealing' && r === rows.length - 1)`. This only feeds the aria label in `Tile.tsx` (line 28), not the animation.
- `src/components/Tile.tsx` line 38: `data-flip={flip ? 'true' : undefined}`.
- `src/styles/game.css` lines 584-586: `.tile[data-flip] { animation: flip 500ms var(--ease-soft) calc(var(--i) * 300ms) both; }`. This runs on every mount or attribute add, staggered 0/300/600 ms per column.
- `src/styles/game.css` lines 592-596: `.row[data-bounce] .tile[data-flip]` combines flip with bounce, so the win bounce also needs `data-flip`.
- `src/styles/game.css` lines 727-729: under reduced motion, `.tile[data-flip]` becomes a 120 ms `fade-in`, still an animation.

Consequence for Phase 4: a restored Board (reload, `resume`, or `switchBoard` to a saved Board) will flip every saved row. When `switchBoard` replaces `rows`, the tile elements keep their `key={c}` and gain `data-flip`, so they animate too. UI-SPEC forbids animation on restore.

Required fix, owned by the Grid/Tile task:
- `Grid.tsx` must pass `flip` only for the row currently revealing, for example `flip={!!submitted && status === 'revealing' && r === rows.length - 1}`. Other rows rely on `.tile[data-state=...]` for colour (game.css lines 93-105), so they need no animation.
- The win bounce (`data-bounce`, `status === 'won'`, last row) needs `data-flip` on the last row of a win that finished in this session. Without it the bounce selector stops matching.
- Option: a store flag such as `finishedInSession` (already proposed in RESEARCH Pitfall 9 for Banner focus) gates both the bounce and the Banner autofocus. A restored won Board must show no bounce.
- Removing `data-flip` from the last row when `revealing` ends may swap an animated end state for the static `data-state` colour. Both end on the same colours, so there is no flash, but add a Grid test.
- Add Grid tests (`src/components/Grid.test.tsx` already exists) asserting that no tile has `data-flip` when `status` is `playing`, `won` or `lost` for a restored session, and that exactly the last row has it during `revealing`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/logic/save.ts` (NEW) | utility (pure schema, guard, migrate) | transform | `src/logic/boards.ts` / `src/logic/score.ts` (pure logic modules) | role-match |
| `src/logic/save.test.ts` (NEW) | test | transform | `src/logic/score.test.ts`, `src/logic/boards.test.ts` | exact |
| `src/state/storage.ts` (NEW) | service (storage adapter) | file-I/O (localStorage) | none in repo; `deps` injection style from `gameStore.ts` | no analog |
| `src/state/storage.test.ts` (NEW) | test | file-I/O | `src/state/gameStore.test.ts` (fake-deps pattern) | role-match |
| `src/state/sync.ts` (NEW) | service (global listener) | event-driven | `usePhysicalKeyboard.ts` (window listener + cleanup) | partial |
| `src/state/sync.test.ts` (NEW) | test | event-driven | `src/state/gameStore.test.ts` | partial |
| `src/state/gameStore.ts` (MOD) | store | CRUD + request-response | itself (`createGameStore(deps)`) | exact |
| `src/state/gameStore.test.ts` (MOD) | test | CRUD | itself (`setup()` helper) | exact |
| `src/state/copy.ts` (MOD) | config (copy constants) | static | itself | exact |
| `src/data/wordData.ts` (MOD) | service | request-response | itself | exact |
| `src/data/wordData.test.ts` (MOD) | test | request-response | itself | exact |
| `src/main.tsx` (MOD) | entry/config | event-driven | itself | exact |
| `src/components/Modal.tsx` (MOD) | component | event-driven | itself | exact |
| `src/components/Modal.test.tsx` (MOD) | test | event-driven | itself | exact |
| `src/test/stubDialog.ts` (MOD) | test utility | event-driven | itself | exact |
| `src/components/GiveUpConfirm.tsx` (NEW) | component | request-response | `src/components/SwitchConfirm.tsx` | exact |
| `src/components/NewGameConfirm.tsx` (NEW) | component | request-response | `src/components/SwitchConfirm.tsx` | exact |
| `src/components/ResetConfirm.tsx` (NEW) | component | request-response | `src/components/SwitchConfirm.tsx` | exact |
| `src/components/SettingsModal.tsx` (NEW) | component | request-response | `src/components/WordubadoInfo.tsx` | exact |
| `src/components/SettingsButton.tsx` (NEW) | component | request-response | `src/components/InfoButton.tsx` | exact |
| `src/components/ForfeitRow.tsx` (NEW) | component | request-response | `src/components/Banner.tsx` (own-enter button) | role-match |
| `src/components/Banner.tsx` (MOD) | component | request-response | itself | exact |
| `src/components/LengthPicker.tsx` (MOD) | component | request-response | itself | exact |
| `src/components/Header.tsx` (MOD) | component | request-response | itself | exact |
| `src/components/Grid.tsx` / `Tile.tsx` (MOD) | component | transform | itself | exact |
| `src/components/usePhysicalKeyboard.ts` (MOD) | hook | event-driven | itself | exact |
| `src/App.tsx` (MOD) | component (composition) | request-response | itself | exact |
| `src/components/SwitchConfirm.tsx` + `.test.tsx` (DELETE) | component | n/a | n/a | n/a |
| `src/App.test.tsx`, `src/components/Header.test.tsx` (MOD) | test | request-response | themselves | exact |
| `e2e/persistence.spec.ts`, `e2e/tabs.spec.ts`, `e2e/boards.spec.ts` (NEW); `e2e/layout.spec.ts`, `e2e/wordubado.spec.ts`, `e2e/helpers.ts` (MOD) | test (e2e) | request-response | existing `e2e/*.spec.ts` (NOT read in this pass; planner should read `e2e/helpers.ts` before writing) | role-match |
| `src/styles/game.css` (MOD) | config (style) | static | itself | exact |

## Pattern Assignments

### `src/state/gameStore.ts` (store, CRUD) - MODIFIED

**Analog:** itself. Keep the `createGameStore(deps)` factory and the flat active-Board view fields.

**Deps injection pattern** (lines 18-23, 242-251). Add `storage` here, and add it to `defaultDeps` as `createSaveStorage(getLocalStorage)`:
```typescript
export type GameDeps = {
  loadPools: (length: WordLength) => Promise<Pools>
  rng: () => number
  prefersReducedMotion: () => boolean
  setTimer: (fn: () => void, ms: number) => unknown
}
// ...
const defaultDeps: GameDeps = {
  loadPools: defaultLoadPools,
  rng: Math.random,
  prefersReducedMotion: () =>
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  setTimer: (fn, ms) => globalThis.setTimeout(fn, ms),
}
export const useGameStore = createGameStore(defaultDeps)
```

**Token pattern to generalise for D-16** (lines 97-123). `startGame` bumps `loadToken` and checks it after the `await`. Reuse it in `resume`, `switchBoard`, `resetAll` and `applyExternal`, and make the reveal timer check it too:
```typescript
async startGame(length, mode = get().mode) {
  const token = get().loadToken + 1
  set({ loadToken: token, mode, length, status: 'loading', rows: [], current: '',
        keyStates: {}, toast: null, shakeRow: -1 })
  try {
    const pools = await deps.loadPools(length)
    if (get().loadToken !== token) return
    const answer = readTestAnswer(length, pools.guesses) ??
      (mode === 'wordubado' ? pickWordubadoAnswer(pools, deps.rng) : pickAnswer(pools.answers, deps.rng))
    set({ pools, answer, status: 'playing' })
  } catch {
    if (get().loadToken !== token) return
    set({ status: 'error' })
  }
}
```
Note: `startGame` sets `toast: null`. RESEARCH Pitfall 8 says to set boot/reset toasts after the call, or stop clearing the toast.

**WR-04 bug to fix** (lines 205-209). The timer is currently fire-and-forget with no token:
```typescript
deps.setTimer(
  () => get().finishReveal(),
  revealDurationMs(length, deps.prefersReducedMotion()) + REVEAL_BUFFER_MS,
)
```
Change to `const t = get().loadToken; deps.setTimer(() => { if (get().loadToken === t) get().finishReveal() }, ...)`. The existing test helper `setup()` captures `timers[]`, so a stale-timer test can bump the token and call `timers[0].fn()`.

**Dialog guard pattern to collapse** (lines 169-170, 177-178, 185-186). Today there are three copies of `pendingSwitch !== null || infoOpen`. Replace each with one helper over the new `dialog` field plus `infoOpen`:
```typescript
const { status, current, length, pendingSwitch, infoOpen } = get()
if (status !== 'playing' || pendingSwitch !== null || infoOpen) return
```

**Finish logic to move to submit time** (lines 213-233, `finishReveal`). `finishReveal` currently decides won, lost or playing. RESEARCH Pattern 6 says to decide the outcome at submit time via the pure `resolveOutcome`, persist then, and let `finishReveal` only flip UI `status`. Reuse the PRAISE toast and `applyGuessToKeys` code from here:
```typescript
const merged = applyGuessToKeys(keyStates, last.letters, last.states)
if (last.states.every((s) => s === 'correct')) {
  set({ keyStates: merged, status: 'won',
        toast: { id: ++toastSeq, text: PRAISE[rows.length - 1] ?? PRAISE[PRAISE.length - 1], kind: 'info' } })
} else if (rows.length >= BOARD_CONFIG[length].attempts) {
  set({ keyStates: merged, status: 'lost' })
} else {
  set({ keyStates: merged, status: 'playing' })
}
```

**Info popup flag to persist (D-11)** (lines 62-71). The closure variable `infoSeen` is replaced by the persisted `wordubadoInfoSeen`:
```typescript
let infoSeen = false
function autoOpenInfo(prevMode: Mode, nextMode: Mode) {
  if (nextMode === 'wordubado' && prevMode !== 'wordubado' && !infoSeen) {
    infoSeen = true
    set({ infoOpen: true })
  }
}
```

**To remove:** `pendingSwitch`, `SwitchTarget`, `requestSwitch`, `confirmSwitch`, `cancelSwitch` (lines 15, 38, 43-45, 125-158). Replace them with `switchBoard`.

**Types to widen:** `GameStatus` (line 10-11) gains `'gave-up'`. Every `status ===` comparison needs auditing: Grid line 24 and 53, `App.tsx` line 55, Header `busy`, and `Keyboard`/`LoadingNotice` (not read here; grep before editing).

**Persist wiring:** no existing `persist` usage in the repo. Follow RESEARCH Pattern 1 (`persist(creator, {name, version, storage, partialize, merge, migrate})`). `create<GameState>()((set, get) => ...)` becomes `create<GameState>()(persist((set, get) => ..., opts))`.

---

### `src/state/gameStore.test.ts` (test) - MODIFIED

**Analog:** itself, lines 1-49. Copy this harness. It already injects fake deps and captures timers. Add `storage: createMemoryStorage()` to the deps:
```typescript
function setup(overrides: Partial<GameDeps> = {}, reduced = false) {
  const timers: { fn: () => void; ms: number }[] = []
  const loadPools = vi.fn((length: WordLength) =>
    Promise.resolve(length === 4 ? pools4 : pools5),
  )
  const deps: GameDeps = {
    loadPools,
    rng: () => 0,
    prefersReducedMotion: () => reduced,
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length },
    ...overrides,
  }
  return { store: createGameStore(deps), timers, loadPools }
}
```
Use `type(store, 'crane')` and `afterEach(() => { globalThis.__WORDLE_TEST__ = undefined })` as-is. The `switch` and `pendingSwitch` tests must be rewritten.

---

### `src/logic/save.ts` and `src/logic/save.test.ts` (utility, transform) - NEW

**Analog:** `src/logic/boards.ts` and `score.ts` (pure, node-env). Not read in detail. Import `BOARD_CONFIG`, `WordLength` from `./boards` and `score` from `./score`. The spec-level code to copy is in 04-RESEARCH.md "Schema", "Code Examples" (guard, `canForfeit`) and Pattern 2 (`MIGRATIONS` chain). `Mode` is currently exported from `gameStore.ts` (line 12). Importing it into `save.ts` creates a cycle, so move `Mode` into `save.ts` or `boards.ts` and re-export it, or use `import type`.

---

### `src/state/storage.ts` (service, file-I/O) - NEW, NO ANALOG

No `localStorage` use exists in `src/`. Use RESEARCH Pattern 2 verbatim (custom `PersistStorage<SaveDoc>` with `lastRaw` dedupe, never-throw `setItem`, `getItem` with `loadSave`, backup to `:corrupt`, `removeItem` clearing the backup). Guard `globalThis.localStorage` access in a try/catch.

---

### `src/state/sync.ts` (service, event-driven) - NEW

**Analog:** `src/components/usePhysicalKeyboard.ts` for the add/remove window listener shape. The StrictMode-safe version is wired once from `main.tsx` (RESEARCH Pattern 4), not from an effect:
```typescript
window.addEventListener('keydown', onKeyDown)
return () => window.removeEventListener('keydown', onKeyDown)
```
Copy the `started` flag and `applyExternal` call from RESEARCH Pattern 4.

---

### `src/main.tsx` (entry) - MODIFIED

**Analog:** itself, lines 9-10. This is the existing "start outside React effects" pattern. Replace `startGame(5)` with `resume()`, then `startTabSync(useGameStore)`, then show boot notices:
```typescript
// Start the first game outside React effects (StrictMode would run it twice).
void useGameStore.getState().startGame(5)
```

---

### `src/components/Modal.tsx` (component, event-driven) - MODIFIED (D-14)

**Analog:** itself. The existing ref-sync-via-effect pattern (lines 31-34) is the template for `openRef`:
```typescript
const fallback = useRef(fallbackFocus)
useEffect(() => {
  fallback.current = fallbackFocus
})
```
Add `const openRef = useRef(open); useEffect(() => { openRef.current = open })` and extend the `<dialog>` handlers (lines 99-112):
```tsx
onCancel={(e) => { e.preventDefault(); onClose() }}
onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
// add:
onClose={() => { if (openRef.current) onClose() }}
```
Close path to guard (lines 50-55). `d.close()` here fires a native `close` event after the prop is already false:
```typescript
function finish() {
  const d = ref.current
  if (!d) return
  d.close()
  d.removeAttribute('data-closing')
```

**Test analog:** `src/components/Modal.test.tsx` lines 1-48. Copy the `Sample` harness, `beforeAll(stubDialog; stubGlobal matchMedia)` and `afterEach(cleanup)`. `stubDialog.ts` (lines 10-14) must be extended so `close()` also does `this.dispatchEvent(new Event('close'))`.

---

### `src/components/GiveUpConfirm.tsx`, `NewGameConfirm.tsx`, `ResetConfirm.tsx` (component, request-response) - NEW

**Analog:** `src/components/SwitchConfirm.tsx` (exact). Drop the `shown` snapshot logic (lines 17-25) unless the body text changes while animating closed. Copy the dialog skeleton (lines 27-63):
```tsx
<Modal
  open={pendingSwitch !== null}
  onClose={cancelSwitch}
  titleId="switch-confirm-title"
  bodyId="switch-confirm-body"
  fallbackFocus={() => document.querySelector<HTMLElement>('.mode-switch')}
>
  <h2 id="switch-confirm-title" className="modal-heading">{CONFIRM_HEADING}</h2>
  <p id="switch-confirm-body" className="modal-body">...</p>
  <div className="modal-actions">
    <button type="button" className="modal-button" data-variant="secondary"
      data-initial-focus data-own-enter onClick={cancelSwitch}>{CONFIRM_KEEP}</button>
    <button type="button" className="modal-button" data-variant="primary"
      data-own-enter onClick={confirmSwitch}>{CONFIRM_START}</button>
  </div>
</Modal>
```
Change `open` to `dialog === 'giveUp'` (and so on) and the actions to `giveUp` / `forfeitNewGame` / `resetAll`. For Reset, the primary button gets the destructive variant (UI-SPEC; check `game.css` line 658-666 for `data-variant` styles). Keep `CONFIRM_KEEP` in `copy.ts`.

---

### `src/components/SettingsModal.tsx` (component) - NEW

**Analog:** `src/components/WordubadoInfo.tsx` (exact: info-style modal bound to a store flag, one button with `data-initial-focus data-own-enter`):
```tsx
const infoOpen = useGameStore((s) => s.infoOpen)
const closeInfo = useGameStore((s) => s.closeInfo)
return (
  <Modal open={infoOpen} onClose={closeInfo} titleId="wordubado-info-title"
    bodyId="wordubado-info-body"
    fallbackFocus={() => document.querySelector<HTMLElement>('.mode-switch')}>
    <h2 id="wordubado-info-title" className="modal-heading">{INFO_HEADING}</h2>
    <div id="wordubado-info-body" className="modal-body">...</div>
    <div className="modal-actions">
      <button type="button" className="modal-button" data-variant="primary"
        data-initial-focus data-own-enter onClick={closeInfo}>{INFO_GOT_IT}</button>
    </div>
  </Modal>
)
```

---

### `src/components/SettingsButton.tsx` (component) - NEW

**Analog:** `src/components/InfoButton.tsx` (exact). Copy the Enter-suppression `onKeyDown` (lines 10-14, needed because focus returns to this button on close, and Enter would otherwise submit a guess), `aria-haspopup="dialog"`, and the inline stroke-SVG icon pattern (lines 17-31). Mount it in `Header.tsx` inside the existing empty `<div className="header-actions" />` (line 17).

---

### `src/components/ForfeitRow.tsx` (component) - NEW

**Analog:** `src/components/Banner.tsx` lines 36-49 for the own-enter button convention (`data-own-enter` so Enter/Space does not submit a guess via `usePhysicalKeyboard`):
```tsx
<button type="button" className="play-again" data-own-enter onClick={...}>
```
Visibility: `canForfeit(status, rows.length, BOARD_CONFIG[length].attempts)`, rendered in `App.tsx` between `<main className="board-area">` and `.controls` (D-01). It must mount only when `status === 'playing'` (RESEARCH Pitfall 11).

---

### `src/components/Banner.tsx` (component) - MODIFIED

**Analog:** itself. `status` prop (line 11) becomes `'won' | 'lost' | 'gave-up'`. The heading and body ternary (lines 29-35) gains a gave-up branch. Reuse `lossHeading(answer)` for the answer reveal, with new copy for "You gave up". The mount focus effect (lines 26-28) must become conditional (a new `autoFocus` prop; RESEARCH Pitfall 9):
```typescript
useEffect(() => { button.current?.focus() }, [])
// ...
<section className="banner" data-result={status} aria-live="polite">
```
CSS: `.banner[data-result='lost']` exists at game.css line 374, so add `[data-result='gave-up']` alongside it.

---

### `src/components/LengthPicker.tsx` (component) - MODIFIED (D-12)

**Analog:** itself. Add an `inProgress: Partial<Record<WordLength, boolean>>` prop. The label pattern already uses a visually-hidden span (line 58):
```tsx
{n} <span className="visually-hidden">letters</span>
```
Extend to `<span className="visually-hidden">letters{inProgress ? ', game in progress' : ''}</span>` plus a dot element with `aria-hidden`. The dot is computed in `Header.tsx` from `boards`: current mode, `outcome === 'playing'`, and at least one guess (D-12/RESEARCH test row D-12).

---

### `src/components/Header.tsx` (component) - MODIFIED

**Analog:** itself. `requestSwitch` (lines 10, 25, 35) becomes `switchBoard`. `busy` (line 12) stays. Insert `<SettingsButton />` at line 17.

---

### `src/components/usePhysicalKeyboard.ts` (hook) - MODIFIED

**Analog:** itself, lines 15-21. Replace `store.pendingSwitch !== null || store.infoOpen` with the single dialog helper. Keep the `document.querySelector('dialog[open]')` backstop and the `data-own-enter` guard (lines 8-13).

---

### `src/App.tsx` (composition) - MODIFIED

**Analog:** itself. Replace `<SwitchConfirm />` (line 40) with the new dialogs next to `<WordubadoInfo />`. Widen the finished branch (line 55) to include `'gave-up'`. Mount `<ForfeitRow />` between `main.board-area` and `div.controls`. `App.test.tsx` resets store with `useGameStore.setState({pendingSwitch:null,...})`, so update it and clear `localStorage` in `afterEach` (RESEARCH Pitfall 10).

---

### `src/data/wordData.ts` (service) - MODIFIED (D-15)

**Analog:** itself, lines 30-36. Replace the reload branch per RESEARCH Pattern 8:
```typescript
if (failed.has(length)) {
  // ... Reload instead (safe in Phase 2: there is no saved progress yet).
  globalThis.location.reload()
  return new Promise<Pools>(() => {})
}
```
Delete the stale comment too. Tests: `src/data/wordData.test.ts` currently has no reload test (only `toPools`, memoisation, `readTestAnswer`). Add the offline-reject and online-reload-then-reject cases, using `vi.stubGlobal('location', { reload: vi.fn() })`, `navigator.onLine` stubs, and fake timers. Note that `failed` is module-level, so tests need `vi.resetModules()` plus a dynamic import, or a mocked loader.

---

### `src/state/copy.ts` (config) - MODIFIED

**Analog:** itself. Remove `CONFIRM_HEADING`, `CONFIRM_START`, `switchConfirmBody` and the `ModeLength` type (lines 28-44). Keep `CONFIRM_KEEP`. Add the new copy as exported constants and functions in the same style as `lossHeading`/`winHeading` (lines 20-26). The final wording comes from 04-UI-SPEC.md.

## Shared Patterns

### Store-injected dependencies
**Source:** `src/state/gameStore.ts` lines 18-23, 242-251.
**Apply to:** the storage adapter, sync and any clock/notice sources. Never touch `localStorage` or `window` inside actions directly; take it via `deps` so tests inject fakes.

### Token-guarded async and timers
**Source:** `src/state/gameStore.ts` lines 97-123 (`loadToken` check after `await`).
**Apply to:** `resume`, `switchBoard`, `retryLoad`, `resetAll`, `applyExternal` and the reveal timer (D-16).

### Own-enter buttons and dialog guard
**Source:** `src/components/usePhysicalKeyboard.ts` lines 8-21; `data-own-enter` on every modal button (`SwitchConfirm.tsx`, `WordubadoInfo.tsx`, `Banner.tsx`).
**Apply to:** every new button (ForfeitRow, Settings, confirms, SettingsButton). Add the Enter `onKeyDown` suppression from `InfoButton.tsx` lines 10-14 to buttons that receive focus back from a closing modal.

### Modal composition
**Source:** `src/components/Modal.tsx` props `{open, onClose, titleId, bodyId, fallbackFocus, children}`, with `data-initial-focus` on the safe default button.
**Apply to:** all four new dialogs. Reset/Give Up/New game focus "Keep playing"/"Cancel" first.

### Test conventions
**Source:** `src/components/Modal.test.tsx` lines 1-11 (`// @vitest-environment jsdom`, `stubDialog()`, `matchMedia` stub, `afterEach(cleanup)`); `src/state/gameStore.test.ts` lines 19-49 (fake deps, timers array).
**Apply to:** all new tests. `src/logic` and `src/state` tests run in the node env with no DOM.

### Do game actions in store actions, not effects
**Source:** `src/main.tsx` lines 9-10 and CLAUDE.md StrictMode note.
**Apply to:** boot `resume()`, `startTabSync`, boot toast.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/state/storage.ts` | service | file-I/O | No persistence exists yet; use RESEARCH Pattern 2 and the Zustand 5.0.15 `PersistStorage` type |
| `src/state/storage.test.ts` | test | file-I/O | No storage doubles exist; add `src/test/` `createMemoryStorage` plus the throwing storage from RESEARCH Code Examples |
| `src/state/sync.ts` and `sync.test.ts` | service / test | event-driven | No cross-tab code; only the keydown listener shape in `usePhysicalKeyboard.ts` is similar |
| Zustand `persist` wiring in `gameStore.ts` | store | CRUD | Store currently uses bare `create`; follow RESEARCH Pattern 1 |
| `e2e/tabs.spec.ts` (two pages in one browser context) | test (e2e) | event-driven | Not read; planner should read `e2e/helpers.ts` and `e2e/layout.spec.ts` first |

## Metadata

**Analog search scope:** `src/` (all 50 tracked files listed; 21 read in full or in targeted ranges); `e2e/` not opened (research and CONTEXT reference `e2e/helpers.ts`, `layout.spec.ts`, `wordubado.spec.ts`).
**Files scanned:** about 21 read, plus the full `src` file listing and a grep of `game.css` animation selectors.
**Pattern extraction date:** 2026-10-02
