# Phase 2: Playable Normal Game - Research

**Researched:** 2026-10-01
**Domain:** React/Zustand game loop, pure scoring/answer logic, build-time word pipeline (wordlist-english + obscenity), CSS animation and 320 px layout, Playwright E2E on `vite preview`
**Confidence:** HIGH on pipeline numbers (measured), MEDIUM on Vite JSON chunking/Playwright config details (not executed in this repo)

## Summary

Phase 2 has two halves. The first is a pure-logic and data half: `src/logic/score.ts` and `pickAnswer`, written test-first, plus `scripts/build-words.mjs` that turns `wordlist-english@1.2.1` into committed per-length JSON. The second is a UI half: a Zustand store holding one game, a CSS-only grid/keyboard/toast with the UI-SPEC animation timings, and a small Playwright suite on the production build.

I prototyped the build pipeline against the real package. Measured with the D-02 stem rules plus `obscenity`: Normal answers come to about **799 (4), 888 (5), 970 (6)** words, comfortably above any sensible floor. Guess pools (all tiers, all dialects, a-z only) are **3204 / 6510 / 10908** words, which gzip to **8 / 19 / 35 KB** (before slang and answers, which are already inside the list). So the D-06 floor and D-11 budget can be set tight and meaningful. One stem-rule trap was found (the naive "strip suffix, look in list" rule wrongly drops NEED, SEED, THING, RING); the fixed rule set is in Pitfall 1 and must be unit-tested with the CONTEXT examples.

**Primary recommendation:** Build order is (1) pure `score`/`pickAnswer` tests-first, (2) build script with invariants and the blocking owner review checkpoint, (3) loader + Zustand store (actions, not effects, pick/score), (4) UI components and CSS to the UI-SPEC, (5) Playwright + CI jobs (`words` drift, `e2e`) + bundle-split assertion.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Already locked elsewhere and not re-decided here: the scoring algorithm and input rules (SPEC.md R-SCORE-*, R-GUESS-*), pool rules (R-POOL-1..9), and every visual, animation, copy, layout and loading/error decision in `02-UI-SPEC.md`.

**Answer pool (Normal)**
- **D-01:** Normal answer candidates come from `wordlist-english` tiers **10 + 20** (english/10 and english/20, American list), filtered to the exact length.
- **D-02:** Plurals and inflections (R-POOL-7) are detected with a **stem-in-list check**. A word is dropped only if stripping the suffix gives another real word in the source list. Rules to cover: `-s`, `-es`, `-ies→y`, `-ed`, `-ing`, doubled consonant (STOPPED→STOP), and silent-e (BAKED→BAKE). This means GLASS, BLESS, THING, BRING, KING, NEED and SEED stay. Dropped words remain valid guesses.
- **D-03:** Profanity filtering uses the **`obscenity` package's English preset plus a checked-in, commented `blocklist.txt`** for slurs, hate terms, sexual and violent words that obscenity misses. The blocklist applies to answers only (R-POOL-6).
- **D-04:** **Mildly crude but not profane words are allowed as Normal answers.** Only true profanity, slurs, hate terms and anything the owner cuts at review are removed. This deliberately relaxes PROJECT.md's "clean common words" wording; the owner's review checkpoint (D-07) is the safety net.
- **D-05:** British spellings are **not** filtered out of Normal answers. Abbreviations, acronyms and proper-noun leftovers **are** filtered out; plain lowercase a-z already handles most of this, and the script should catch any that remain.
- **D-06:** The build **fails if any length has fewer than a minimum number of answers** after filtering (Claude sets N from measured counts; around 300 is the floor in mind). This catches over-filtering.
- **D-07:** **Human checkpoint (blocking):** after the build script first produces the pools, the plan pauses so the owner can review the Normal answer lists (4-letter in full, 5 and 6 skimmed). Words to cut go into a checked-in, commented `exclude.txt`, which the build applies to answers. Then the build re-runs. Phase 2 is not done until this review happens.

**Guess pool**
- **D-08:** The Guess Pool is the **full dictionary**: all `wordlist-english` tiers (10 through 95), **including British, Canadian and Australian variant lists**, plus all answers, plus all slang, plus `extra-guesses.txt`. It is filtered to plain a-z and the exact length.
- **D-09:** Words with apostrophes, hyphens, accents or other non a-z characters are **dropped**, not normalised.
- **D-10:** A checked-in, commented **`extra-guesses.txt`** lets a missing real word be added to guesses with a one-line PR and a rebuild.
- **D-11:** The build reports the gzipped size per length and **fails over a size budget** (Claude sets the ceiling from the measured size plus headroom).
- **D-12:** Loading is **one lazy chunk per length** containing both answers and guesses. The keyboard enables when the chunk arrives (the UI-SPEC loading state). No prefetching of other lengths.
- **D-13:** Build invariants are asserted in the script and/or tests: answers ⊆ guesses, all slang ⊆ guesses, no duplicates, lowercase a-z only, exact lengths, no blocklisted or `exclude.txt` word among answers, no slang in the Normal answers.

**Slang in Phase 2**
- **D-14:** Claude **drafts `slang.json` in Phase 2** (about 80-150 words per length, with definitions). The build **merges it into the Guess Pool now**, so slang is typeable in Normal (R-POOL-2). It is never a Normal answer.
- **D-15:** Entry shape: `{ word, definition, crude: boolean, reviewed: boolean }`. `reviewed` starts `false`. Phase 3 must refuse unreviewed words as Wordubado answers.
- **D-16:** The build also writes a **generated `slang-review.md`** table (word, length, definition, crude, flags) for the owner to mark keep/cut. Claude applies the marks back to `slang.json`. The owner's review runs in parallel and must finish before Phase 3 ships Wordubado. It is **not** a Phase 2 blocker.
- **D-17:** A slang word that collides with obscenity or `blocklist.txt` is **not silently dropped**. It is flagged "blocklist hit" in `slang-review.md` for the owner to decide. Slurs and hate terms are always cut (R-POOL-8).
- **D-18:** A validation test for `slang.json` covers the shape, lengths 4-6, a-z only, no duplicates, and a non-empty definition.

**Testing depth**
- **D-19:** **A small Playwright E2E suite lands in Phase 2.** Install `@playwright/test` with a Chromium project and a mobile (Pixel 7) project, running against `vite preview` (the production build). Tests: win a game, lose a game (answer revealed in the banner), an invalid/short word shakes without using an attempt, and **no vertical scroll for 6 letters at 320x500, 320x568 and 320x640** (from the UI-SPEC). Add an `e2e` CI job and upload `playwright-report`. Full E2E coverage still completes in Phase 8 (QA-03).
- **D-20:** **The CI word-drift check is added now:** `npm run build:words && git diff --exit-code` on the generated word files (WORD-07).
- **D-21:** Scoring and answer picking are pure modules in `src/logic/`, written **test-first** (per the ROADMAP note). The R-SCORE-2 and R-SCORE-3 worked examples are test cases.

**Test-only answer control**
- **D-22:** `pickAnswer` takes an **injectable random function**. E2E fixes the answer through a **test hook set by Playwright's `addInitScript`** before page load (e.g. `window.__TEST_SEED__` or a direct answer override read at startup). There is **no URL parameter and no user-visible way** to choose the answer in production.

### Claude's Discretion
- State shape for the single Phase 2 game (Zustand store vs a reducer), as long as store actions, not effects, pick answers and score results (StrictMode pitfall), and the shape extends cleanly to six Boards in Phase 4.
- Generated file format and location (e.g. `src/data/words-{4,5,6}.json` with answers stored as a subset/flag rather than duplicated; newline-joined string vs array).
- Exact minimum pool size (D-06) and size budget (D-11), set from measured numbers.
- The exact name and shape of the E2E test hook (D-22).
- Where `blocklist.txt`, `exclude.txt`, `extra-guesses.txt`, `slang.json` and `slang-review.md` live (e.g. `scripts/words/` or `data/`), as long as they are checked in and commented.
- The `obscenity` API details: check its README at execution time; the research notes its API names are from memory.

### Deferred Ideas (OUT OF SCOPE)
- "Prefetch other lengths" for instant length switching: not chosen; revisit if switching feels slow.
- Interactive artifact page for slang review: not chosen in favour of a markdown review sheet.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLAY-01 | 4/5/6 letters, 5/6/7 attempts | Reuse `BOARD_CONFIG`; grid derived from it; Pattern 3 |
| PLAY-02 | Two-pass scoring | `score()` pure function, Code Examples, R-SCORE-2/3 test cases |
| PLAY-03 | Guess Pool validation, shake + toast, no attempt used | Store `submit` action returns a rejection reason; UI shake via class re-trigger |
| PLAY-04 | On-screen + physical keyboard, best-state keys | `mergeKeyState` with rank; single `keydown` listener with cleanup; keys update after reveal |
| PLAY-05 | pop/flip/shake, input blocked mid-reveal, keys after flip | `revealing` flag in store; timing from UI-SPEC; `animationend` + timeout fallback |
| PLAY-06 | Answer revealed on loss | Banner shows `answer`; E2E lose test |
| WORD-02 | Normal answers common words, no plurals/inflections/blocklisted | Stem rules + obscenity + `blocklist.txt` + `exclude.txt`; measured counts |
| WORD-05 | Fully random answers, repeats allowed | `pickAnswer(answers, rng)`; uniform index; no history |
| WORD-07 | Build script, committed JSON, CI drift check | `scripts/build-words.mjs`, deterministic output, `words` CI job |
| WORD-09 | Pools lazy per length | `loaders` map of dynamic `import()`; bundle-split check script |
| UI-01 | Minimal, soft, light | CSS tokens per UI-SPEC |
| UI-06 | 320 px, 6x7 grid, dvh-safe | CSS fit strategy, Playwright scroll assertions at 3 heights |
| UI-09 | prefers-reduced-motion | CSS media query + JS `matchMedia` for timing; Playwright `reducedMotion` |
| QA-06 | Production build, pools out of entry chunk | Build-output assertion script (Pattern 6) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Word pool generation | Build time (Node script) | CI (drift check) | Static site, no server; pools are committed artifacts |
| Pool delivery per length | CDN / Static (lazy JS chunk) | Browser (memoised loader) | Vite code-splits dynamic `import()` |
| Scoring, answer picking, key merge | Browser, pure `src/logic` | none | Pure functions, node-testable |
| Game state and orchestration (reveal lock) | Browser, Zustand store | none | Store actions are testable and avoid StrictMode double-fire |
| Animation | Browser, CSS | JS only for timing/lock | Per UI-SPEC: CSS keyframes, no JS animation |
| Test control of the answer | Browser init hook | Playwright `addInitScript` | D-22, no URL param |
| Drift/bundle assertions | CI / Node scripts | Vitest | Cheap, deterministic |

## Standard Stack

### Core (existing, already installed)
| Library | Version | Purpose |
|---------|---------|---------|
| react / react-dom | ^19.2.8 (installed) | UI [VERIFIED: package.json] |
| vite + @vitejs/plugin-react | ^8.3 / ^6.1.1 | Build; dynamic-import code splitting [VERIFIED: package.json] |
| vitest + jsdom + @testing-library/react | 5.0.3 / 30.1.1 / 16.3.3 | Unit and component tests [VERIFIED: package.json] |

### New in this phase
| Library | Version | Purpose | Dep type |
|---------|---------|---------|----------|
| zustand | 5.0.15 | Game store | dependency [VERIFIED: npm registry 2026-10-01; peers react>=18] |
| @playwright/test | 1.63.0 | E2E (Chromium + Pixel 7) | devDependency [VERIFIED: npm registry; engines node>=20] |
| wordlist-english | 1.2.1 | Word source, build-time only | devDependency [VERIFIED: installed and measured in scratch dir; last published 2022-06-29] |
| obscenity | 0.4.6 | Profanity matcher in build script only | devDependency [VERIFIED: npm registry; README API checked] |

Not needed: `@axe-core/playwright` (Phase 8), testing-library/user-event (optional; `fireEvent` or Playwright suffices), date libs.

**Installation:**
```bash
npm install zustand@5.0.15
npm install -D @playwright/test@1.63.0 wordlist-english@1.2.1 obscenity@0.4.6
npx playwright install chromium
```

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| zustand | npm | years, pmndrs | github.com/pmndrs/zustand | [OK] | Approved |
| @playwright/test | npm | years, Microsoft | github.com/microsoft/playwright | [OK] | Approved |
| obscenity | npm | 2022+ | github.com/jo3-l/obscenity | [OK] | Approved |
| wordlist-english | npm | 2022 | github.com/jacksonrayhamilton/wordlist-english | [OK] | Approved |

No `postinstall` scripts on zustand, @playwright/test, obscenity or wordlist-english (checked with `npm view <pkg> scripts.postinstall`; empty). slopcheck 0.6.1 was run per package (`slopcheck scan <pkg> --pkg npm`). **Removed:** none. **Flagged:** none.

## Architecture Patterns

### System Architecture Diagram

```
BUILD TIME
 wordlist-english (all tiers+dialects) --+
 blocklist.txt / exclude.txt ------------+--> scripts/build-words.mjs
 extra-guesses.txt / slang.json ---------+      | filter a-z + length
 obscenity englishDataset ---------------+      | stem-drop inflections (answers only)
                                                | blocklist+exclude (answers only)
                                                | invariants, min-count, gzip budget
                                                v
                      src/data/words-{4,5,6}.json (committed) + slang-review.md
                                                |
CI: build:words && git diff --exit-code --------+  (drift)

RUNTIME
 keydown / on-screen key --> store.typeLetter/backspace/submit (actions)
                                |            |
          pool not loaded? ignore|            +--> not full: reject "Not enough letters"
                                |                 not in guessSet: reject "Not in word list"
        loadPools(len) <-- dynamic import() chunk  valid: score(answer,guess) -> row, revealing=true
                                                   |
                                  CSS flip stagger (reveal total ms) -> revealDone() action
                                                   |
                    keys merged (best state) -> win/loss check -> banner replaces keyboard
```

### Recommended Project Structure
```
scripts/
├── build-words.mjs        # entry, imports lib below
├── words/lib.mjs          # pure helpers: isInflection, filterLength, buildPools, assertInvariants (unit-testable)
├── words/blocklist.txt  exclude.txt  extra-guesses.txt  slang.json   # commented, checked in
├── check-bundle.mjs       # asserts pools not in entry chunk
src/
├── data/words-4.json words-5.json words-6.json   # generated, committed
├── data/wordData.ts       # loaders map + memoised loadPools(len) -> {answers:string[], guesses:Set}
├── logic/ boards.ts score.ts pickAnswer.ts keys.ts (+ colocated *.test.ts)
├── store/gameStore.ts
├── components/ App Header LengthPicker Grid Tile Keyboard Toast Banner
└── styles/ tokens.css (extend) game.css
e2e/ *.spec.ts ; playwright.config.ts
```
`vitest` include is `src/**/*.test.{ts,tsx}`; script tests under `scripts/` need either widening `include` to `scripts/**/*.test.mjs` or putting the pure helpers in `src/logic/`-adjacent TS. Recommendation: widen `include` (and keep scripts node-environment). Prettier/ESLint: eslint only lints `**/*.{ts,tsx}`, so `.mjs` scripts are unlinted today; add `.mjs` with `globals.node` if desired. Add `src/data/*.json` to `.prettierignore` (generated; avoid format:check conflict with the drift check).

### Pattern 1: Generated file format (recommended)
Per length `words-N.json`: `{ "answers": "w1 w2 ...", "guesses": "..." }` where `guesses` holds **only non-answer** words, space-joined and sorted; loader builds `Set(answers ∪ extra)`. This honours "do not duplicate" (PITFALLS) and keeps D-13 "answers ⊆ guesses" true for the logical Guess Pool (assert it on the loaded Set in a test). A JSON array would add about 3 bytes per word raw but gzips similarly; the string is faster to parse. Sort and `\n`-terminate output so the drift check is deterministic. `.gitattributes` already forces `eol=lf`.

### Pattern 2: Pure scoring (two-pass), test-first
```ts
// src/logic/score.ts  (R-SCORE-1)
export type TileState = 'correct' | 'present' | 'absent'
export function score(answer: string, guess: string): TileState[] {
  const res: TileState[] = Array(guess.length).fill('absent')
  const counts: Record<string, number> = {}
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) res[i] = 'correct'
    else counts[answer[i]] = (counts[answer[i]] ?? 0) + 1
  }
  for (let i = 0; i < guess.length; i++) {
    if (res[i] === 'correct') continue
    if ((counts[guess[i]] ?? 0) > 0) { res[i] = 'present'; counts[guess[i]]-- }
  }
  return res
}
```
Tests (cite IDs): ABBEY/BABES -> [present, present, correct, correct, absent]; SPEED/ERASE -> [present, absent, absent, present, present]; triple letters, all-correct, all-absent, every length 4/5/6. Note `erasableSyntaxOnly` is on: no enums or parameter properties; use string unions.

`mergeKeyState(prev, next)` with rank `{absent:1, present:2, correct:3}`; test "never goes backwards".

### Pattern 3: Store shape (extends to six Boards)
Single Zustand store `{ length, answer, rows: {letters, states}[], current: string, status: 'loading'|'playing'|'revealing'|'won'|'lost'|'error', keyStates, pools }`. Phase 4 can wrap this as `boards[key]`. Actions: `startGame(length, rng?)`, `typeLetter`, `backspace`, `submit() -> 'ok'|'short'|'invalid'|'blocked'`, `finishReveal()`. Rules:
- Answer is drawn inside `startGame` (an event-triggered action), never in `useEffect`. Do not rely on `useEffect` to kick off the first game under StrictMode: call `startGame` from `main.tsx` before render, or from a once-guarded initializer. If an effect must trigger the pool load, make `loadPools` memoised and idempotent and guard against stale resolution with a request token (length switched mid-load).
- Compute keyStates and win/loss in `finishReveal()`, called when the reveal completes (UI-SPEC: keys and banner only after reveal). Row states for tiles are known at submit time but the CSS applies colour at flip midpoint; keep `rows[i].states` in the store at submit and gate key merge on `finishReveal`.
- Reveal timing: `revealMs = reduced ? 150 : (cols-1)*300+500`, read `matchMedia('(prefers-reduced-motion: reduce)')` at submit time. Use a `setTimeout(finishReveal, revealMs + 50)` as the authoritative trigger (simpler and deterministic) and optionally `animationend` on the last tile for early completion; one source only to avoid double-fire; make `finishReveal` idempotent (no-op unless `status==='revealing'`).
- Physical keyboard: one `window.addEventListener('keydown')` in an effect with cleanup (idempotent under StrictMode). Ignore when `ctrlKey||metaKey||altKey`, when `e.repeat` for Enter, and when `status !== 'playing'`. Only match `/^[a-zA-Z]$/` single characters for letters (so `e.key==='Enter'` is not caught as a letter, and do not preventDefault on Tab). Prevent Enter on a focused on-screen `<button>` from double-firing: when a key button has focus, Enter/Space triggers click AND the window keydown; call `preventDefault` for Enter in the window handler only when the target is not the Play again / Try again button, or `blur()` keys after click. Recommended: key buttons `onMouseDown/onPointerDown preventDefault` is NOT recommended (breaks keyboard users); instead, in the window handler skip events whose target is a `<button>` other than a key, and for keys call `blur()` after handling pointer clicks.
- Test hook (D-22): in `startGame`, read `window.__WORDLE_TEST__?.answer` (or an `rng`) guarded by `import.meta.env.PROD`-agnostic code (the hook is inert unless Playwright sets it; no URL param). Playwright: `page.addInitScript(() => { window.__WORDLE_TEST__ = { answer: 'crane' } })`. Fallback if the answer is not in the loaded pool length: ignore the hook. Declare the `Window` type in a `.d.ts`. A production bundle containing the hook read is acceptable (not a secret; the pool is public).

### Pattern 4: Per-length lazy loader
```ts
// src/data/wordData.ts  (explicit map so Vite can statically analyse)
const loaders = {
  4: () => import('./words-4.json'),
  5: () => import('./words-5.json'),
  6: () => import('./words-6.json'),
} as const
const cache = new Map<number, Promise<Pools>>()
export function loadPools(len: 4|5|6) {
  let p = cache.get(len)
  if (!p) { p = loaders[len]().then(toPools); cache.set(len, p); p.catch(() => cache.delete(len)) }
  return p
}
```
Failure must clear the cache so "Try again" re-imports. `resolveJsonModule` is implied by bundler resolution in TS 6 but check `tsc -b` passes with JSON imports (`resolveJsonModule: true` may need adding to `tsconfig.app.json`). [ASSUMED: Vite 8/Rolldown emits JSON dynamic imports as separate JS chunks; verified by design in Vite docs for Vite <=7, so the check-bundle script below is the safety net.]

### Pattern 5: CSS grid fit (UI-SPEC layout)
Prefer a JS-free CSS approach: the grid area is `flex:1; min-height:0` inside a `100dvh` column (declare `height:100vh` first, then `100dvh`); the grid is `container-type: size` and tile size uses container query units: `--tile: clamp(40px, min((100cqw - (var(--cols) - 1) * 4px) / var(--cols), (100cqh - (var(--rows) - 1) * 4px) / var(--rows)), 62px)`. `--cols`/`--rows` set inline from `BOARD_CONFIG`. Note: per the UI-SPEC budget, at 320x568 the 6x7 grid needs 332 px of tile height and leaves 2 px slack, and the 40 px floor means that at 320x500 the content (80+8+7*40+24+8+136=...~536) may still exceed 500; the E2E "no vertical scroll" assertion at 320x500 therefore forces the floor and compact header/key sizes to be tuned (consider allowing keys to 36 px or the tile floor to 36 px below 520 px height; flag to planner: the UI-SPEC floor of 40 px does not mathematically fit 500 px with the 80 px two-row header, so the planner must decide a smaller floor or lower key height at <=520 px; this is a known UI-SPEC gap) [VERIFIED by arithmetic: 80+8+(7*40+6*4=304)+8+136 = 536 > 500].
Also: `touch-action: manipulation`, `user-select: none`, `-webkit-tap-highlight-color: transparent`, `overscroll-behavior: none`; keys are `<button type="button">`, never an `<input>`.

### Pattern 6: Animation re-trigger and reduced motion
- Flip: per-tile `style={{'--i': col}}` with `animation: flip 500ms var(--ease) calc(var(--i)*300ms) both`. Colour must change at the 50% keyframe: put the state background on `[data-state]` tiles but start from the empty colour via keyframe `0%,49%{background: var(--color-bg)} 50%,100%{background: var(--tile-colour)}`; set `data-state` only once the row is submitted (the store knows states at submit; the CSS holds the colour back). The tile `aria-label` should include state only after reveal completes, so screen readers are not spoiled mid-flip (nice-to-have).
- Shake: toggle a `data-shake` class with a counter `key` on the row (`key={shakeId}` on an inner wrapper), clear on `animationend` or after 400 ms; never re-trigger by removing/adding the class in the same frame without forcing reflow; changing `key` is the simplest reliable approach.
- Pop: apply to the tile whose letter was just typed (`data-pop` keyed by letter count).
- Reduced motion in CSS: `@media (prefers-reduced-motion: reduce){ .tile{animation:none} ... }` replace with a 120 ms opacity fade; JS shortens `revealMs` to 150. Both must exist (R-UI-4).

### Pattern 7: Bundle assertion (QA-06)
`scripts/check-bundle.mjs` after `vite build`: read `dist/index.html`, find the entry script, assert its text does NOT contain a sentinel run of pool words (e.g. the first 20 4-letter answers joined by space), and assert `dist/assets` contains at least three separate chunks that each contain the sentinel for their length. Run it as `npm run check:bundle` in CI after `build`. Also import with `import()` only from `wordData.ts`; never import the JSON statically anywhere else (an ESLint `no-restricted-imports` pattern for `**/data/words-*.json` outside `wordData.ts` is cheap).

### Pattern 8: Playwright config
```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html'], ['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry' },
  webServer: { command: 'npm run build && npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
})
```
Tips: set `vitest.include` so Vitest does not pick up `e2e/*.spec.ts` (it only includes `src/**`, fine). Exclude `e2e` from eslint-typed globs only if needed. Most E2E tests may run with `test.use({ reducedMotion: 'reduce' })` to shorten the reveal to 150 ms; keep one test without it to cover the real flip timing and input blocking. For the invalid-word test assert the row has the shake attribute/class and the toast text, and that the typed row count is unchanged. For no-scroll tests use `page.setViewportSize({width:320,height:H})` and assert `document.documentElement.scrollHeight <= innerHeight` (and `scrollWidth`). Pick answers via `addInitScript`. `webServer` with `npm run build` runs `tsc -b`, so E2E tests the production build as required. Note on Windows locally `npm run build && ...` in `command` works under the default shell.

### Anti-Patterns to Avoid
- Picking the answer or counting a result inside `useEffect` (StrictMode double-invoke).
- Applying the tile colour or key colour at submit time (spoils the flip; violates R-GUESS-6).
- Importing `words-N.json` statically anywhere (pulls it into the entry chunk).
- Shipping `Math.random` calls inside components; always go through `pickAnswer(answers, rng = Math.random)`.
- Using `100vh` alone (mobile browser chrome) or `overflow:hidden` on the shell to hide overflow.
- Normalising accented/apostrophe words into the pool (D-09: drop).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Profanity detection in the build | Own regex list | `obscenity` englishDataset + `blocklist.txt` | Handles leetspeak and substrings; matched on whole words here |
| Store + subscriptions | Context + reducer | Zustand 5 | Selectors avoid re-rendering all tiles on every key |
| Word list | Scraped list | `wordlist-english` | Already chosen |
| Test runner/browsers | Custom puppeteer | `@playwright/test` | Chosen |
| Toast/animation libs | motion, react-hot-toast | CSS keyframes + a 20-line toast component | UI-SPEC says CSS only; single toast |

**Key insight:** the pipeline's value is in the rules and the invariants, not libraries. Keep the filtering helpers pure and unit-tested.

## Common Pitfalls

### Pitfall 1: Naive stem rule drops real words (measured)
**What goes wrong:** "strip -ed/-d, look up stem" turns NEED->NEE, SEED->SEE, FEED->FEE; "-ing with silent e" turns THING->THE ("th"+"e"), RING->RE. The first prototype dropped need, seed, thing, ring (all required to stay by D-02).
**How to avoid (verified against the real list):** (1) stem candidate must be at least 3 letters; (2) for silent-e candidates (`-ing`, `-ed`), the part before `e` must be at least 3 letters (THING: "th" is 2, skipped); (3) never apply the `-ed` rules to words ending `-eed`; (4) `-s` rule skips words ending `-ss`; (5) look stems up in the **entire** source (all tiers, all dialects, all lengths), not just tiers 10+20, otherwise stems in rarer tiers are missed. With these rules the CONTEXT examples all pass: BOATS, STOPPED, BAKED, CITIES drop; GLASS, BLESS, THING, BRING, KING, NEED, SEED stay. Put these as a parameterised table test.
**Residual false positives (expect; handle via review):** NEWS, ALAS, OURS, ODDS, LOTS, DOES are dropped as "plurals". Harmless (still valid guesses). Optionally add a `STEM_KEEP` list in the script if the owner wants any back. Not-dropped irregulars (e.g. MEN, CHILDREN) are not caught by the rule and need `exclude.txt` at review.
**Warning signs:** an answer count that falls by more than about 10% after a rule tweak; run the build with a printed dropped sample.

### Pitfall 2: Measured pool sizes (use for D-06 / D-11)
Measured with `english/10`, `english/20`, `english/american/10`, `english/american/20` (a-z only), stem rules above, obscenity filter, 2026-10-01:

| Length | Tier 10+20 candidates | After stem drop | After obscenity | Guess pool (all tiers, all dialects) | Guess raw | Guess gzip | Guess brotli |
|--------|----|----|----|----|----|----|----|
| 4 | 927 | 802 | 799 | 3204 | 16.0 KB | 8.1 KB | 6.7 KB |
| 5 | 1365 | 888 | 888 | 6510 | 39.1 KB | 19.0 KB | 12.4 KB |
| 6 | 1651 | 971 | 970 | 10908 | 76.4 KB | 35.2 KB | 24.4 KB |

Note D-01 says "english/10 and english/20 (American list)". The package has no pure "american" list at that key; `english/10` and `english/20` are dialect-neutral and `english/american/10|20` are American-only additions (only +3/+10/+11 words). Recommendation: union of `english/10`, `english/20`, `english/american/10`, `english/american/20`. The highest tier in this package is **70**, not 95 as CONTEXT D-08 says (the tier set is 10, 20, 35, 40, 50, 55, 60, 70); "all tiers" means those. For the guess pool union all keys of the package (all dialect lists too), filtered to `/^[a-z]+$/` and length. The aggregate keys (`english`, `english/american`, ...) already exist; use `Object.values(wordlist).flat()` into a Set.
**Recommended thresholds:** D-06 minimum answers per length: **500** (observed minimum 799, so a 40% over-filter margin; 300 is too loose to detect a broken rule). D-11 budget: gzip per length file **<= 50 KB** for 6 letters and **<= 30 KB** for 5 and **<= 15 KB** for 4 (about 25 to 40% headroom over measured 35/19/8; slang adds under 2 KB). Measure with `zlib.gzipSync` on the JSON file bytes. Importantly the 4-letter answer list is 799 words: full owner review of 4-letter is realistic; 5 and 6 are skimmed.

### Pitfall 3: Obscenity matcher API and substring false positives
**API (verified in README):** `new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers })`, then `matcher.hasMatch(text)`. It matches **substrings** of text with word-boundary heuristics on short inputs. Measured on real data: it flags `cums`, `rape`, `sexy` (4-letter) and `assort` (6-letter!) in the tier-10/20 set; it did not flag `kill`/`nazi`. So (a) it has false positives (ASSORT), (b) it misses violence/hate terms, so `blocklist.txt` is mandatory. Print every hit (with word) in the build log; do not silently drop for the answers; the owner review catches both directions (ASSORT can be rescued with an optional `allow-answers.txt`, or just accepted as one lost word: the cost is 1 word).
For slang (D-17): run the same matcher, never drop, set the `blocklist hit` flag in `slang-review.md`.
`blocklist.txt` format: one word per line, `#` comments, lowercase; seed with slurs, hate terms, sexual and violence terms that obscenity misses (e.g. kill, nazi, gore-type words, plus the obvious ethnic/homophobic slurs). Do not enumerate slurs in docs; keep the file the single source.

### Pitfall 4: Nondeterministic build breaks the drift check
Sort all outputs, use `\n` line endings (`.gitattributes` handles checkout), don't write timestamps, don't depend on `Object` key order of the package, and run `prettier` ignore on generated JSON (`.prettierignore`). `slang-review.md` is generated: it contains no date. Make `build:words` pure given inputs. CI drift step: `npm run build:words && git diff --exit-code -- src/data scripts/words/slang-review.md`; also catches untracked new files with `git status --porcelain` (git diff alone ignores untracked: use `test -z "$(git status --porcelain src/data)"`).
Windows note: `eol=lf` in `.gitattributes` and `fs.writeFileSync(..., 'utf8')` with explicit `\n` avoids CRLF diffs locally.

### Pitfall 5: Layout does not fit at 320x500 per the UI-SPEC budget
See Pattern 5: arithmetic gives 536 px vs 500 px with the spec's floors. The planner must choose compact rules at <=520 px viewport height (e.g. single-row header with smaller title, tile floor 36 px, key height 36 px) or relax the 500 test height. The E2E test (D-19) will fail otherwise. Flag in plan as a design decision.

### Pitfall 6: Double handling of Enter and focus
After clicking an on-screen key, focus stays on the button; pressing Enter then triggers the button click AND the window keydown (double submit). Handle by ignoring window keydown when `event.target` is a `button`/`[role=radio]` and letting buttons handle themselves, or blur after click. Also after finishing a game move focus to "Play again" (UI-SPEC), after Play again focus `document.body`.

### Pitfall 7: Length switching races
Switching length during a pool load or reveal: ignore during reveal (UI-SPEC), and for loads use a request token so a late resolution of length 4 does not overwrite game state for length 6. `startGame(length)` should set `status:'loading'` and only apply pools if `get().length === length`.

### Pitfall 8: StrictMode and the initial pool load
Effects run twice in dev; memoised promise cache plus idempotent `startGame` handles it. Do not put the answer pick in the load effect's `.then` without a token check.

### Pitfall 9: Vitest picks up e2e or scripts
Vitest `include` is `src/**/*.test.{ts,tsx}`. E2E files live in `e2e/*.spec.ts` (different suffix), fine. To test `scripts/words/lib.mjs`, either widen `include` or write them as `.ts`; `tsc -b` includes only `src`, so script tests would be unchecked by tsc unless added to `tsconfig.node.json`. Recommended: widen `include` to `['src/**/*.test.{ts,tsx}','scripts/**/*.test.{js,mjs,ts}']`.

### Pitfall 10: Tile letter casing and a11y labels
Store letters lowercase; display uppercase with CSS; `aria-label` per tile (UI-SPEC). Don't change labels mid-flip (nice-to-have).

## Code Examples

### pickAnswer (WORD-05, D-22)
```ts
export function pickAnswer(answers: readonly string[], rng: () => number = Math.random): string {
  if (answers.length === 0) throw new Error('empty answer pool')
  return answers[Math.min(answers.length - 1, Math.floor(rng() * answers.length))]
}
```
Tests: `rng=()=>0` returns first, `()=>0.999999` last, `()=>1` still in range; with a seeded PRNG (mulberry32) 10 000 draws cover a 4-word pool near uniformly (loose tolerance); repeats allowed (same rng value twice returns same word; no "avoid last" logic).

### build-words core (sketch)
```js
import wl from 'wordlist-english'
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity'
const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers })
const az = /^[a-z]+$/
const all = new Set(Object.values(wl).flat().filter(w => az.test(w)))      // stem lookup + guess source
const common = new Set(['english/10','english/20','english/american/10','english/american/20'].flatMap(k => wl[k]).filter(w => az.test(w)))
// per length L: answers = common(L) - inflections(all) - matcher hits - blocklist - exclude ; sorted
//               guesses = all(L) + answers + slang(L) + extra-guesses(L) ; sorted ; extra = guesses - answers
```
Read text lists with a helper that strips `#` comments and blank lines and lowercases; fail the build on a non-a-z entry or wrong-length entry in `extra-guesses.txt`.

### Playwright hook
```ts
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { (window as any).__WORDLE_TEST__ = { answer: 'crane' } })
})
```
For a 6-letter or 4-letter test supply the right length word and select that length first; the hook is ignored if not in the pool (answer for a length the hook doesn't match falls back to random: make the test hook a map `{4:'word',5:'crane',6:'planet'}`).

### CI additions (extend `.github/workflows/ci.yml`, existing actions are checkout@v7 and setup-node@v7)
```yaml
  words:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npm run build:words
      - run: git diff --exit-code && test -z "$(git status --porcelain)"
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with: { name: playwright-report, path: playwright-report/, retention-days: 14 }
```
`actions/upload-artifact` latest is v7.0.1 [VERIFIED: gh api releases, 2026-10-01]. Add `npm run check:bundle` after `build` in the `check` job.

## State of the Art

| Old | Current | Impact |
|-----|---------|--------|
| `100vh` | `100dvh` with `100vh` fallback | Mobile browser chrome safe |
| JS measuring for tile size | CSS container query units | No resize observer needed (verify browser support: cq units are baseline since 2023) |
| Playwright default devices | `devices['Pixel 7']` | Mobile project |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vite 8 (Rolldown) emits JSON dynamic imports as separate async chunks and the entry chunk excludes them | Pattern 4 | QA-06 fails; mitigated by check-bundle script; fallback: export JSON as `.ts` string module |
| A2 | `resolveJsonModule` works under TS 6 bundler resolution without extra config | Pattern 4 | Small tsconfig tweak |
| A3 | CSS container-query units (`cqw`/`cqh`) fine for the grid on target phones | Pattern 5 | Fall back to a small JS measure (UI-SPEC permits either) |
| A4 | A Playwright `reducedMotion: 'reduce'` context option shortens the app's JS timing via `matchMedia` | Pattern 8 | Tests slower; no correctness issue |
| A5 | Owner is fine with the optional union of `english/american/10,20` for D-01 | Pitfall 2 | Adds 3-11 words per length; trivial |

## Open Questions

1. **UI-SPEC fit at 320x500** (see Pitfall 5). Recommendation: planner picks compact breakpoints (tile floor 36 px, key height 36 px, single-row header at <=520 px height) or lowers the E2E height; record the choice.
2. **ASSORT-style obscenity false positives in answers.** Recommendation: accept the loss; optional `allow` file only if the owner wants it at the D-07 review.
3. **Slang draft effort**: 80-150 words per length with definitions (about 300-450 entries) is the largest manual content task; start early in parallel, owner reviews via generated `slang-review.md`. `slang.json` shape fixed by D-15; add a `flags` computation only in the review table.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | yes | v24.19.0 | none |
| npm registry | installs | yes | | none |
| git / gh | drift check, CI | yes | | none |
| Playwright Chromium | E2E | not yet installed | `npx playwright install chromium` | none (required) |
| Python slopcheck | audit only | installed | 0.6.1 | n/a |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.3 (+ jsdom for components, node for logic); Playwright 1.63.0 for E2E |
| Config file | `vite.config.ts` (`test.include` to widen for `scripts/`), `playwright.config.ts` (new, Wave 0) |
| Quick run command | `npx vitest run src/logic scripts` |
| Full suite command | `npm run lint && npm run typecheck && npm test && npm run build && npm run check:bundle && npx playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLAY-01 | grid dims 5/6/7 for 4/5/6 | unit+component | `npx vitest run src/components/Grid.test.tsx` | Wave 0 |
| PLAY-02 | ABBEY/BABES, SPEED/ERASE, triples | unit | `npx vitest run src/logic/score.test.ts` | Wave 0 |
| PLAY-03 | short/invalid rejected, no attempt used | store unit + e2e | `npx vitest run src/store/gameStore.test.ts`; `npx playwright test -g invalid` | Wave 0 |
| PLAY-04 | key best-state merge; physical keyboard | unit + component | `npx vitest run src/logic/keys.test.ts src/components/Keyboard.test.tsx` | Wave 0 |
| PLAY-05 | input blocked during reveal; keys after reveal | store unit with fake timers | `npx vitest run src/store/gameStore.test.ts` | Wave 0 |
| PLAY-06 | answer shown on loss | e2e | `npx playwright test -g lose` | Wave 0 |
| WORD-02 | stem rule cases; blocklist/exclude honoured | unit on `scripts/words/lib.mjs` | `npx vitest run scripts/words` | Wave 0 |
| WORD-05 | pickAnswer uniform/injectable/repeats | unit | `npx vitest run src/logic/pickAnswer.test.ts` | Wave 0 |
| WORD-07 | build invariants; drift | unit on generated JSON + CI | `npx vitest run src/data/words.test.ts`; `npm run build:words && git diff --exit-code` | Wave 0 |
| WORD-09 / QA-06 | pools not in entry chunk | script after build | `npm run build && node scripts/check-bundle.mjs` | Wave 0 |
| UI-01 | design tokens present, no hard-coded hex in component CSS | lint-ish grep test | manual + review | manual-only (visual) |
| UI-06 | no vertical scroll at 320x500/568/640, 6 letters | e2e | `npx playwright test -g scroll` | Wave 0 |
| UI-09 | reduced motion: no animation, reveal 150 ms | e2e (`reducedMotion`) + CSS | `npx playwright test -g "reduced motion"` | Wave 0 |

D-13 invariants test (`src/data/words.test.ts`): answers ⊆ guesses, no dupes, a-z, length, no blocklist/exclude among answers, no slang among answers, counts >= 500. `slang.json` validation test (D-18).

### Sampling Rate
- Per task commit: `npx vitest run <touched dir>`
- Per wave merge: full unit suite + `npm run build`
- Phase gate: full suite plus E2E green, owner review (D-07) complete

### Wave 0 Gaps
- [ ] `playwright.config.ts`, `e2e/` specs, Playwright install
- [ ] `src/logic/score.test.ts`, `pickAnswer.test.ts`, `keys.test.ts` (written before implementation, D-21)
- [ ] `scripts/words/lib.mjs` tests, `src/data/words.test.ts`, `slang.test.ts`
- [ ] vitest `include` widening; `.prettierignore` for generated JSON; `check:bundle` script

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4 Auth, Session, Access | no (no accounts, static site) | none |
| V5 Input Validation | yes (light) | typed key handler accepts only `/^[a-zA-Z]$/`; guess validated against Set; test hook inert unless set |
| V6 Cryptography | no | `Math.random` is fine (no stakes) |
| V12 Supply chain | yes | pinned versions, slopcheck [OK], devDependencies for build-only packages |
| Content safety | yes | blocklist applies to answers; slurs never answers (R-POOL-8); owner review |

### Known Threat Patterns
| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| Answer inspectable in bundle | Information disclosure | Accepted (unlimited, no-stakes); do not claim secrecy |
| Test hook abused in production | Tampering | Only affects the player's own local game; no URL parameter (D-22) |
| Offensive answer reaches a player | Reputation | blocklist + exclude + owner checkpoint D-07 |
| Third-party package slop | Supply chain | slopcheck OK on all four |

## Project Constraints (from CLAUDE.md)
- React + Vite + TypeScript (TS pinned `~6.0.3`), Vitest, Playwright; Zustand 5 for state; plain CSS + custom properties; no Tailwind or CSS-in-JS.
- Static site on Vercel; no server; localStorage only (persistence is Phase 4).
- Design: minimal, soft; accessibility: prefers-reduced-motion, screen reader and keyboard-only play.
- Content: slang may be mildly crude, never slurs/hate; Normal answers are clean common words (relaxed by D-04).
- `wordlist-english` is build-time only, never imported by `src/`; Node 24; `Math.random` answer picking must be injectable; flat ESLint config; Prettier separate from ESLint.
- Pitfalls to honour: StrictMode (actions not effects), visibilitychange only relevant in Phase 5, `tsconfig` has `erasableSyntaxOnly`.
- Work through GSD workflow commands before edits; user memory says save plans as plan.txt and do not code until told.

## Sources

### Primary (HIGH)
- Local measurement: `wordlist-english@1.2.1` and `obscenity@0.4.6` installed in a scratch dir; counts, gzip sizes, API behaviour measured 2026-10-01
- npm registry: zustand 5.0.15, @playwright/test 1.63.0, obscenity 0.4.6 (README API), wordlist-english last modified 2022-06-29
- Repo files: CONTEXT, UI-SPEC, SPEC.md R-* rules, REQUIREMENTS, ci.yml, vite.config.ts, tokens.css, boards.ts, package.json
- `gh api` for actions/upload-artifact latest v7.0.1

### Secondary (MEDIUM)
- `.planning/research/ARCHITECTURE.md` and `PITFALLS.md` (lazy chunk and format guidance)

### Tertiary (LOW)
- Vite 8/Rolldown JSON chunking, Playwright 1.63 config option names from training knowledge (flagged A1, Pattern 8)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (registry-checked, slopcheck OK)
- Pipeline numbers and stem rules: HIGH (measured on the real data)
- Architecture and CSS fit: MEDIUM (UI-SPEC arithmetic gap at 500 px)
- Playwright/Vite specifics: MEDIUM (not executed here)

**Research date:** 2026-10-01
**Valid until:** 2026-10-31 (word package is frozen since 2022; tooling versions fast-moving)
