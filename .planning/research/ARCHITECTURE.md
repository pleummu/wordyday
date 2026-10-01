# Architecture Patterns

**Domain:** Client-only Wordle-style word game (React + Vite + TS, localStorage, 6 Boards)
**Researched:** 2026-10-01
**Confidence:** MEDIUM-HIGH. The structure is a well-established pattern and follows directly from plan.txt. Word-list sizes and the Zustand recommendation come from training knowledge and were not re-verified against live docs. The size figures are estimates to confirm when the build script first runs.

## Recommended Architecture

Three layers with a strict one-way dependency direction. Imports only point downward.

```
 UI (React components, hooks, CSS themes)
   |  reads selectors, dispatches actions
 STATE (store: orchestration + side effects)
   |  calls pure functions, passes clock/rng/storage in
 CORE (pure TS, no React, no DOM, no Date.now, no Math.random)
   evaluate / pickAnswer / streaks / share / keyboardState / dates / migrations
 EDGES (impure adapters, injected)
   storage (localStorage), wordData (lazy JSON loader), definitions (fetch), clock, rng
```

Principle: **the core never reaches out.** It receives `today: string` ("YYYY-MM-DD"), `rng: () => number` and plain data, and returns new plain data. The store is the only place that calls `new Date()`, `Math.random` and `localStorage`. This is the testability seam. Vitest tests the core with literal dates and a seeded or stubbed RNG, with no fake timers needed.

### Component Boundaries

| Component | Responsibility | Talks to | Must NOT |
|-----------|---------------|----------|----------|
| `logic/evaluate.ts` | `evaluate(guess, answer) -> ('correct'\|'present'\|'absent')[]` using a two-pass count algorithm | nothing | know about boards or UI |
| `logic/keyboard.ts` | `keyStates(guesses, answer)`, best state per letter (green > yellow > gray) | evaluate | be stored (derive on render) |
| `logic/pickAnswer.ts` | `pickAnswer(mode, len, pools, rng)`. Wordubado: `rng() < 0.75` picks slang, else common. Returns `{word, source: 'slang'\|'common'}` | rng, pools (passed in) | import JSON itself |
| `logic/dates.ts` | `localDateKey(d: Date)`, `daysBetween(a, b)`, `addDays`, `monthKey`, built from y/m/d components | nothing | use `ms / 86400000` on local times (DST bug) |
| `logic/streaks.ts` | `checkMissed(state, today) -> {state, pendingRestore?}`, `applyRestore`, `declineRestore`, `recordResult(state, boardKey, result, today)`, monthly refill derivation | dates | read the clock or storage |
| `logic/share.ts` | Builds the emoji grid text (colour-blind variant, X/n for a loss) | evaluate | touch the clipboard (the UI does) |
| `logic/game.ts` | Pure reducer for one Board: `submitGuess`, `typeLetter`, `backspace`, `giveUp`, `newGame`, which yields status and attempt count | evaluate | do validation I/O (receives a `isValidWord` predicate) |
| `data/wordData.ts` (edge) | `loadPools(len) -> Promise<{answers, slang, guessSet}>`, memoised, dynamic `import()` per length | JSON files | be called from core |
| `logic/storage.ts` (edge) | `load()`, `save(state)`, `migrate(raw)`, `reset()`; try/catch around every access | localStorage | hold app state |
| `logic/definitions.ts` (edge) | slang -> bundled definition. Common -> `fetch` dictionaryapi.dev with AbortController timeout, in-memory cache, `null` on failure | fetch | throw into the UI |
| `state/gameStore.ts` | Holds `AppState` (boards, stats, dayStreak, restores, settings, UI flags). Actions call the core and then persist. Owns clock and rng | core, edges | contain scoring or streak rules inline |
| `hooks/useDayWatcher` | On mount, `visibilitychange`/`focus`, and a timer to next local midnight, calls `store.checkDay()` | store | compute dates itself |
| `components/*` | Presentational. Board/Row/Tile, Keyboard, Toast, Modals, Header | store selectors/actions | import from `logic/` directly except for pure display helpers |
| `styles/` | CSS variables per theme. `data-theme="dark"` and `data-cb="true"` on `<html>` | settings (via a tiny effect) | hard-code colours in components |
| `scripts/build-words.mjs` | Build-time only. Reads `wordlist-english`, filters a-z and length, applies blocklist, merges slang into the guess pool, writes JSON | npm package, slang.json | ship to the browser |

### Data Flow

**Keystroke to result (one-way):**
```
physical key / on-screen key -> Keyboard component -> store.typeLetter(c)
Enter -> store.submitGuess()
   -> game.ts validates length; guessSet.has(word) (pools loaded for this length)
   -> invalid: store sets a transient {shakeRow, toast}; the attempt is NOT consumed
   -> valid: append guess; status = won | lost | playing
   -> if finished: streaks.recordResult(...) (runs checkMissed first), stats updated
   -> storage.save(state)   (single write, after the reducer step)
   -> UI re-renders from selectors; evaluate() results are derived, not stored
```

**App open / day change:**
```
store.init(): storage.load() -> migrate -> state
store.checkDay(): streaks.checkMissed(state, localDateKey(clock()))
   -> resets all Win Streaks immediately (idempotent) and persists
   -> returns pendingRestore {streak, missed, restoresLeft} or null
   -> RestoreModal opens when pendingRestore is set
   -> Restore: applyRestore (uses 1, lastActiveDate = yesterday)
   -> No: declineRestore (Day Streak = 0)
useDayWatcher re-invokes checkDay on focus, visibilitychange and at midnight
```

**Pool loading:** `switchBoard(mode, len)` triggers `loadPools(len)`. The UI shows the grid immediately, and input is accepted once the pool resolves (a brief "loading" state on first visit per length only). Pools for the active length are prefetched at startup, and the other two lengths during idle time.

### Persisted Schema (single key, versioned)

```ts
interface Persisted {
  version: number;                    // bump on any shape change
  boards: Record<BoardKey, SavedBoard | null>;   // "normal-5", "wordubado-6" ...
  stats: Record<BoardKey, BoardStats>;           // played, wins, dist[], winStreak, longestWinStreak
  dayStreak: { current: number; longest: number; lastActiveDate: string | null };
  restores: { month: string; used: number };     // "YYYY-MM"
  settings: { theme: 'system'|'light'|'dark'; colorBlind: boolean; seenHowTo: boolean };
}
interface SavedBoard { answer: string; source: 'slang'|'common'; guesses: string[]; status: 'playing'|'won'|'lost'; }
```

- Store **guesses only**, not tile colours. Colours and keyboard state are derived, so there is one source of truth.
- Migrations: `const migrations: Record<number,(s:any)=>any>`; `migrate` loops from the stored version up to the current one. Missing or garbage data falls back to a fresh default (never crash). Newer-than-known version: do not overwrite, use in-memory defaults.
- Keep `pendingRestore` **out of** storage. It is derived from `lastActiveDate` and today, so "refresh shows the prompt again" falls out for free.
- Restores left is derived: `restores.month === monthKey(today) ? 3 - used : 3`. Do not run a refill job.
- "All" stats tab is a pure reducer over the 3 per-length stats for a mode (no stored totals).

## Patterns to Follow

### Pattern 1: Pure core, injected edges
**What:** Core functions take `today`, `rng`, and predicates as parameters. The store binds the real ones.
**When:** Always for evaluate, pickAnswer, streaks.
**Example:**
```ts
export const pickAnswer = (mode: Mode, p: Pools, rng: () => number) => {
  const useSlang = mode === 'wordubado' && rng() < 0.75;
  const list = useSlang ? p.slang : p.answers;
  return { word: list[Math.floor(rng() * list.length)], source: useSlang ? 'slang' : 'common' };
};
```
The 75/25 test calls it 10,000 times with a seeded RNG such as mulberry32 and asserts a tolerance band (for example 0.73-0.77). The spec's "~75%" means a tolerance, not an exact value.

### Pattern 2: Local date keys as strings, day math via UTC components
**What:** Represent days as `"YYYY-MM-DD"` built from `getFullYear/getMonth/getDate`. Compute differences with `Date.UTC(y,m-1,d)` on the parsed parts.
**Why:** Avoids DST (23/25-hour days) and timezone drift. String compare also works for the "clock moved backwards" check (`today < lastActiveDate` means missed = 0).
```ts
const toOrdinal = (k: string) => { const [y,m,d] = k.split('-').map(Number); return Date.UTC(y, m-1, d) / 86400000; };
export const missedDays = (last: string, today: string) => Math.max(0, toOrdinal(today) - toOrdinal(last) - 1);
```

### Pattern 3: Lazy, per-length word data as Sets
**What:** One chunk per length, loaded via dynamic import. Use an explicit map so Vite can statically analyse it:
```ts
const loaders = { 4: () => import('./guesses-4.json'), 5: () => import('./guesses-5.json'), 6: () => import('./guesses-6.json') };
```
- Build the guess `Set<string>` once per length and memoise it. `Set.has` is O(1). Do not use `Array.includes` over about 20k words per keystroke.
- Answers and slang are small. Put them in the same per-length chunk (or one `pools-N.json`) so a single request resolves a Board.
- Size (ESTIMATE, verify): about 4k-6k 4-letter, 10k-15k 5-letter, 15k-25k 6-letter guess words, roughly 50k words total, around 350 KB raw and 100-150 KB gzipped for all three. Per-length chunks make first load only the active length. This is acceptable even without splitting, but splitting is cheap and teaches a useful technique. Prefer a JSON array of strings, or one space-joined string per length (smaller, `split(' ')` at load).
- Never put guess pools in the initial entry bundle. The shell (React plus UI) should render before any pool arrives.
- Build script invariant: every slang word is in the guess pool; every answer is in the guess pool; the blocklist is applied to answers only (guesses may stay permissive, but this is a product decision to flag).

### Pattern 4: Store as orchestrator, persist on change
**What:** The store actions do `next = core(prev, ...)`, then `set(next)`, then `storage.save(next)`. Alternatively use one `subscribe` that saves (debounce is unnecessary at this size).
**Library:** Zustand (small, no provider, selectors prevent whole-tree rerenders) is the recommended default. A `useReducer` plus Context is a valid zero-dependency alternative at this scale. Use either way, but keep the logic in `logic/` so the choice is reversible. Do not use the Zustand `persist` middleware: the versioned migration is the learning goal and is better as explicit code that Vitest can test.

### Pattern 5: Derived state over stored state
Tile colours, keyboard key states, attempts remaining, restoresLeft, "All" stats, and pendingRestore are all derived. Only the minimal facts are stored.

### Pattern 6: Theming via CSS variables
Tokens such as `--tile-correct`, `--tile-present`, `--tile-absent`, `--bg` are defined under `:root`, `[data-theme=dark]`, and `[data-cb=true]` (which composes with dark). Components use only tokens. Default theme follows `prefers-color-scheme` until the user chooses. Animations are gated by `@media (prefers-reduced-motion: reduce)` (and a class for JS-driven timing).

### Pattern 7: Accessibility as architecture
A single `aria-live="polite"` region lives in the app shell, fed by store events ("Row 2: A correct, B absent..."). A `Modal` primitive handles focus trap, Escape, and focus return, and every modal reuses it. Retrofitting this later is expensive, so build the primitive first.

### Pattern 8: Testability seams for E2E
Unit tests use params. Playwright uses `page.clock` (install and set fixed time) for day and Restore scenarios, and seeds `localStorage` through `addInitScript` with a known `answer`, so E2E games are deterministic without any test-only code in production. If seeding proves awkward, a `?seed=` param is the fallback, but avoid shipping debug hooks.

## Anti-Patterns to Avoid

### Anti-Pattern 1: `Date.now()`/`Math.random()` inside logic
**Why bad:** Streak and Restore rules have many date edge cases (clock back, month rollover, 4 vs 5 missed). Hidden clocks make them untestable.
**Instead:** Pass `today` and `rng` in.

### Anti-Pattern 2: Day difference via milliseconds
**Why bad:** DST shifts produce off-by-one missed days twice a year.
**Instead:** Pattern 2.

### Anti-Pattern 3: Storing derived colours or keyboard state
**Why bad:** Two sources of truth drift apart, and migrations multiply.
**Instead:** Store guesses and derive.

### Anti-Pattern 4: Single-pass scoring
**Why bad:** Gives wrong yellows for repeated letters, which is the stated Core Value.
**Instead:** Pass 1 marks greens and counts remaining answer letters. Pass 2 marks yellows only while the count is above 0. Test ABBEY/BABES and SPEED/ERASE.

### Anti-Pattern 5: Recording a result before the missed-day check
**Why bad:** Finishing a game while a Restore prompt is pending would bump `lastActiveDate` and silently bypass or corrupt the Restore flow.
**Instead:** `recordResult` always calls `checkMissed` first. Also block play (modal gating) until the prompt is answered, so the order is never ambiguous.

### Anti-Pattern 6: Rendering the app before data is ready
**Why bad:** A flash of an empty grid, or input accepted before the guess Set loads (valid words rejected as invalid).
**Instead:** Gate submit on `poolsReady`, or queue the guess and show a subtle loading state.

### Anti-Pattern 7: Trusting localStorage contents
**Why bad:** Corrupt JSON, manual edits (the manual test edits `lastActiveDate`), quota errors, and Safari private mode all throw.
**Instead:** try/catch, shape-validate after parse (a light hand-written guard or zod), fall back to defaults, and keep the game playable in memory if writes fail.

### Anti-Pattern 8: Multi-tab last-write-wins corruption
**Why bad:** Two tabs overwrite each other's boards and streaks.
**Instead:** Listen for the `storage` event and reload state from storage (cheap, and enough for v1).

## Scalability Considerations

Not a server scalability problem (static site). The real axes:

| Concern | Now (v1) | If extended |
|---------|----------|-------------|
| Word-list size | Per-length lazy chunks, Set lookup | Add a 7th length: one more chunk and Board key, with no logic changes |
| Schema evolution | `version` plus migration chain | Add a migration function per change, with a fixture test per old version |
| New mode | `Mode` union plus pool config | Board keys are `${mode}-${len}`, so the stats and storage generalise |
| Cloud sync (out of scope) | n/a | The persisted blob is already one serialisable object, so sync is a swap of the adapter |

## Suggested Build Order (dependency-driven)

1. **Foundation and docs:** repo scaffold (Vite+TS, lint, Vitest), SPEC.md, GLOSSARY.md. Shared `types.ts` (Mode, Length, BoardKey, Persisted). Everything depends on the vocabulary.
2. **Word-data pipeline:** `slang.json` (draft, owner review can run in parallel), `build-words.mjs`, output JSON, and `wordData.ts` loader. Needed before real play and before pickAnswer has data. Starts early because the owner review is a human-latency item.
3. **Core game logic (pure, test-first):** `evaluate`, `keyboard`, `pickAnswer`, `dates`, `game` reducer, with Vitest. Delivers the Core Value, with no UI needed to verify it.
4. **Playable UI slice (one Board):** Tile/Row/Board, Keyboard (physical and on-screen), Toast, shake/flip/pop, minimal store. Prove a full 5-letter Normal game, ideally with in-memory state first.
5. **Persistence:** `storage.ts` with versioning and migration, wired into the store, plus resume-on-refresh and 6-Board switching. Do this **before** streaks, because streaks live in the same blob and the schema should be settled once.
6. **Streaks, stats, Restore:** `streaks.ts` (heaviest rule density, so the most unit tests), the stats reducer, `useDayWatcher`, and Restore, Stats and Confirm modals. Add New game / Give up with confirm here (they feed streaks as Forfeit).
7. **Wordubado and definitions:** the 75/25 pick, info modal, slang definitions, dictionaryapi lookup with the failure state, and the Result modal with Share.
8. **Polish:** themes (dark and colour-blind), how-to-play first visit, a11y pass (live region, focus handling, reduced motion), phone layout, OG image, favicon, title and description. The theme tokens should exist from step 4 even if the alternates arrive here.
9. **E2E, CI, deploy:** Playwright (full games, resume, Restore via `page.clock`), GitHub Actions (lint, typecheck, unit, E2E, build), Vercel preview and production, docs/PIPELINE.md. The unit tests exist from step 3. Only E2E and deploy trail the product.

Ordering notes: steps 2 and 3 can run in parallel. The Modal primitive (focus trap) should be built at step 4 or 6, not step 8. Wordubado could slip earlier because it is only a mode flag plus pool, but the slang review gate argues for keeping it after the core loop is proven.

## Research Flags

- Step 2 (word data): needs hands-on investigation. Check the `wordlist-english` size tiers and their metadata for "common" (frequency or size bucket), the real counts per length, and blocklist quality. The "common words" answer pool quality is the biggest product risk and cannot be settled by reading docs.
- Step 6 (streaks/Restore): rules are fully specified in plan.txt, so no external research is needed. It does need a thorough edge-case matrix: midnight rollover mid-game, month boundary with Restore, DST, clock backwards, the Restore month counted against the month of use.
- Steps 4, 5, 8, 9: standard patterns, and no deeper research is expected.

## Sources

- C:\Users\pleum\Wordle\plan.txt and .planning\PROJECT.md (settled rules and proposed layout). HIGH.
- Established Wordle-clone structure (pure evaluate, board and keyboard components, localStorage state), from training knowledge. MEDIUM.
- Vite dynamic import and `import.meta.glob` behaviour, Playwright `page.clock`, Zustand patterns: training knowledge, not re-verified in this session. LOW-MEDIUM. Confirm against current docs when implementing.
