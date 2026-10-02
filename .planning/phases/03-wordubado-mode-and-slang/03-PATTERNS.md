# Phase 3: Wordubado Mode and Slang - Pattern Map

**Mapped:** 2026-10-02
**Files analyzed:** 22 (9 new, 13 modified)
**Analogs found:** 21 / 22 (Modal has only a partial analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/words/apply-slang-review.mjs` (new) | utility (build script) | batch / transform | `scripts/build-words.mjs` | role-match |
| `scripts/words/lib.mjs` (mod: serialisePools, assertInvariants, renderSlangReview) | utility | transform | itself | exact |
| `scripts/build-words.mjs` (mod: emit `slang`) | build script | batch | itself | exact |
| `scripts/words/slang.test.mjs` (mod) | test | transform | itself | exact |
| `scripts/words/pools.test.mjs`, `lib.test.mjs` (mod, not read) | test | transform | `slang.test.mjs` | exact |
| `scripts/check-bundle.mjs` (mod) | build check | batch | itself | exact |
| `src/data/words-{4,5,6}.json` (generated) | data | batch | itself | exact |
| `src/data/wordData.ts` (mod: `Pools.slang`) | service (lazy loader) | request-response | itself | exact |
| `src/logic/pickAnswer.ts` (mod: `pickWordubadoAnswer`) | utility (pure) | transform | itself | exact |
| `src/logic/pickAnswer.test.ts` (mod) | test | transform | itself (has `mulberry32`) | exact |
| `src/state/gameStore.ts` (mod: mode, pendingSwitch, infoOpen) | store | event-driven | itself | exact |
| `src/state/gameStore.test.ts` (mod) | test | event-driven | itself | exact |
| `src/state/copy.ts` (mod: popup/confirm copy) | config (strings) | n/a | itself | exact |
| `src/components/ModeSwitch.tsx` (new) | component | event-driven | `src/components/LengthPicker.tsx` | role-match |
| `src/components/Modal.tsx` (new) | component | event-driven | none exact; `Toast.tsx` for effect/test style | partial |
| `src/components/WordubadoInfo.tsx`, `SwitchConfirm.tsx` (new) | component | request-response | `Banner.tsx` / `LoadError.tsx` (small presentational) | role-match |
| `src/components/Header.tsx` (mod) | component | request-response | itself | exact |
| `src/components/usePhysicalKeyboard.ts` (mod) | hook | event-driven | itself | exact |
| `src/components/*.test.tsx` (new Modal/ModeSwitch/Header tests) | test | event-driven | `src/components/Toast.test.tsx` | exact |
| `src/App.tsx` (mod: render dialogs, `data-mode`) | component | request-response | itself | exact |
| `src/styles/tokens.css`, `game.css` (mod: accent, switch) | config (CSS) | n/a | `.length-picker` / `.length-option` rules | role-match |
| `e2e/wordubado.spec.ts` (new), `e2e/helpers.ts` (mod) | test (E2E) | request-response | `e2e/game.spec.ts` + `e2e/helpers.ts` | exact |
| `src/state/testHook.ts` + `playwright.config.ts` + `ci.yml` (optional WR-01) | config | n/a | `testHook.ts` | exact |

## Pattern Assignments

### `src/state/gameStore.ts` (store, event-driven)

**Analog:** itself. Extend; do not restructure.

**Deps injection and state type** (lines 16-44): add `mode`, `pendingSwitch`, `infoOpen` to `GameState`; keep `GameDeps` unchanged (rng is already injected).
```ts
export type GameDeps = {
  loadPools: (length: WordLength) => Promise<Pools>
  rng: () => number
  prefersReducedMotion: () => boolean
  setTimer: (fn: () => void, ms: number) => unknown
}
```

**Token-guarded load; mode set at the top with length, answer picked after await** (lines 68-91). Capture mode in a local before the await (Pitfall 5); replace the `pickAnswer` call with a mode branch:
```ts
async startGame(length) {
  const token = get().loadToken + 1
  set({ loadToken: token, length, status: 'loading', rows: [], current: '',
        keyStates: {}, toast: null, shakeRow: -1 })
  try {
    const pools = await deps.loadPools(length)
    if (get().loadToken !== token) return
    const answer =
      readTestAnswer(length, pools.guesses) ??
      pickAnswer(pools.answers, deps.rng)   // -> mode === 'wordubado' ? pickWordubadoAnswer(pools, deps.rng) : pickAnswer(...)
    set({ pools, answer, status: 'playing' })
  } catch {
    if (get().loadToken !== token) return
    set({ status: 'error' })
  }
},
```

**Guarded switch entry point to copy/extend** (lines 93-98, `selectLength`): keep the `revealing` block and the `status !== 'error'` retry exception, then add the in-progress check before `startGame`:
```ts
selectLength(length) {
  const { status, length: active } = get()
  if (status === 'revealing') return
  if (length === active && status !== 'error') return
  void get().startGame(length)
},
```
New `requestSwitch({mode?, length?})`: same two early returns, then `if (rows.length > 0 && status === 'playing') set({ pendingSwitch })` else apply. `confirmSwitch`/`cancelSwitch` read state fresh. Auto-open popup (`infoSeen` module-level `let`, like `toastSeq` at line 53) when new mode is wordubado and not seen.

**Module-level counter pattern** (line 53): `let toastSeq = 0` inside `createGameStore` - put `infoSeen` here so each test store starts unseen.

---

### `src/logic/pickAnswer.ts` (utility, transform)

**Analog:** itself (lines 1-9, full file). Add `pickWordubadoAnswer` next to `pickAnswer` and reuse it:
```ts
export function pickAnswer(answers: readonly string[], rng: () => number = Math.random): string {
  if (answers.length === 0) throw new Error('empty answer pool')
  return answers[Math.min(answers.length - 1, Math.floor(rng() * answers.length))]
}
```
Use the RESEARCH Pattern 1 form with an unconditional first draw (`const r = rng()`), then `pickAnswer(pool, rng)`.

**Test analog:** `src/logic/pickAnswer.test.ts` lines 4-12 already contain `mulberry32`; the 10,000-draw test shape is lines 34-42:
```ts
const rng = mulberry32(12345)
const hits: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 }
for (let i = 0; i < 10000; i++) hits[pickAnswer(pool, rng)]++
for (const word of pool) { expect(hits[word]).toBeGreaterThan(2200) ... }
```
Copy it for slang share (count in [7300, 7700]; disjoint fake pools).

---

### `src/data/wordData.ts` (service, request-response)

**Analog:** itself. Lines 3-13: extend `RawPools` with `slang: string` and `Pools` with `slang: readonly string[]`; `toPools` splits it the same way as `extra`:
```ts
export type RawPools = { answers: string; guesses: string }
export function toPools(raw: RawPools): Pools {
  const answers = raw.answers.split(' ').filter(Boolean)
  const extra = raw.guesses.split(' ').filter(Boolean)
  return { answers, guesses: new Set([...answers, ...extra]) }
}
```
Note: `Pools` literals in `gameStore.test.ts` (lines 8-15) and `wordData.test.ts` need a `slang` field added (typecheck will flag them).

---

### `scripts/build-words.mjs` and `scripts/words/lib.mjs` (build, batch/transform)

**Analog:** themselves.
- `build-words.mjs` line 61-62: `slangEntries` / `slang` come from `slang.json`. Derive `reviewedSlang = slangEntries.filter(e => e.reviewed)` per length and pass to `serialisePools`. Keep passing all `slang` to `buildPools` (line 78).
- `lib.mjs` lines 133-138 `serialisePools` returns `JSON.stringify({answers, guesses})`: add `slang: slang.join(' ')` (keep key order stable for drift check).
- `lib.mjs` lines 97-131 `assertInvariants`: the `seen` loop (110-116) iterates `[...answers, ...guesses]` only; do NOT add slang there. Add checks beside lines 123-127 using the `fail(...)` helper:
```js
for (const w of slang) {
  if (w.length === length && !seen.has(w)) fail(`slang "${w}" missing from the guess pool`)
}
```
- `lib.mjs` lines 140-170 `renderSlangReview`: header text at line 147 says "flagged, never dropped" and keep/cut marks; rewrite to cut-list protocol (D-02) and add an "Already cut (blocklist hits)" section. Flag logic to reuse (lines 159-161):
```js
if (isProfane(e.word) || blocklist.has(e.word)) flags.push('blocklist hit')
if (commonByLength[length]?.has(e.word)) flags.push('common word')
```
- Isprofane/blocklist wiring to copy for the apply script: `build-words.mjs` lines 46-50, 58, 61 (matcher, `parseList(read(...))`, `JSON.parse(read('./words/slang.json'))`) and the `read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')` helper (line 44).
- Pitfall 2: cutting a slang word that is common returns it to Normal answers (`lib.mjs` line 77 `else if (slangSet.has(word)) dropped.slang.push(word)`); log per-length Normal answer counts.

**New `apply-slang-review.mjs`:** copy the header-comment style (build-words.mjs lines 1-13), the `read`/`matcher` setup, write `slang.json` with `JSON.stringify(entries, null, 2) + '\n'` (check existing file formatting first), deterministic and idempotent. Pure helpers (cut/apply) belong in `lib.mjs` with tests in `lib.test.mjs`, matching the "pure helpers, no fs" header at lib.mjs line 1.

---

### `scripts/words/slang.test.mjs` (test, transform)

**Analog:** itself. Must change in the same task as the review apply:
- Line 36-41: `expect(entry.reviewed).toBe(false)` -> `true` (title also says "with reviewed false (D-15)").
- Lines 54-62 count rule (hard-coded 80/150): extract named constants with a comment; do not loosen silently (D-05).
- Add blocklist-hit assertion; file read pattern lines 1-6:
```js
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const slang = JSON.parse(readFileSync(new URL('./slang.json', import.meta.url), 'utf8'))
```
Add a test that `src/data/words-N.json` `slang` equals reviewed entries of that length.

---

### `scripts/check-bundle.mjs` (build check, batch)

**Analog:** itself. Sentinel pattern lines 38-44 and assertion lines 52-58; add slang sentinels (first 10 of `slang` field) and the same `text.includes` check on `startNames`:
```js
for (const name of startNames) {
  const text = readFileSync(join(dist, name), 'utf8')
  for (const n of [4, 5, 6]) {
    if (text.includes(sentinels[n])) fail(`${name} (loaded at start) contains the ${n}-letter word pool.`)
  }
}
```
Note: line 40 destructures `{ answers }` from JSON; extend to `{ answers, slang }`.

---

### `src/components/ModeSwitch.tsx` (component, event-driven)

**Analog:** `src/components/LengthPicker.tsx`

**Imports/props pattern** (lines 1-8, 12-16): props `{ value, disabled, onChange }`, default-exported function component, local `change()` that early-returns when disabled (lines 19-22).

**ARIA + disabled + blur-after-pointer-click pattern** (lines 34-38, 52-56):
```tsx
<div role="radiogroup" aria-label="Word length"
     aria-disabled={disabled ? 'true' : undefined} className="length-picker">
...
onClick={(e) => {
  change(n)
  // Pointer/touch click: leave the radio so physical Enter plays.
  if (e.detail > 0) e.currentTarget.blur()
}}
```
Adapt: `<button type="button" role="switch" aria-checked={...} data-own-enter className="mode-switch">Wordubado</button>` plus `<button aria-label="About Wordubado" aria-haspopup="dialog" data-own-enter>`. Use `aria-disabled` (not `disabled`) while revealing, like the picker. Note LengthPicker buttons currently lack `data-own-enter` (arrow-key handler only); Enter/Space handling there relies on blur; new buttons should add `data-own-enter` (see usePhysicalKeyboard below).

---

### `src/components/Modal.tsx` (component, event-driven)

**Analog:** none for `<dialog>`. Closest style references: `Toast.tsx` (effect with cleanup, store-driven dismiss; not read in detail) and RESEARCH "Dialog wrapper core" snippet (RESEARCH lines 264-274). Use native `<dialog>` + `showModal()`; props `{ open, onClose, labelledBy, children }`; Esc via `onCancel` with `preventDefault` so store stays source of truth. Guard `typeof d.showModal === 'function'` (jsdom lacks it; no global vitest setup file exists - `vite.config.ts` has no `setupFiles`, so stub per test file in `beforeAll`, the way `Toast.test.tsx` sets up per-file `// @vitest-environment jsdom`).

---

### `src/components/Header.tsx` (component)

**Analog:** itself (lines 1-19, whole file). Current selector pattern to extend:
```tsx
const length = useGameStore((s) => s.length)
const status = useGameStore((s) => s.status)
const selectLength = useGameStore((s) => s.selectLength)
return (
  <header className="header">
    <h1 className="title">Unlimited Wordle</h1>
    <LengthPicker value={length} disabled={status === 'revealing'} onChange={selectLength} />
    <div className="header-actions" />
  </header>
)
```
Keep one-selector-per-field style; swap `selectLength` for `requestSwitch({length})`; keep empty `.header-actions` (D-13). Layout CSS to update: `game.css` lines 174-199 and the `max-height: 540px` block (301-315); header is `column` under 400px and fixed `height: var(--space-6)` in row mode, so a second row needs layout rework and E2E layout checks (`e2e/layout.spec.ts`).

---

### `src/components/usePhysicalKeyboard.ts` (hook, event-driven)

**Analog:** itself (lines 6-24). Add an early return when a dialog is open (Pitfall 3), before the Enter handling:
```ts
function onKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === 'Enter' || e.key === ' ') {
    const target = e.target
    if (target instanceof Element && target.closest('[data-own-enter]')) return
  }
  const store = useGameStore.getState()
  // add: if (store.pendingSwitch !== null || store.infoOpen) return
```

---

### `src/App.tsx` (component)

**Analog:** itself. Selector-per-field pattern (lines 14-25); `<div className="app">` (line 35) gets `data-mode={mode}`; mount the two dialogs next to `<Toast />` (line 36).

---

### Component tests (`ModeSwitch`, `Modal`, `Header`)

**Analog:** `src/components/Toast.test.tsx`
```tsx
// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
afterEach(() => { cleanup(); vi.useRealTimers() })
```
Stub `HTMLDialogElement.prototype.showModal/close` in `beforeAll` for Modal tests.

---

### `src/state/gameStore.test.ts` (test)

**Analog:** itself. Reuse `setup()` (lines 17-33; deps with `vi.fn` `loadPools`, `rng: () => 0`, array-captured timers) and `started()`/`type()` helpers (35-43); add `slang` to `pools5`/`pools4` (lines 8-15). Reset `globalThis.__WORDLE_TEST__ = undefined` in `afterEach` (lines 45-47). To test the 75/25 path: `rng: () => 0` picks slang (r < 0.75) first word.

---

### `src/styles/tokens.css` / `game.css` (CSS)

**Analog:** `.length-picker`/`.length-option` (`game.css` 201-225): pill, `--color-surface` track, selected = `--color-accent`. Switch should reuse these tokens. IMPORTANT: `--color-accent` is used at `game.css:224` (selected length option) and `:281` (`.play-again`) - NOT tile/key result colours (those are `--tile-correct/present/absent`, lines 5, 12-14 of tokens.css), so D-15 is not violated by retinting, but a dedicated `--color-mode-accent` override under `[data-mode='wordubado']` is still cleaner. Tokens file is a single `:root` block (lines 1-36); no dark theme yet. Existing `.visually-hidden` class (game.css 227-237) is available.

---

### `e2e/wordubado.spec.ts` (E2E) and `e2e/helpers.ts`

**Analog:** `e2e/game.spec.ts` + `e2e/helpers.ts`
```ts
test.use({ reducedMotion: 'reduce' })
test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
})
```
Helpers to reuse: `guess(page, word, row)`, `waitForReady`, `selectLength` (helpers.ts 13-37). `fixAnswers` fixes `TEST_ANSWERS` for all lengths via `addInitScript`; for a Wordubado slang win, add a helper that takes a slang word read from `src/data/words-5.json` (never hard-code). `readTestAnswer(length, guesses)` (testHook.ts 3-9) accepts any word in `guesses`, so slang works but also overrides Normal (Pitfall 8). Note `selectLength` helper will hit the confirm dialog if rows exist; tests that switch mid-game must handle it.

## Shared Patterns

### Store actions, not effects
**Source:** `src/state/gameStore.ts` lines 68-98. All answer picking, mode/length changes, and pending/info state live in store actions; components only call actions via `useGameStore((s) => s.x)`. StrictMode-safe.

### Guard against stale async
**Source:** `gameStore.ts` lines 69, 82, 88 (`loadToken`). Every new path into `startGame` inherits this; don't set `mode` outside `startGame`.

### `data-own-enter` + blur-after-click
**Source:** `usePhysicalKeyboard.ts` lines 8-13; `LengthPicker.tsx` lines 52-56. Apply to ModeSwitch, (i), and dialog buttons.

### Pure logic + injected rng, test-first
**Source:** `src/logic/pickAnswer.ts`, `pickAnswer.test.ts` (`mulberry32`). Keep new logic pure and unit-tested in `src/logic/`.

### Generated JSON drift
**Source:** `build-words.mjs` (deterministic output, sorted, no timestamps) + CI `npm run build:words && git diff --exit-code`. Re-run and commit `words-*.json` and `slang-review.md` whenever lib/slang change.

### Copy in `src/state/copy.ts`
**Source:** `copy.ts` lines 1-26: named string constants and tiny formatter functions. Put popup/confirm strings here (final wording from `03-UI-SPEC.md`, do not invent).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/Modal.tsx` | component | event-driven | No dialog/modal exists yet; use native `<dialog>` per RESEARCH Pattern 4 and jsdom stub note |
| `scripts/words/apply-slang-review.mjs` | build script | batch | No script applies owner marks to a data file yet; compose from `build-words.mjs` setup + pure helper in `lib.mjs` |

## Metadata

**Analog search scope:** `src/**`, `scripts/**`, `e2e/**`, `vite.config.ts` (full tracked file list reviewed)
**Files read:** gameStore.ts, gameStore.test.ts (1-80), Header, LengthPicker, pickAnswer(+test), wordData, usePhysicalKeyboard, App, copy, testHook, slang.test.mjs, lib.mjs, build-words.mjs, check-bundle.mjs, tokens.css, game.css (170-330), Toast.test.tsx, e2e helpers + game.spec, vite.config.ts
**Not read (check before editing):** `scripts/words/pools.test.mjs` and `lib.test.mjs` (hard-coded counts?), `Toast.tsx`, `Banner.tsx`, `playwright.config.ts`, `ci.yml`, `e2e/layout.spec.ts`
**Pattern extraction date:** 2026-10-02
