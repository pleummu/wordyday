# Phase 7: Themes, Accessibility and Polish - Pattern Map

**Mapped:** 2026-10-14
**Files analyzed:** 27 (13 new, 14 modified)
**Analogs found:** 24 / 27

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/logic/save.ts` (mod) | model/migration | transform | itself: `MIGRATIONS[1]`, `validateSave`, `wordubadoInfoSeen` | exact |
| `src/state/gameStore.ts` (mod) | store | event-driven | itself: `wordubadoInfoSeen`/`infoOpen`/`openSettings`/`finishReveal`/`applyExternal` | exact |
| `src/state/appearance.ts` (new) | utility/boot service | event-driven (subscribe + matchMedia) | `src/state/streakWatch.ts` | exact |
| `src/state/testHook.ts` (mod) | utility | request-response | itself | exact |
| `src/logic/announce.ts` (new) | utility | transform (pure) | `src/logic/share.ts` | role-match |
| `src/components/HowToPlayModal.tsx` (new) | component | request-response | `src/components/WordubadoInfo.tsx` | exact |
| `src/components/HelpButton.tsx` (new) | component | request-response | `src/components/SettingsButton.tsx` | exact |
| `src/components/LiveRegion.tsx` (new) | component | event-driven | `src/components/Toast.tsx` (announce part) | role-match |
| `src/components/SettingsModal.tsx` (mod, Appearance) | component | CRUD | itself + `LengthPicker.tsx` + `ModeSwitch.tsx` | exact |
| `src/components/ResetConfirm.tsx` / `copy.ts` RESET_BODY (mod) | component/copy | request-response | itself | exact |
| `src/components/Header.tsx` (mod) | component | request-response | itself | exact |
| `src/App.tsx` (mod) | component | request-response | itself | exact |
| `src/main.tsx` (mod) | boot | event-driven | itself (`startStreakWatch`, `startTabSync`) | exact |
| `src/state/copy.ts` (mod) | config/copy | n/a | itself | exact |
| `src/styles/tokens.css` (mod) | config | n/a | itself (`[data-mode='wordubado']`) | exact |
| `src/styles/game.css` (mod) | config | n/a | itself (`.settings-button, .stats-button`, `.length-picker`, `.mode-switch`, backdrop) | exact |
| `index.html` (mod) | config | n/a | itself; inline-script has no analog | partial |
| `public/favicon.svg`, `apple-touch-icon.png`, `og-image.png` (new) | asset | file-I/O | existing `public/favicon.svg` | partial |
| `scripts/make-assets.mjs` (new) | script | file-I/O / batch | `scripts/check-bundle.mjs`, `scripts/build-words.mjs` | role-match |
| `src/logic/save.test.ts`, `storage.test.ts`, `twoTabs.test.ts`, `gameStore.test.ts` (mod) | test | n/a | themselves | exact |
| `src/state/appearance.test.ts` (new) | test | event-driven | `src/state/streakWatch.test.ts` | exact |
| `src/logic/announce.test.ts` (new) | test | transform | `src/logic/share.test.ts` | exact |
| `src/components/LiveRegion.test.tsx` (new) | test | component | `src/components/Toast.test.tsx` | role-match |
| `e2e/helpers.ts` (mod, `skipHelp`, v3 seed) | test util | n/a | itself | exact |
| `e2e/help.spec.ts`, `theme.spec.ts`, `keyboard.spec.ts`, `a11y-themes.spec.ts` (new) | test | e2e | `e2e/settings.spec.ts`, `e2e/axe.ts` | exact |
| `e2e/layout.spec.ts`, `e2e/storage.spec.ts` (mod) | test | e2e | themselves | exact |
| `scripts/meta.test.mjs` (new) | test | file-I/O | none (see No Analog) | none |

## Pattern Assignments

### `src/logic/save.ts` (model, v2 -> v3)

**Analog:** same file.

**Migration step** (lines 134-149). Copy the non-object guard of `[1]`; add `[2]`:
```typescript
export const MIGRATIONS: Readonly<Record<number, (s: unknown) => unknown>> = {
  1: (s) => {
    if (typeof s !== 'object' || s === null || Array.isArray(s)) return s
    const e = emptySave()
    return { ...(s as Record<string, unknown>), stats: e.stats, /* ... */ }
  },
  // add: 2: (s) => isObject(s) ? { ...s, theme: 'system', colourBlind: false, howToPlaySeen: false } : s
}
```
(`isObject` is declared at line 167 below the const; use the inline typeof guard as in `[1]`, or it is fine because the function runs later.)

**Touch points:** `SAVE_VERSION = 2` (line 3 -> 3); `SaveDoc` type (63-72, add 3 fields); `emptySave()` (101-112, add defaults).

**Validation** (lines 447-479). Keep `wordubadoInfoSeen` strict (452). For new fields coerce like `streakRev` (477), never return null:
```typescript
streakRev: isCount(x.streakRev) ? x.streakRev : 0,
// add:
// theme: x.theme === 'light' || x.theme === 'dark' ? x.theme : 'system',
// colourBlind: x.colourBlind === true,
// howToPlaySeen: x.howToPlaySeen === true,
```
Export a `Theme = 'system' | 'light' | 'dark'` type here.

---

### `src/state/gameStore.ts` (store)

**Analog:** same file. Every place that mentions `wordubadoInfoSeen` needs the new fields (grep results: lines 118 type, 230 `docFromState`, 269 `mergeDocIntoState`, ~480 initial state, 663 `resetAll`, 742 external-reset branch, 775-797 merge).

**DialogName** (lines 70-71): add `'help'`.
```typescript
export type DialogName =
  'giveUp' | 'newGame' | 'settings' | 'reset' | 'stats' | 'result'
```

**State type**: line 140-142 already has `colourBlind: boolean` (transient, not persisted, initial `false` at ~471). Make it persisted; add `theme`, `howToPlaySeen`, `announcement: {id:number,text:string} | null` (transient), actions `openHelp`, `maybeOpenHelp`, `setTheme`, `setColourBlind`.

**Guard pattern for `openHelp`** (copy `openSettings`, lines 607-618):
```typescript
openSettings() {
  const { dialog, infoOpen, pendingRestore, resultPending } = get()
  if (dialog !== null || infoOpen || pendingRestore !== null || resultPending) {
    return
  }
  set({ dialog: 'settings', settingsFocus: 'close' })
},
```
For `openHelp` also refuse `isBusy(s)` (reveal), then `set({ dialog: 'help', howToPlaySeen: true })` (D-08, same as `autoOpenInfo` line 409 which sets the flag at open).

**`maybeOpenHelp`**: no-op if `howToPlaySeen`, `pendingRestore !== null`, `breakNotice`, `dialog !== null`, `infoOpen`, status `revealing`; else `openHelp()`. Call from `main.tsx` after `checkStreaks()`, and at the end of `dismissBreak` (lines 568-570), `restore()` and `declineRestore()` (line ~560-566).
```typescript
dismissBreak() {
  if (get().breakNotice) set({ breakNotice: false })   // then get().maybeOpenHelp()
},
```
Verify `checkStreaks` sets `pendingRestore`/`breakNotice` synchronously (RESEARCH A5).

**Reset** (`resetAll` 654-686 and external-reset branch 736-763): add `theme: 'system', colourBlind: false, howToPlaySeen: false` next to `wordubadoInfoSeen: false`. Do not clear `announcement` into a stale text; set `announcement: null`.

**Two-tab merge** (lines 775-797). Copy the `seen` OR pattern for `howToPlaySeen`; adopt incoming `theme`/`colourBlind` and flag `changedForMe` only (never `behindThem`):
```typescript
const seen = state.wordubadoInfoSeen || doc.wordubadoInfoSeen
let changedForMe = seen !== state.wordubadoInfoSeen
let behindThem = seen !== doc.wordubadoInfoSeen
...
const base = { boards: merged, wordubadoInfoSeen: seen, stats: mergedStats, ...mergedStreak }
```

**Announcement at `finishReveal`** (lines 1054-1107). The three `set()` branches (won 1065, lost 1092, playing 1100) are where to add `announcement: { id: ++toastSeq-style counter, text: guessAnnouncement(...) }` composed by the pure `announce.ts`. Give Up path (`giveUp()`) gets its own line. Do not touch `typeLetter/backspace/switchBoard`.

**Persist config** (1118-1130): `partialize: docFromState`, `merge: mergeDocIntoState`, `migrate` intentionally throws. Do not change; just extend `docFromState`/`mergeDocIntoState`.

---

### `src/state/appearance.ts` (boot service, event-driven)

**Analog:** `src/state/streakWatch.ts` (exact: started-once module, injectable deps, returns stop).

**Excerpt to copy** (lines 5-21, 40-52):
```typescript
let started = false
let stop: (() => void) | null = null
type WatchStore = Pick<StoreApi<GameState>, 'getState'>

export function startStreakWatch(store: WatchStore, target: Window = window, doc: Document = document, ...): () => void {
  if (started && stop) return stop
  ...
  started = true
  stop = () => { /* removeEventListener ...; */ started = false; stop = null }
  return stop
}
```
Adapt: store type needs `subscribe` too (`Pick<StoreApi<GameState>, 'getState' | 'subscribe'>`). Body per RESEARCH "applyAppearance / startAppearance" (sets `root.dataset.theme`, `root.dataset.palette`, `theme-color` meta; `matchMedia` listener only acts when theme is `system`). Inject `win`/`root` for tests.

---

### `src/logic/announce.ts` (utility, pure transform)

**Analog:** `src/logic/share.ts` (pure builder taking `colourBlind`, unit tested without React). Planner: read `share.ts` head for the export style; copy its pure-function plus colocated `*.test.ts` layout. Exports `guessAnnouncement(word, states, triesLeft)`, `resultAnnouncement(kind, word, n)`. Copy strings from `copy.ts` (UI-SPEC Copywriting table; singular "1 try left").

---

### `src/components/HowToPlayModal.tsx` (component)

**Analog:** `src/components/WordubadoInfo.tsx` (whole file, lines 1-39).
```tsx
import { INFO_BODY, INFO_GOT_IT, INFO_HEADING } from '../state/copy'
import { useGameStore } from '../state/gameStore'
import Modal from './Modal'

export default function WordubadoInfo() {
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
}
```
Changes: `open = s.dialog === 'help'`, `onClose = closeDialog`, `fallbackFocus` -> `.help-button` (copy the `?? document.body` form from `SettingsModal.tsx` lines 24-26). Example rows: `<div role="img" aria-label=...>` containing `.tile` elements with `data-state` (see `Tile.tsx` lines 24-40 for the `.tile`/`data-state` markup; do not reuse `Tile` itself because it emits `role="gridcell"`).

---

### `src/components/HelpButton.tsx` (component)

**Analog:** `src/components/SettingsButton.tsx` (lines 1-33).
```tsx
<button type="button" className="settings-button" aria-label={SETTINGS}
  aria-haspopup="dialog" data-own-enter onClick={openSettings}>
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">...</svg>
</button>
```
Use `className="help-button"`, `aria-label="How to play"`, "?" path, `onClick={openHelp}`. Disabled styling: copy `StatsButton.tsx` (has `:disabled` CSS at game.css 327).

---

### `src/components/LiveRegion.tsx` (component)

**Analog:** `src/components/Toast.tsx` lines 70-79 (role/aria-live attributes). Always-mounted `<div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{announcement?.text}</div>`; `.visually-hidden` already exists (game.css 442). Mount in `App.tsx` outside any `<Modal>` (e.g. next to `<Toast>` at the bottom).

---

### `src/components/SettingsModal.tsx` (Appearance section)

**Analog:** same file (lines 28-34 insert point: before the `settings-body` note) + `LengthPicker.tsx` + `ModeSwitch.tsx`.

**Radiogroup with roving tabindex and arrow keys** (LengthPicker lines 26-33, 36-61):
```tsx
function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  e.preventDefault()
  const step = e.key === 'ArrowRight' ? 1 : -1
  const next = (index + step + OPTIONS.length) % OPTIONS.length
  change(OPTIONS[next]); refs.current[next]?.focus()
}
<div role="radiogroup" aria-label="Word length" className="length-picker">
  <button type="button" role="radio" aria-checked={value === n}
    tabIndex={value === n ? 0 : -1} className="length-option" ...>
```
Reuse classes `length-picker` / `length-option` (game.css 405-440). Extend keys to Up/Down/Home/End per UI-SPEC. Do NOT copy the `e.detail > 0 -> blur()` line (that exists so physical Enter plays; inside a modal it would drop focus out of the trap).

**Switch** (ModeSwitch lines 13-35): `role="switch" aria-checked`, `.mode-switch*` classes. Do NOT copy the Enter `preventDefault` (game-specific). Buttons only: `Modal` Tab trap queries `button, textarea` (Modal.tsx line 89), so native inputs would escape the trap.

**Existing buttons keep `data-own-enter`** (lines 41, 51) and the `data-initial-focus` toggle on Reset/Close. Selectors for state: `useGameStore((s) => s.theme)`.

---

### `src/components/Header.tsx`

**Analog:** same file lines 27-31. Add `<HelpButton />` as first child of `.header-actions` before `<StreakChip />`? UI-SPEC says order Help, Stats, Settings with the chip kept where it is; CONTEXT D-06 says "first in `.header-actions`". Current DOM: `StreakChip, StatsButton, SettingsButton`. Planner decision: place `HelpButton` immediately before `StatsButton` or before `StreakChip`; D-06 literally = first child.
```tsx
<div className="header-actions">
  <StreakChip />
  <StatsButton />
  <SettingsButton />
</div>
```

---

### `src/main.tsx` (boot)

**Analog:** same file lines 11-19. Add `startAppearance(useGameStore)` and `useGameStore.getState().maybeOpenHelp()` after `checkStreaks()`, outside React (StrictMode rule).
```typescript
useGameStore.getState().checkStreaks()
startStreakWatch(useGameStore)
...
startTabSync(useGameStore)
```

---

### `src/styles/tokens.css` and `src/styles/game.css`

**tokens.css analog:** `[data-mode='wordubado'] { --color-mode: ... }` (lines 41-43) is the override pattern; `:root` block lines 1-39 lists every colour token to redefine (bg, text, muted, accent, surface, error, focus, danger, wordubado, key-pressed, tile-* borders, tile-correct/present/absent, shadows). Add the five blocks in the order from UI-SPEC and the new `--color-overlay` (light value `rgba(43, 45, 51, 0.32)`).

**game.css edits:**
- Backdrop literal (line 814-816): `background: rgba(43, 45, 51, 0.32)` -> `var(--color-overlay)`.
- Add `.help-button` to every `.settings-button, .stats-button` selector list: base 308-309, hover 322-323 (`.help-button:hover:not(:disabled)`), disabled 327, focus-visible 332-333, svg 338-339, min-width 400px block 344-346, and short-viewport block 630 (`.settings-button { width: 36px; height: 36px }`).
- Focus ring pattern everywhere: `outline: 2px solid var(--color-focus); outline-offset: 2px;`
- New modal/example styles follow `.modal-card`/`.modal-heading` (lines 822-834).

---

### `index.html`

**Analog:** itself (13 lines; `<link rel="icon" href="/favicon.svg">`, `<title>`, module script). Add meta/OG/twitter/theme-color, classic inline script before CSS (module script is body-end, CSS is injected by Vite), `<noscript>` in body. Script contents: RESEARCH Pattern 1 (reads `localStorage.getItem('unlimited-wordle')` = `SAVE_KEY`, `.state.theme/.colourBlind`, try/catch). Keep `<title>Unlimited Wordle</title>`.

---

### `scripts/make-assets.mjs`

**Analog:** `scripts/check-bundle.mjs` / `scripts/build-words.mjs` (plain ESM node scripts, no deps). Use `import { chromium } from '@playwright/test'` per RESEARCH Pattern 8; SVG sources in `scripts/assets/`.

---

### Tests

- **`src/state/appearance.test.ts`**: analog `src/state/streakWatch.test.ts` (injected window/doc doubles, assert listeners removed on stop).
- **Save/two-tab/storage unit tests**: extend `src/logic/save.test.ts` (imports at lines 1-26, `V1_FIXTURE` + `migrateSave` v1 test is the template for a v2 fixture test), `src/state/twoTabs.test.ts` (uses `createGameStore`, `saveEnvelope`, `v2Save` from `src/test/storageDoubles.ts`; add a `v3Save` helper or update `v2Save`). `SAVE_VERSION` imports there will change expectations.
- **`LiveRegion.test.tsx`**: analog `Toast.test.tsx`; **`announce.test.ts`**: analog `share.test.ts`.
- **E2E specs**: analog `e2e/settings.spec.ts` (structure: `test.use({ reducedMotion: 'reduce' })`, `beforeEach` with `fixAnswers`, `goto('/')`, `waitForReady`; focus-return assertions at lines 28-31):
```typescript
await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
await page.keyboard.press('Escape')
await expect(dialog).toBeHidden()
await expect(button).toBeFocused()
```
  axe: `e2e/axe.ts` `expectNoA11yViolations(page, include?)` waits for animations then runs WCAG 2 A/AA; `nonTextContrast(locator)`. Dark via `page.emulateMedia({ colorScheme: 'dark' })`; colour-blind by `seedSave` with `colourBlind: true`.
- **`e2e/helpers.ts`**: `fixAnswers`/`fixAnswersWith` (lines 6-26) use `addInitScript` to set `globalThis.__WORDLE_TEST__ = { answers }`. Add `skipHelp: true` default there and read it in `testHook.ts` (gated by `import.meta.env.MODE` like `readTestAnswer`, lines 9-10). Also `defaultV2State`/`seedSave` (106-157) write `{ version: 2, state }`: bump to v3 fields (or keep v2 and rely on migration; planner choose, but add a v2-seed test for the existing-player-sees-help-once case). `e2e/storage.spec.ts:90` newer-build fixture `"version":3` must become 4.
- Known e2e fragility: tests that press keys immediately after `goto` and `tabs.spec.ts`/`persistence.spec.ts` asserting raw saved JSON shape.

## Shared Patterns

### One-shot effects live in store actions or boot code, not React effects
**Source:** `src/main.tsx` 11-19, `streakWatch.ts` 16-18 (started-once guard).
**Apply to:** `startAppearance`, `maybeOpenHelp`, announcements (StrictMode double-invoke).

### Dialog guard
**Source:** `gameStore.ts` `openSettings` 607-618, `isInputBlocked` 179-186, `isBusy` 189-191.
**Apply to:** `openHelp`, `maybeOpenHelp`. Adding `'help'` to `DialogName` makes `dialog !== null` block input automatically.

### Saved flag set at open
**Source:** `gameStore.ts` `autoOpenInfo` 403-411.
**Apply to:** `howToPlaySeen`.

### Modal usage (focus trap, Esc, focus return, buttons-only)
**Source:** `src/components/Modal.tsx` (props 3-12, Tab trap 86-101, `fallbackFocus` 72).
**Apply to:** HowToPlayModal, Appearance controls. Use `data-initial-focus`, `data-own-enter` on modal buttons.

### Colour via tokens only
**Source:** `tokens.css`; `game.css` has one literal colour (backdrop) which must be tokenised.
**Apply to:** all dark/colour-blind CSS. SVG icons use `var(--color-bg)` fill (SettingsButton line 28).

### All UI copy in `src/state/copy.ts`
**Source:** `copy.ts` (e.g. `INFO_HEADING` line 30, `SETTINGS` 43, `RESET_BODY` 51, `CLOSE` 49).
**Apply to:** every new string (UI-SPEC Copywriting table). Update `RESET_BODY`; `e2e/settings.spec.ts:42-44` asserts its old text and must be updated.

### Validation lenient for non-critical fields
**Source:** `save.ts` 477 (`streakRev` coerce).
**Apply to:** `theme`, `colourBlind`, `howToPlaySeen`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Inline pre-paint script in `index.html` | boot script | sync read | No inline/classic scripts exist; use RESEARCH Pattern 1 (verify Vite leaves it untouched in `dist/index.html`) |
| `public/og-image.png`, `apple-touch-icon.png`, new `favicon.svg` | asset | file-I/O | Only the Vite default favicon exists; generate via `scripts/make-assets.mjs` |
| `scripts/meta.test.mjs` | test | file-I/O | No tests for scripts or HTML exist; node-env Vitest reading `index.html` (check `vite.config.ts` `test.include` covers `scripts/`) |
| `e2e/theme.spec.ts` no-flash check | test | e2e | No test blocks JS bundle; use `page.route` per RESEARCH |

## Metadata

**Analog search scope:** `src/components`, `src/state`, `src/logic`, `src/styles`, `e2e`, `scripts`, `index.html`, `public`
**Files scanned:** about 25 read in full or by range (plus `git ls-files` listing)
**Pattern extraction date:** 2026-10-14
