# Phase 4: Six Boards and Persistence - Research

**Researched:** 2026-10-02
**Domain:** Versioned localStorage persistence on a Zustand 5 store, multi-board game state, cross-tab sync, native `<dialog>` modal hardening (React 19 + Vite 8 + TS 6)
**Confidence:** HIGH (zustand persist behaviour verified by reading the installed 5.0.15 source; existing code read in full; browser-event semantics from MDN)

## User Constraints (from CONTEXT.md)

### Locked Decisions

Already locked elsewhere and not re-decided here:
- **SPEC.md §5 (R-BOARD-1..4, R-SAVE-1..6):** Board key is `${mode}-${len}` and switching never forfeits; refresh saves submitted guesses only (half-typed row discarded); a finished Board shows grid, result banner and Play again; saved data is one versioned document with a migration chain from the first release; corrupt data is backed up under main key plus `:corrupt` and app starts fresh; blocked or full storage falls back to in-memory for the session; tabs sync through the `storage` event; Settings has the reset and the browser-only note.
- **SPEC.md §6 (R-FORFEIT-1..6):** Give Up / New game allowed only when `attemptsUsed === maxAttempts - 2`; both ask for confirmation and count as a loss; New game and Play again always available once finished; a fresh Board cannot be abandoned.
- **Phase 3 decisions:** D-08 first visit defaults to Normal; D-10 the "End this game?" switch confirm is a stopgap this phase removes; D-13/D-14 each header button appears when its screen exists (Settings lands here); the Phase 3 `Modal` (native `<dialog>`) is the reusable dialog.

**Give Up and New game**
- **D-01:** Give Up and New game sit in a small, quiet row of text buttons under the grid, between grid and keyboard. Layout must still fit 320x500 with no vertical scroll (existing `e2e/layout.spec.ts`).
- **D-02:** Row hidden unless exactly 2 tries are left. No disabled/greyed buttons. Once finished, Play again covers New game, so the row does not show then either.
- **D-03:** After a confirmed Give Up: same finished state as a normal loss; answer revealed in result banner with Play again; banner says "You gave up" instead of out-of-tries wording; no fake row added to the grid.
- **D-04:** Give Up confirm mirrors New game confirm: "This counts as a loss. Reveal the answer?" with "Keep playing" / "Give up". New game: "This counts as a loss. Start a new game?" with "Keep playing" / "New game". Both use shared `Modal`.
- **D-05:** The Phase 3 "End this game?" switch confirm is removed. The `pendingSwitch`/`confirmSwitch`/`cancelSwitch` path and `SwitchConfirm` go away or are repurposed, tests updated.

**Settings**
- **D-06:** Settings opens as a modal dialog on the Phase 3 `Modal`. Settings button in the reserved `.header-actions` slot.
- **D-07:** Settings contains only "Reset my data" and the browser-only note (final copy in UI spec). No theme/colour-blind options yet.
- **D-08:** Reset uses one confirm dialog with a destructive-styled Reset button; "Cancel" / "Reset"; no typed confirmation.
- **D-09:** After a reset the app behaves like a first visit: Settings closes; all six Boards and saved flags cleared (including "Wordubado popup seen"); new Normal 5-letter game starts; toast "All data reset".

**Board memory and hints**
- **D-10:** On return the app opens the last Board the player played (saved last active mode+length). First visit stays Normal 5.
- **D-11:** "Wordubado popup seen" flag is saved. Popup auto-opens on the very first switch to Wordubado ever; (i) still opens it any time; reset clears the flag. Replaces Phase 3's in-memory `infoSeen`.
- **D-12:** Length picker shows a small dot on lengths with an unfinished game in the current mode, with a screen-reader label like "6 letters, game in progress". Finished or never-started Board shows no dot. The mode switch gets no dot.
- **D-13:** Switching to a Board with no saved game starts a new game right away. No Start screen.

**Carried-over fixes (must land in this phase)**
- **D-14:** Phase 3 WR-03: `Modal` must also handle the native `close` event (browser closes dialog without `cancel`: Esc without recent user activation, Android back gesture), otherwise the store thinks it is open and all keys are ignored.
- **D-15:** Phase 2 WR-03: on chunk-load retry `wordData.ts` reloads the page, no longer safe now that progress is saved. A failed retry must never lose saved data or hang (e.g. only reload when `navigator.onLine` is true; otherwise keep the error UI).
- **D-16:** Phase 2 WR-04: reveal timers must be tied to the game through a token so a reset, Board switch or restore during a reveal cannot let a stale timer finish the wrong game.

### Claude's Discretion
- **Storage-trouble feedback** (corrupt data backed up and reset, blocked/full storage, another tab changing the active Board): UI spec decides toast / quiet note / nothing; calm and non-blocking; game always playable. (Decided in 04-UI-SPEC.md "Storage-trouble feedback".)
- **Two-tab conflicts on the same Board:** choose a simple, safe rule, e.g. "last write wins and the other tab reloads that Board's state". Do not lose submitted guesses, do not double-count a finished game (Phase 5 stats depend on this).
- **Schema shape:** fields per-Board saved games (answer, submitted rows, status, outcome incl. give-up/forfeit), last active Board, "popup seen", `version`. Ready for Phase 5's `dayStreak`, `restores`, `pendingRestore`, per-Board `winStreak` through a migration. Storage key name, validation guard style (hand-written guard, no zod) and whether Zustand `persist` is used are left to research/planner, following CLAUDE.md.
- **What a saved finished game stores:** enough to show finished grid, banner (won, lost, gave up or forfeited) and the answer.
- **Banner wording for a forfeit via New game:** New game starts a fresh game right away, forfeited game not shown; recorded as a loss for Phase 5. Give Up banner per D-03.
- **Exact placement/spacing** of the row and dot: set in the Phase 4 UI spec.

### Deferred Ideas (OUT OF SCOPE)
- Version and credits line in Settings (SCOWL/wordlist-english attribution): Phase 7.
- Phase 3 review items not needed here: WR-01/WR-02 (slang-cut tooling), WR-05 (Enter on the (i) button submits; Phase 7), IN-03/IN-04 (slang plurals, flag/definition fixes; before Phase 6).
- Stats, streaks, Restores (Phase 5); result screen, share, definitions (Phase 6); themes, colour-blind palette, help (Phase 7).

## Project Constraints (from CLAUDE.md)

- Stack fixed: React 19 + Vite 8 + TypeScript 6 (`~6.0.3`), Zustand 5 (`persist` with `version` + `migrate` + `partialize`), plain CSS, Vitest 5, Playwright. No new dependency is needed for this phase (no zod; hand-written guard).
- localStorage only; saved data must be versioned so existing players' data survives updates.
- Wrap `JSON.parse`, validate in `migrate`, fall back to fresh state rather than white-screening.
- Wire `visibilitychange`/`storage`-style global listeners once (StrictMode-safe: not in a bare effect without cleanup, preferably outside React like `main.tsx` does for the first game).
- Do game actions in store actions triggered by events, not in effects (StrictMode double-invoke would double-pick an answer / double-count).
- `Math.random` stays injectable (`deps.rng`); E2E stays deterministic through `readTestAnswer`.
- Accessibility: reduced motion, screen readers, keyboard-only. Design: minimal, soft; slang content rules unchanged.
- GSD workflow enforcement: all edits go through a GSD command.
- Glossary terms in code/docs: Board, Mode, Forfeit, Give Up (UI says "game" and "Give up").

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAVE-01 | Six independent Boards, each with own saved game | `boards: Partial<Record<BoardKey, SavedGame>>` in the document; key `${mode}-${len}` (Pattern 1, Schema) |
| SAVE-02 | Switch mode/length without forfeiting | `switchBoard` action snapshots current board then loads target; remove `pendingSwitch` path (Pattern 3) |
| SAVE-03 | Refresh resumes in-progress game; half-typed discarded | Persist submitted guesses at submit time; `current` never persisted; `resume` action loads pool then restores (Pattern 3, Pitfall 3) |
| SAVE-04 | Finished Board shows grid + banner + Play again; new game only on Play again | Saved `outcome` + derived rows; switch to a finished board must NOT call `startGame` (Pattern 3) |
| SAVE-05 | Version number and migration chain from first release | `SAVE_VERSION = 1`, pure `migrateSave` chain table in `src/logic/save.ts` (Schema, Pattern 2) |
| SAVE-06 | Corrupt/hand-edited data never white-screens; backed up; start fresh | Custom `PersistStorage` adapter: parse, envelope check, migrate, guard; on failure copy raw to `${KEY}:corrupt` (Pattern 2, Pitfall 1) |
| SAVE-07 | Works in memory when localStorage unavailable/full | Adapter swallows `getItem/setItem` throws (incl. SecurityError on `localStorage` access), exposes `storageOk` + one-time notice (Pattern 2, Pitfall 2) |
| SAVE-08 | Two tabs stay in sync via `storage` event | Module-level `startTabSync()` listener; per-visible-board compare; echo-loop guard (Pattern 4, Pitfall 5) |
| SAVE-09 | Reset all data from Settings after confirm | `resetAll` action: clear storage + backup key, fresh state, `startGame(5, normal)`, toast (Pattern 5) |
| PLAY-07 | Give Up only when exactly 2 tries left; confirm; reveals answer; loss | Pure `canForfeit(status, attemptsUsed, maxAttempts)`; `giveUp` action sets `outcome: 'gave-up'` (Pattern 6) |
| PLAY-08 | New game mid-game only under same rule; confirm; counts as loss | `forfeitNewGame` action: records loss via single finalize seam, starts fresh game (Pattern 6) |
| UI-11 | Settings note: progress stored in this browser only | Settings modal copy (UI-SPEC); storage-off line driven by `storageOk` |
</phase_requirements>

## Summary

Phase 4 turns a single in-memory game into six independent, persisted Boards. The existing store (`createGameStore(deps)` with injected `rng`, `setTimer`, `loadPools`, `prefersReducedMotion`) holds one active game as flat fields (`mode`, `length`, `answer`, `rows`, `current`, `status`, `keyStates`). The cheapest correct design keeps those flat fields as the live view of the active Board (so Grid, Keyboard, Banner and Header keep reading the same selectors) and adds a `boards` map of saved games plus `infoSeen`, all projected into one versioned document by `partialize`.

Zustand 5.0.15's `persist` is usable but does less than its docs suggest. I read the installed source: (a) it calls `setItem` on EVERY `set()` (every typed letter), and a throwing `setItem` propagates out of the store action; (b) `migrate` runs only when the stored `version` is a number that differs from `options.version`, so hand-edited data at the current version (or a non-numeric version) skips migration and is shallow-merged straight into state with no validation; (c) a `JSON.parse` failure is only caught as a rehydration error, nothing is backed up and the next write overwrites the corrupt text. Therefore the robustness (parse, envelope check, migrate, validate, backup to `:corrupt`, swallow storage errors, dedupe writes) must live in a custom `PersistStorage` adapter plus a custom `merge`; `persist` still supplies `version`, `partialize`, synchronous hydration at store creation (localStorage is sync) and `clearStorage`. This honours CLAUDE.md while closing the gaps.

The riskiest parts are logic, not UI: persisting at submit time (not reveal end) so refresh cannot dodge a loss; never letting a retry/resume call `startGame` on a saved board (it would replace the saved answer); a single "finish game" seam that Phase 5 will extend so a finished game is never counted twice (including via the cross-tab apply path); the `close` event firing after programmatic `dialog.close()` (must be guarded or confirm dialogs double-fire); and echo loops between tabs. Everything is testable in node with an injected fake storage, so the plan can be mostly TDD on pure functions.

**Primary recommendation:** Add a pure `src/logic/save.ts` (schema, `SAVE_VERSION`, `migrateSave`, `validateSave`, `toSaved`/`fromSaved`, `canForfeit`, `resolveOutcome`), a `src/state/storage.ts` safe storage adapter (injected as `deps.storage`), wire Zustand `persist` with that adapter + custom `merge`, make the store Board-aware with `resume`/`switchBoard`/`giveUp`/`forfeitNewGame`/`resetAll`, and fix Modal `close`, `wordData` retry and reveal tokens in the same phase.

## Architectural Responsibility Map

All client-side; the site is a static SPA with no server (CLAUDE.md).

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Saved-data schema, migration chain, validation | Browser logic (pure `src/logic/save.ts`) | — | Pure functions, node-testable, no DOM |
| Storage I/O, corrupt backup, fallback, error swallowing | Browser storage adapter (`src/state/storage.ts`) | — | Only place that touches `localStorage`; injectable for tests |
| Board map, active-Board view, resume/switch/forfeit/reset actions | Zustand store (`gameStore.ts`) | — | Actions callable outside React (keydown, storage event) |
| Cross-tab sync | Browser event (`window` `storage`) wired once at module/`main.tsx` level | Store `applyExternal` action | Event is outside React; StrictMode-safe |
| Confirm dialogs, Settings, Modal `close` fix | React components on native `<dialog>` | Store open/close flags | Existing Modal pattern |
| Pool loading / chunk retry | `src/data/wordData.ts` | Store (`loadToken`) | Lazy per-length chunks; D-15 fix lives here |
| Forfeit row, in-progress dot, gave-up banner | React components | Store selectors | Presentational; rules computed by pure `canForfeit` |

## Standard Stack

No new packages. Everything below is already in `package.json`.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.15 (installed, verified in node_modules) | Store + `persist` middleware (`version`, `partialize`, `merge`, custom `storage`) | CLAUDE.md choice; sync hydration with sync storage |
| react / react-dom | 19.2.x | UI; `<dialog onClose>` supported | existing |
| vitest | 5.0.3 | Unit tests; node env for `src/logic` and `src/state`, `// @vitest-environment jsdom` for components | existing |
| @testing-library/react | 16.3.x | Component tests | existing |
| @playwright/test | 1.63.0 | E2E against `build:e2e` + preview | existing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `persist` + custom adapter/merge | Hand-rolled `store.subscribe` writer | Equally small; but CLAUDE.md names `persist`. Planner may choose it if the adapter/merge fight with `persist` proves awkward. Recommendation stays `persist`. |
| Whole-document last-write-wins | Per-board three-way merge on write | Prevents the narrow race where two tabs write different boards inside the event latency window. Over-engineered here; accepted risk (see Pattern 4). |
| zod for the guard | Hand-written guard | Locked by CLAUDE.md / CONTEXT: hand-written. |

**Installation:** none.

## Package Legitimacy Audit

No external packages are installed in this phase. slopcheck not run (nothing to check). All recommended libraries are already installed project dependencies.

**Packages removed due to slopcheck verdict:** none. **Packages flagged suspicious:** none.

## Architecture Patterns

### System Architecture Diagram

```
 page load (main.tsx, outside React)
   |
   v
 createGameStore(deps{storage,rng,setTimer,loadPools,...})
   |  persist hydrate (SYNC)
   |     storage.getItem(KEY) --> parse --> envelope? --> migrateSave(chain) --> validateSave
   |         |  empty ............................ fresh doc (first visit)
   |         |  invalid/unparsable/newer version . copy raw to KEY:corrupt, fresh doc, boot notice 'corrupt'
   |         |  storage throws ................... in-memory, storageOk=false, boot notice 'storage'
   |         v
   |     custom merge(doc, current): boards, last{mode,length}, infoSeen -> flat active-board view
   v
 main.tsx: store.resume()  (NOT startGame)   + startTabSync(store)   + show boot toast
   |
   v
 resume(): board saved?  --yes--> loadPools(len) --> restore view from saved (rows rescored, keyStates derived,
   |                                                status from saved outcome)  [pool failure => status 'error', saved game kept]
   |       --no---> startGame(len, mode) --> pick answer --> write board
   v
 PLAY ----------------------------------------------------------------+
  typeLetter/backspace: in-memory only (no write needed; dedupe skips)  |
  submit: append row, resolveOutcome NOW, persist (write via set),      |
          UI status 'revealing' -> timer(token) -> finishReveal         |
  switchBoard(mode,len): snapshot active -> boards[key]; load target:   |
          saved => restore (finished stays finished); none => startGame |
  giveUp / forfeitNewGame (only canForfeit) --> finishGame seam --------+--> Phase 5 hooks stats here
  resetAll: clear KEY + KEY:corrupt, fresh state, startGame(5,normal), toast
   |
 every set() --> persist.setItem --> adapter: serialize(partialize(state)); skip if === lastRaw; try write; on throw storageOk=false (+ one-time toast)
   |
 window 'storage' event (other tabs only) --> startTabSync handler --> adapter.read (same validate path)
        --> replace boards map; if visible Board differs: replace view (drop half-typed), toast "Updated from your other tab."
        (defer while 'revealing'; never re-finish a game; set lastRaw to e.newValue to avoid echo)
```

### Recommended Project Structure
```
src/
├── logic/
│   ├── save.ts            # NEW pure: SAVE_VERSION, types, migrateSave, validateSave, toSaved/fromSaved, resolveOutcome, canForfeit, boardKey
│   └── save.test.ts       # NEW node tests (migration chain, guard, tampering table)
├── state/
│   ├── storage.ts         # NEW safe adapter (PersistStorage), memory fallback, corrupt backup, boot notices
│   ├── storage.test.ts    # NEW fake/throwing storage tests
│   ├── gameStore.ts       # MODIFIED: boards, resume, switchBoard, giveUp, forfeitNewGame, resetAll, applyExternal, tokens, persist wiring
│   ├── sync.ts            # NEW startTabSync(store, storageArea) idempotent, returns unsubscribe
│   └── copy.ts            # MODIFIED: new copy constants; remove switch-confirm copy
├── components/
│   ├── Modal.tsx          # MODIFIED: native close event (guarded)
│   ├── ForfeitRow.tsx, GiveUpConfirm.tsx, NewGameConfirm.tsx, SettingsModal.tsx, ResetConfirm.tsx, SettingsButton.tsx  # NEW
│   ├── Banner.tsx         # MODIFIED: 'gave-up' variant, focus only when finished in-session
│   ├── LengthPicker.tsx   # MODIFIED: in-progress dot + label
│   └── SwitchConfirm.tsx  # DELETED (+ its test)
└── data/wordData.ts       # MODIFIED: D-15 retry
```

### Schema (recommendation; Claude's discretion area)

Storage key: `unlimited-wordle` (backup `unlimited-wordle:corrupt`). The key never changes with version; the version lives inside the `persist` envelope `{ state, version }`.

```ts
// src/logic/save.ts
export const SAVE_VERSION = 1
export type BoardKey = `${Mode}-${WordLength}`            // 'normal-5' ...
export type Outcome = 'playing' | 'won' | 'lost' | 'gave-up'   // 'forfeit' is never stored (see below)
export type SavedGame = {
  answer: string            // lowercase, /^[a-z]+$/, length === board length
  guesses: string[]         // submitted rows only, each length === board length, count <= attempts
  outcome: Outcome
}
export type SaveDoc = {
  boards: Partial<Record<BoardKey, SavedGame>>
  last: { mode: Mode; length: WordLength }   // last active Board (D-10)
  wordubadoInfoSeen: boolean                 // D-11
  // Phase 5 adds dayStreak, restores, pendingRestore and boards[k].winStreak via migration v1 -> v2
}
```

Design notes:
- Do NOT store row `states`, `keyStates`, `status: 'revealing'/'loading'/'error'`, `current`, or `toast`. Rows are rescored with the existing `score(answer, guess)` and key colours rebuilt with `applyGuessToKeys` on restore. Less data, smaller tamper surface, no inconsistency to validate.
- `outcome` is computed by a pure `resolveOutcome(answer, guesses, attempts)` at SUBMIT time (win if last guess equals answer; lost if guesses.length >= attempts and not won; else playing), then persisted immediately, while the UI `status` stays `'revealing'` until the reveal timer ends. A refresh mid-reveal then restores a finished game with no flip and cannot be used to dodge a loss. `[ASSUMED]` that owner is fine with "refresh during reveal shows the result immediately" (it is the safe, consistent choice).
- Forfeit via New game: the game is replaced immediately, so no `'forfeit'` outcome is persisted. It is a `finishGame(boardKey, 'forfeit')` event in the store (Phase 5 turns it into stats). Give Up persists `'gave-up'` so the banner/answer can be restored (D-03).
- Guard must verify: `typeof` and shape of every field; `answer`/`guesses` charset and lengths; `guesses.length <= BOARD_CONFIG[len].attempts`; consistency (`won` => last guess === answer; `lost` => guesses.length === attempts and none equals answer; `playing` => guesses.length < attempts and none equals answer; `gave-up` => guesses.length === attempts - 2 exactly is NOT required, just `< attempts` and none equals answer); `last` is one of the 6 valid combos; unknown extra keys are dropped (rebuild objects explicitly, fixed key order). Invalid single board vs. invalid whole doc: recommend whole-doc rejection (backup + fresh) for simplicity, as SPEC says "starts fresh".
- Do not validate the answer against the word pool (pools load lazily and word lists get regenerated between deploys). Instead make `submit` accept `current === answer` even if `pools.guesses` lacks it (Pitfall 6).

### Pattern 1: Active-Board view over a `boards` map
**What:** Keep flat `mode/length/answer/rows/current/status/keyStates` as the live view of the active Board; `boards` stores saved snapshots of all six; `partialize` writes `boards[activeKey] = toSaved(view)` over the stored entries (only when the active board has a started game, i.e. `answer !== ''` and status not `loading`/`error` for a never-started board).
**When:** always; it avoids touching Grid/Keyboard/Header reads.
**Example:**
```ts
// Source: zustand 5.0.15 persist source (node_modules/zustand/esm/middleware.mjs) + project code
persist(creator, {
  name: 'unlimited-wordle',
  version: SAVE_VERSION,
  storage: deps.storage,               // custom PersistStorage<SaveDoc> (Pattern 2)
  partialize: (s): SaveDoc => docFromState(s),
  merge: (persisted, current) => mergeDocIntoState(persisted as SaveDoc | undefined, current),
  migrate: (p, v) => migrateSave(p, v), // safety net; adapter already migrates (see Pattern 2)
})
```
`mergeDocIntoState` must NOT trust `persisted` blindly: treat `undefined` as first visit (default Normal 5, empty boards) and set `status: 'loading'` (the pool for the restored board has not loaded yet).

### Pattern 2: Custom `PersistStorage` adapter doing the real robustness
**What:** `createSaveStorage(getArea: () => Storage | null)` returns a `PersistStorage<SaveDoc>`:
- `getItem(name)`: `try { raw = area.getItem(name) } catch { storageOk=false; notice 'storage'; return null }`. `raw === null` => first visit. Else `loadSave(raw)` (pure): `JSON.parse` in try, envelope check (`object`, integer `version >= 1`, `state` object), `version > SAVE_VERSION` => treat as unreadable (data from a newer build; backup and start fresh), `migrateSave(state, version)` chain, `validateSave`. On any failure: `try { area.setItem(name + ':corrupt', raw) } catch {}`, notice `'corrupt'`, return `null`. On success return `{ state: doc, version: SAVE_VERSION }` so `persist` sees no version mismatch.
- `setItem(name, value)`: `raw = JSON.stringify(value)`; `if (raw === lastRaw) return`; `try { area.setItem(name, raw); lastRaw = raw; storageOk = true } catch { storageOk = false; notice once 'storage' }`. NEVER throw (a throw escapes `set()` and breaks the typing/submit action).
- `removeItem(name)`: try/catch; also removes `name + ':corrupt'` on reset (privacy; `[ASSUMED]` owner agrees the backup should also go on "Reset my data").
- Getting the area: `try { return globalThis.localStorage } catch { return null }` because merely reading `window.localStorage` can throw `SecurityError` when storage is blocked. In node/test default env `globalThis.localStorage` is undefined => fallback to in-memory (no persistence), which is what existing unit tests want.
- Expose `readSnapshot()`, `getStatus(): { ok: boolean }`, `consumeBootNotices()` for the store/`main.tsx`.
**Why the migrate option still exists:** keeps CLAUDE.md's `version` + `migrate` + `partialize` triple; the adapter has already migrated, so it is only a defensive net.
**Migration chain shape:**
```ts
const MIGRATIONS: Record<number, (s: unknown) => unknown> = {
  // 1: v1 -> v2 added in Phase 5 (adds dayStreak/restores/pendingRestore, boards[k].winStreak: 0)
}
export function migrateSave(state: unknown, from: number): unknown {
  let s = state
  for (let v = from; v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v]
    if (!step) throw new Error(`no migration from v${v}`)
    s = step(s)
  }
  return s
}
```
Add a Phase-4 test fixture constant `V1_FIXTURE` (a literal v1 document) that Phase 5's migration test can feed through the chain (this is the point of "chain starts at the first release").

### Pattern 3: Board-aware store actions
- `resume()` (replaces `main.tsx`'s `startGame(5)`): loads the pool for `length` (`loadToken` bump), then if `boards[key]` exists restore view from it (`rows = guesses.map(g => ({letters:g, states: score(answer,g)}))`, `keyStates` folded over rows, `status = outcome === 'playing' ? 'playing' : outcome`), else pick an answer exactly as `startGame` does. Restores never animate (UI-SPEC): the Grid must not flip rows that mount already scored. Check how `Grid`/`Tile` decide to animate (likely by `status === 'revealing'` and last row); a restored `'playing'` or finished status already avoids it, but add a test.
- `switchBoard({mode?, length?})` (replaces `requestSwitch`/`pendingSwitch`): no-op while `revealing` or if same Board (unless `status === 'error'`); snapshot active view into `boards[oldKey]`; set `mode/length`; if `boards[newKey]` exists restore it (needs pool: set `status:'loading'` until `loadPools` resolves, with the token check), else `startGame`. `autoOpenInfo` uses persisted `wordubadoInfoSeen`.
- `startGame(length, mode)` remains "start a NEW game on that Board, overwrite" and is called ONLY from: first visit, Play again, New game confirm, reset, switch to an empty Board. It must not be reachable from `retryLoad` for a Board that has a saved game.
- `retryLoad()` must call `resume()`-style logic: if `boards[key]` exists, reload pool and restore the SAME game; else `startGame`. (Today `retryLoad` calls `startGame`, which would silently replace a saved in-progress game after one failed chunk load. This is a progress-loss bug the phase must avoid.)
- Do not persist an empty/`loading` placeholder: write the Board only once the answer is picked. A failed pool load must leave `boards[key]` untouched.
- `playAgain()` only when finished: `startGame` on same Board, overwriting the finished saved game.
- Token (D-16): rename/reuse `loadToken` as `gameToken`; bump it in `startGame`, `resume`, `switchBoard`, `resetAll`, `applyExternal`. `submit` captures `const t = get().loadToken` and the timer callback runs `if (get().loadToken === t) get().finishReveal()`. Add a test that bumps the token mid-reveal and asserts the stale timer does nothing.
- Dialog flags: `infoOpen` exists; add `dialog: null | 'settings' | 'reset' | 'giveUp' | 'newGame'` (single field enforces "one dialog at a time") instead of one boolean per dialog, and replace every `pendingSwitch !== null` check in `typeLetter`/`backspace`/`submit`/`usePhysicalKeyboard` with a single `dialog !== null || infoOpen` helper.

### Pattern 4: Tab sync
```ts
// src/state/sync.ts  (called once from main.tsx, never from a component effect)
let started = false
export function startTabSync(store, area = getArea(), key = 'unlimited-wordle') {
  if (started) return () => {}
  started = true
  const onStorage = (e: StorageEvent) => {
    if (e.storageArea !== area) return
    if (e.key !== null && e.key !== key) return   // e.key === null => clear() was called
    store.getState().applyExternal(e.newValue)    // newValue === null => removed (other tab reset)
  }
  window.addEventListener('storage', onStorage)
  return () => { started = false; window.removeEventListener('storage', onStorage) }
}
```
- The event fires only in OTHER tabs of the same origin, never in the tab that wrote [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/storage_event]. `key === null` on `clear()` and `newValue === null` on `removeItem` follow the HTML spec `[ASSUMED]` (not shown on the MDN page fetched); the handler treats both as "doc is empty".
- `applyExternal(raw)`: parse through the SAME `loadSave` path (invalid => ignore silently, do not back up from a sync event, do not reset); set `lastRaw = raw` in the adapter before touching state (echo guard); replace the whole `boards` map and `wordubadoInfoSeen`; compare the VISIBLE Board's saved game with the in-memory view (`answer`, `guesses`, `outcome`); if different, replace the view from storage (drop `current`), toast "Updated from your other tab." (UI-SPEC); if the visible Board is missing from the new doc (other tab reset), run the "no saved game" path (`startGame`) and toast the same text; if the visible board is unchanged, stay silent; do not follow the other tab's `last` pointer. If `status === 'revealing'`, stash the raw string in a `pendingExternal` and apply it in `finishReveal`. Dialogs stay open; data applies underneath.
- Never double-count: `applyExternal` sets `outcome`/`status` directly from the saved game and MUST NOT call `finishGame` (the single seam where Phase 5 will increment stats). Document this in the code and test it with a spy on the seam.
- Race accepted: whole-document last-write-wins means two tabs writing different Boards within event latency can lose one write. Because `applyExternal` always replaces the full `boards` map, the windows is milliseconds. Recorded as an accepted limitation, not mitigated.

### Pattern 5: Reset
`resetAll()`: bump token; `persist.clearStorage()` (bumps hydration version and calls `removeItem`, which also removes the backup key); set fresh state (`boards: {}`, `wordubadoInfoSeen: false`, `mode:'normal'`, `length: 5`, `dialog:null`, `infoOpen:false`); `startGame(5,'normal')`; toast "All data reset" (`startGame` currently does `toast: null`; set the toast after calling it, or make `startGame` not clear toasts). Other tabs receive `newValue === null` then the new doc; both handled by `applyExternal`.

### Pattern 6: Give Up / New game
- Pure `canForfeit(status, attemptsUsed, maxAttempts) => status === 'playing' && attemptsUsed === maxAttempts - 2` (R-FORFEIT-1/2/6). Use the SAME function for row visibility and for guarding the store actions (a store action must re-check, a stale click or second tab must not forfeit a fresh Board).
- `giveUp()`: guard `canForfeit`; token bump not needed; set `status: 'gave-up'`, `outcome: 'gave-up'`, persist; no row added; `finishGame(key,'gave-up')` seam. `GameStatus` gains `'gave-up'`; `Banner` `status` prop gains it; `App.tsx` branch `status === 'won' || 'lost' || 'gave-up'`; Grid's `status` checks must treat `gave-up` like `lost` (audit every `status ===` usage; TypeScript exhaustiveness will find most).
- `forfeitNewGame()`: guard `canForfeit`; `finishGame(key,'forfeit')`; then `startGame(length, mode)`.
- The single seam: `function finishGame(key: BoardKey, outcome: 'won'|'lost'|'gave-up'|'forfeit')` called from `finishReveal` paths... NOTE: since `outcome` is decided at submit time, call the seam at submit time (that is the moment the game becomes finished and is persisted), not in `finishReveal`. Phase 5 adds streak/day updates inside the same `set` so stats and board persist in one write.

### Pattern 7: Modal `close` event (D-14)
```tsx
// Modal.tsx additions
const openRef = useRef(open); useEffect(() => { openRef.current = open })
<dialog ... onClose={() => { if (openRef.current) onClose() }} ...>
```
`close` also fires after the PROGRAMMATIC `dialog.close()` inside `finish()` [CITED: developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close_event]; at that moment `open` prop is already false, so the guard `openRef.current` prevents a second `onClose` (which for the confirm dialogs would double-cancel and, for Reset to Settings chaining, could reopen the wrong dialog). A native close with the prop still `true` calls the store's close handler once. Test: stubDialog needs `close()` to dispatch a `close` Event (extend `src/test/stubDialog.ts`), plus a test that dispatches `close` on an open dialog and expects `onClose` once, and a test that closing via prop does NOT call `onClose`.
Also add the missing WR-04 test (animated close path) since the guard touches it.

### Pattern 8: wordData retry (D-15)
```ts
if (failed.has(length)) {
  if (globalThis.navigator?.onLine !== false) {
    globalThis.location.reload()   // saved data is flushed synchronously on every set, so nothing is lost
    return new Promise<Pools>((_, reject) => setTimeout(() => reject(new Error('reload blocked')), 3000))
  }
  return Promise.reject(new Error('offline'))
}
```
Reload only when `navigator.onLine` is not `false`; offline: reject so the existing error UI stays. After calling `reload()` return a promise that REJECTS after a short delay (reload failed/blocked) instead of a never-resolving one, so the UI cannot hang in `loading`. Nothing is lost on reload because the persist adapter writes synchronously on each `set`; only the half-typed row is dropped (acceptable per R-BOARD-3). `onLine === true` does not guarantee connectivity; the 3 s reject covers it. Update `wordData.test.ts` (currently tests reload).

### Anti-Patterns to Avoid
- **`startGame` as "load":** it overwrites. Restore must go through `resume`/`switchBoard`.
- **Persisting in effects or components:** write only through `set()` in store actions.
- **Trusting `persist`'s default hydration:** same-version garbage is merged unvalidated; always go through the adapter + guard.
- **`window.localStorage` at module top level without try/catch:** throws `SecurityError` when blocked.
- **Storing derived data (`states`, `keyStates`, `status: revealing`).**
- **Following the other tab's `last` pointer on `storage` events** (would flip the visible Board; UI-SPEC says no).
- **Calling `rehydrate()` from the storage handler:** it replaces the whole active view including half-typed text and ignores the "compare visible Board only" rule; use `applyExternal`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Versioned persistence plumbing | Own subscribe/serialize/version envelope | zustand `persist` (`version`, `partialize`, custom `storage`, `merge`) | CLAUDE.md; envelope + sync hydration + `clearStorage` are free |
| Dialog focus trap, Esc, scrim, focus return | New dialog component | Existing `Modal` (+ close fix) | Already tested; adding Give Up/New game/Settings/Reset must reuse it |
| Row scoring on restore | Persisting `states` | `score(answer, guess)` from `src/logic/score.ts` | Single source of truth for repeated-letter rules (core value) |
| Key colours on restore | Persisting `keyStates` | fold `applyGuessToKeys` over rows | Same reason |
| Date/streak math | Anything | Out of scope (Phase 5) | n/a |
| Schema validation lib | zod | small hand-written guard in `save.ts` | locked decision |

**Key insight:** the persisted document should hold only irreducible facts (answer, submitted guess strings, outcome, pointers/flags). Everything displayed is recomputed, so corrupt or hand-edited data can only be wrong in ways the guard can fully check.

## Runtime State Inventory

Not a rename phase, but it introduces the first persistent runtime state and removes in-memory state:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None exists yet (no persistence before this phase; verified: grep for localStorage in `src/` finds none in code read) | Create key `unlimited-wordle` (+ `:corrupt`); define migration chain from v1 |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `dist/`, `playwright-report/`, `test-results/` exist locally and are stale after UI changes | Rebuild via `npm run build:e2e` (the Playwright `webServer` already does) |

In-memory removals: `infoSeen` closure variable (replaced by persisted `wordubadoInfoSeen`), `pendingSwitch` state/actions, `SwitchConfirm` + its test, copy `CONFIRM_HEADING/CONFIRM_START/switchConfirmBody` (UI-SPEC: Phase 3 confirm copy must not appear anywhere; keep `CONFIRM_KEEP`).

## Common Pitfalls

### Pitfall 1: Same-version corrupt data is merged unvalidated
**What goes wrong:** `persist` calls `migrate` only on a version mismatch; a hand-edited doc with `version: 1` (or `version: "x"`) is shallow-merged into state; `JSON.parse` errors are swallowed with no backup, then the next `set` overwrites the evidence.
**Why:** verified in installed zustand source (`middleware.mjs` hydrate: `typeof version === "number" && version !== options.version`).
**Avoid:** adapter does parse+envelope+migrate+guard and backs up; `merge` re-checks shape defensively.
**Warning signs:** a test that writes `{"state":{"boards":"x"},"version":1}` and expects a working fresh game plus `:corrupt` populated.

### Pitfall 2: `setItem` throws out of the store action
**What goes wrong:** `persist` wraps `set` so a quota/security error from `setItem` propagates; typing or submit breaks.
**Avoid:** adapter never throws; track `storageOk`; one-time toast.
**Warning signs:** test with a storage whose `setItem` throws `QuotaExceededError` must still complete a full game.

### Pitfall 3: Writing on every keystroke / losing guesses on refresh
**What goes wrong:** `persist` writes on every `set` (including `typeLetter`). Harmless but wasteful; worse, half-typed text would persist if included.
**Avoid:** `partialize` excludes `current`; adapter skips identical serialized strings; persist the submitted row at submit time (before reveal timer), not at reveal end.

### Pitfall 4: Retry/resume replaces a saved game
**What goes wrong:** `retryLoad -> startGame` after a failed chunk load picks a new answer and overwrites the saved in-progress game.
**Avoid:** Pattern 3 (`retryLoad` resumes). Write a test: saved Board + `loadPools` rejecting once then resolving => same answer and rows after retry.

### Pitfall 5: Tab echo loops and stale overwrite
**What goes wrong:** applying an external doc triggers `persist`'s write; if the re-serialised string differs byte-for-byte, the other tab gets a `storage` event, re-applies, writes again, ad infinitum.
**Avoid:** adapter `lastRaw` dedupe; set `lastRaw = e.newValue` before applying; build documents with explicit fixed key order in `docFromState`/guard output.

### Pitfall 6: Saved answer not in the current word list
**What goes wrong:** word data is regenerated between deploys; a saved answer (or slang answer) may no longer be in `pools.guesses`, so the player could not enter the winning word ("Not in word list").
**Avoid:** `submit` accepts `current === answer` regardless of pool membership; do not validate answers against pools in the guard.

### Pitfall 7: Modal `close` fires after programmatic close
**What goes wrong:** handling `close` naively calls `onClose` twice (once from the click handler, once from the event).
**Avoid:** Pattern 7 guard with `openRef`.

### Pitfall 8: Startup toast wiped
**What goes wrong:** `startGame`/`resume` set `toast: null`; the corrupt/storage startup toast disappears immediately.
**Avoid:** show boot notices after `resume()` starts (or do not clear toast in `resume`); `Toast` gains `lifeMs` (UI-SPEC).

### Pitfall 9: Banner steals focus on restore
**What goes wrong:** `Banner`'s mount effect always focuses "Play again". Restoring a finished Board on load would jump focus (UI-SPEC forbids).
**Avoid:** pass `autoFocus` (true only when the game finished in this session, e.g. store flag `finishedInSession`/set when `finishReveal` or `giveUp` runs, cleared on any board load).

### Pitfall 10: Existing tests tied to the default singleton store
**What goes wrong:** `useGameStore = createGameStore(defaultDeps)` hydrates from the real/jsdom `localStorage` at import; `App.test.tsx` resets with `useGameStore.setState({pendingSwitch:null,...})` and `startGame` — state would leak between tests via jsdom localStorage, and `pendingSwitch` no longer exists.
**Avoid:** `afterEach(() => localStorage.clear())` in jsdom tests or inject an in-memory storage in `defaultDeps` for tests; update `App.test.tsx`, `Header.test.tsx`, `gameStore.test.ts` and delete `SwitchConfirm.test.tsx`. Unit tests should construct stores via `createGameStore({..., storage: createMemoryStorage()})`.

### Pitfall 11: Forfeit-row layout and keyboard
**What goes wrong:** row mounting shrinks tiles (UI-SPEC budget) and Enter on its buttons submits a guess.
**Avoid:** `data-own-enter` on every new button; the 320x500/568/640 Playwright cases from UI-SPEC (drive to exactly `attempts - 2` guesses; include 6-letter, both modes). The row must mount only after reveal ends (`status === 'playing'`).

### Pitfall 12: `GameStatus` widening misses a branch
**What goes wrong:** adding `'gave-up'` leaves a `status === 'lost'` check in Grid/Keyboard/LoadingNotice/App unchanged, so a gave-up game shows the keyboard or an active row.
**Avoid:** grep every `status` comparison; consider `isFinished(status)` helper in `save.ts`/store; add component tests for gave-up.

## Code Examples

### Pure guard excerpt (hand-written, no zod)
```ts
// Source: project pattern; CLAUDE.md "validate in migrate, fall back to fresh"
const KEYS = ['normal-4','normal-5','normal-6','wordubado-4','wordubado-5','wordubado-6'] as const
function validGame(key: BoardKey, g: unknown): SavedGame | null {
  if (typeof g !== 'object' || g === null) return null
  const { answer, guesses, outcome } = g as Record<string, unknown>
  const len = Number(key.split('-')[1]) as WordLength
  const max = BOARD_CONFIG[len].attempts
  if (typeof answer !== 'string' || answer.length !== len || !/^[a-z]+$/.test(answer)) return null
  if (!Array.isArray(guesses) || guesses.length > max) return null
  if (!guesses.every((x) => typeof x === 'string' && x.length === len && /^[a-z]+$/.test(x))) return null
  if (outcome !== resolveOutcomeOrGaveUp(answer, guesses as string[], max, outcome)) return null
  return { answer, guesses: guesses as string[], outcome }   // fixed key order
}
```
(`gave-up` is accepted only if `guesses.length < max` and no guess equals the answer.)

### canForfeit
```ts
export const canForfeit = (status: GameStatus, used: number, max: number) =>
  status === 'playing' && used === max - 2
```

### Test with injected failing storage
```ts
const throwing: Storage = { getItem(){throw new DOMException('x','SecurityError')}, setItem(){throw new DOMException('x','QuotaExceededError')}, removeItem(){}, clear(){}, key(){return null}, length:0 }
const store = createGameStore({ ...deps, storage: createSaveStorage(() => throwing) })
// full game must still be playable; storage status reports not ok
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| In-memory `infoSeen` closure | Persisted `wordubadoInfoSeen` in the document | Survives sessions; cleared by reset |
| `pendingSwitch` confirm | Non-forfeiting immediate switch | Removes a store field, a component, tests |
| `reload()` on chunk retry | Reload only when not offline; reject on blocked reload | No hang, no data loss |
| Fire-and-forget reveal timer | Token-checked timer | Stale timers harmless |

**Deprecated/outdated:** `SwitchConfirm.tsx`, `switchConfirmBody`, `CONFIRM_HEADING`, `CONFIRM_START` (remove).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `StorageEvent.key === null` on `clear()` and `newValue === null` on `removeItem` (HTML spec, not on the fetched MDN page) | Pattern 4 | Other-tab reset might not be detected; low, handler treats both as empty and tests can simulate |
| A2 | Owner accepts "refresh during a reveal shows the finished result immediately" (outcome persisted at submit time) | Schema | Alternative (persist at reveal end) lets refresh dodge a loss; owner may prefer replaying the flip |
| A3 | "Reset my data" should also delete the `:corrupt` backup | Pattern 2/5 | If owner wants the backup kept for debugging, remove that line |
| A4 | Whole-document rejection (not per-board salvage) when any board fails the guard | Schema | Per-board salvage keeps more progress but is more code and SPEC says "starts fresh" |
| A5 | Data written by a NEWER app version (version > current) is treated as unreadable: backed up, start fresh | Pattern 2 | Rolling back a deploy would reset players; acceptable for a static site, flag to owner |
| A6 | Whole-document last-write-wins race between two active tabs is acceptable | Pattern 4 | Rare lost write of one Board's latest guess |
| A7 | Existing `Grid`/`Tile` animate only during `status === 'revealing'` on the last row (not read in this pass) | Pattern 3 | Restored rows could flip on load; verify by reading Grid.tsx/Tile.tsx and add a test |

## Open Questions

1. **Does `Grid`/`Tile` animation key off status or off row mount?** (A7) Not read in this pass; the planner should read `Grid.tsx`, `Tile.tsx` and `game.css` before writing the restore task.
2. **Backup key retention on reset** (A3): one-line decision for the owner or planner default (delete).
3. **`useGameStore` default storage in tests:** recommend `defaultDeps.storage = createSaveStorage(getLocalStorage)`; jsdom tests clear it in `afterEach`. Planner confirms.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build/tests | yes | v24.19.0 (matches `.nvmrc` 24) | none needed |
| npm packages (zustand, vitest, playwright, jsdom) | all | yes (installed; zustand 5.0.15) | per package.json | none needed |
| Playwright browsers | E2E | per project memory: `npx playwright install` times out here; browsers installed manually via curl+unzip into ms-playwright | 1.63 | see memory note |
| CI | `.github/workflows/ci.yml` | exists | n/a | unchanged |

No missing blocking dependencies. No new tools.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.3 (node default env; `// @vitest-environment jsdom` for components); Playwright 1.63 for E2E |
| Config file | `vite.config.ts` (`test.include: src/**/*.test.{ts,tsx}`); `playwright.config.ts` (chromium + Pixel 7, `build:e2e` + preview on 4173) |
| Quick run command | `npx vitest run src/logic src/state` |
| Full suite command | `npm run lint && npm run typecheck && npm test && npm run test:e2e` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SAVE-01 | Six boards keyed `${mode}-${len}` hold independent games | unit (store) | `npx vitest run src/state/gameStore.test.ts -t boards` | extend existing |
| SAVE-02 | Switch mode/length never forfeits; returning restores same game | unit + e2e | `npx vitest run src/state/gameStore.test.ts -t switch`; `npx playwright test e2e/boards.spec.ts` | Wave 0 (e2e new) |
| SAVE-03 | Reload resumes submitted rows; half-typed row dropped | e2e + unit | `npx playwright test e2e/persistence.spec.ts -g refresh` | Wave 0 |
| SAVE-04 | Finished board restores grid + banner; no new game until Play again; no banner focus steal | component + e2e | `npx vitest run src/App.test.tsx -t finished` | extend |
| SAVE-05 | `SAVE_VERSION`, chain runs v(n)..current, fixture v1 migrates, missing step throws | unit (node) | `npx vitest run src/logic/save.test.ts` | Wave 0 |
| SAVE-06 | Garbage / wrong shape / tampered outcome / newer version => `:corrupt` backup, fresh state, never throws | unit (node) | `npx vitest run src/state/storage.test.ts src/logic/save.test.ts` | Wave 0 |
| SAVE-07 | Throwing `getItem`/`setItem`/`localStorage` access: full game playable, `storageOk` false, one toast | unit + e2e (addInitScript override) | `npx vitest run src/state/storage.test.ts` | Wave 0 |
| SAVE-08 | Storage event: visible board changed => replaced + toast; other board => silent; reset in other tab => fresh; echo guard; reveal deferral; no seam call | unit (fake area + dispatched events) + e2e two pages in one context | `npx vitest run src/state/sync.test.ts`; `npx playwright test e2e/tabs.spec.ts` | Wave 0 |
| SAVE-09 | Reset clears all + flag + backup; first-visit state; toast | unit + e2e | `npx vitest run src/state/gameStore.test.ts -t reset` | extend |
| PLAY-07 | Give Up only at attempts-2; confirm; gave-up banner with answer; counts as loss; not available fresh/finished/other counts | unit (`canForfeit` table over all lengths) + component + e2e | `npx vitest run src/logic/save.test.ts -t canForfeit` | Wave 0 |
| PLAY-08 | New game mid-game same rule; forfeit recorded via seam; new game starts | unit + e2e | `npx vitest run src/state/gameStore.test.ts -t forfeit` | extend |
| UI-11 | Settings shows browser-only note (and storage-off line when failing) | component | `npx vitest run src/components/SettingsModal.test.tsx` | Wave 0 |
| D-14 | Modal native `close` handled once, not double-fired after programmatic close | component | `npx vitest run src/components/Modal.test.tsx` | extend (+ stubDialog dispatch `close`) |
| D-15 | Retry: offline => reject; online => reload then reject after delay | unit | `npx vitest run src/data/wordData.test.ts` | extend |
| D-16 | Stale reveal timer ignored after token bump | unit | `npx vitest run src/state/gameStore.test.ts -t token` | extend |
| D-12 | Dot only on other lengths with >=1 guess and playing, label text | component | `npx vitest run src/components/LengthPicker.test.tsx` | Wave 0 |
| Layout | Forfeit row visible at attempts-2: no scroll at 320x500/568/640, both modes, 6-letter | e2e | `npx playwright test e2e/layout.spec.ts` | extend |
| A11y | axe with each new dialog open and row visible | e2e | `npx playwright test e2e/a11y.spec.ts` (if axe present; otherwise manual) | check whether @axe-core/playwright is installed (not in package.json); add only if owner approves (A11y package is optional per CLAUDE.md) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/logic src/state` (node tests, seconds)
- **Per wave merge:** `npm run lint && npm run typecheck && npm test`
- **Phase gate:** full suite incl. `npm run test:e2e` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/logic/save.test.ts`: migration chain, guard tampering table, `canForfeit`, `resolveOutcome`
- [ ] `src/state/storage.test.ts`: in-memory/throwing/quota/corrupt storage doubles (`createMemoryStorage` helper in `src/test/`)
- [ ] `src/state/sync.test.ts`: dispatching `StorageEvent` against a store (jsdom or injected target)
- [ ] `src/test/stubDialog.ts`: make `close()` dispatch a `close` event
- [ ] E2E specs: `e2e/persistence.spec.ts`, `e2e/tabs.spec.ts` (two pages in one browser context share localStorage), forfeit/settings flows; update `e2e/wordubado.spec.ts` (still references the switch confirm); helper to reload while keeping `fixAnswers` init script
- [ ] Delete `src/components/SwitchConfirm.test.tsx`; rewrite switch tests in `App.test.tsx`, `Header.test.tsx`, `gameStore.test.ts`
- Framework install: none.

## Security Domain

`security_enforcement` not disabled in config, so included. No network, auth or server in this phase; the main surface is untrusted local data.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a (no accounts) |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | yes | Hand-written guard on all loaded data (type, charset `^[a-z]+$`, lengths, ranges, enum membership, consistency); rebuild objects, drop unknown keys; never `innerHTML`/`dangerouslySetInnerHTML` stored strings (React escapes; answer shown via text nodes only) |
| V6 Cryptography | no | none; saved answer is plaintext by design (client-only game; tampering/cheating by the owner of the browser is out of scope) |
| V8 Data Protection | partial | Note in Settings that data is browser-only; Reset also removes the `:corrupt` backup |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hand-edited/oversized/prototype-polluting JSON (`__proto__`, `constructor`) | Tampering | Guard builds fresh objects by explicit key; iterate a fixed key list (`KEYS`), never `Object.assign`/spread of parsed input into state; `JSON.parse` result never used as a Record index without allowlist |
| Another-origin or `sessionStorage` storage events | Spoofing | Check `e.storageArea === localStorage` and `e.key` |
| Storage quota exhaustion | DoS | Tiny doc (<2 KB); adapter swallows errors; app stays in-memory |
| Stored XSS via saved strings | Tampering | Charset-validated words only; rendered as React text |

## Sources

### Primary (HIGH confidence)
- Installed zustand 5.0.15 source (`node_modules/zustand/esm/middleware.mjs` persistImpl, `middleware/persist.d.ts`): hydrate/migrate/setItem/clearStorage/merge behaviour verified by reading
- Project code read in full: `src/state/gameStore.ts`, `App.tsx`, `components/Modal.tsx`, `SwitchConfirm.tsx`, `WordubadoInfo.tsx`, `Banner.tsx`, `LengthPicker.tsx`, `Header.tsx`, `Toast.tsx`, `usePhysicalKeyboard.ts`, `data/wordData.ts`, `logic/boards.ts`, `state/copy.ts`, `state/testHook.ts`, `main.tsx`, `test/stubDialog.ts`, `e2e/helpers.ts`, `vite.config.ts`, `playwright.config.ts`
- `.planning/phases/04-six-boards-and-persistence/04-CONTEXT.md`, `04-UI-SPEC.md`, `SPEC.md` §5-§8, `REQUIREMENTS.md`, `02-REVIEW.md` WR-03/WR-04
- MDN Window `storage` event: https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event (fires in other same-origin contexts, not the writer)
- MDN HTMLDialogElement `close` event: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close_event (fires after programmatic `close()`, does not bubble)

### Secondary (MEDIUM confidence)
- Training knowledge of the HTML spec for `StorageEvent` `key/newValue` null cases and "no event when value unchanged" (A1)

### Tertiary (LOW confidence)
- none

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new packages, installed versions verified
- Architecture: HIGH for persist behaviour and pitfalls (source-verified); MEDIUM on Grid animation-on-restore (A7 unread)
- Pitfalls: HIGH, derived from source and existing code paths

**Research date:** 2026-10-02
**Valid until:** 2026-11-01 (stable stack; revisit only if zustand major changes)
