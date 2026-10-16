# Phase 2: Playable Normal Game - Pattern Map

**Mapped:** 2026-10-01
**Files analyzed:** 40 (new/modified)
**Analogs found:** 14 with a real analog / 40. Phase 1 is a skeleton (about 8 source files), so most files are greenfield and should follow RESEARCH.md patterns, with the Phase 1 conventions below.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/logic/score.ts` + `score.test.ts` | utility (pure) | transform | `src/logic/boards.ts` + `boards.test.ts` | role-match (style) |
| `src/logic/pickAnswer.ts` + test | utility (pure) | transform | `src/logic/boards.ts` | role-match |
| `src/logic/keys.ts` + test (`mergeKeyState`) | utility (pure) | transform | `src/logic/boards.ts` | role-match |
| `src/state/gameStore.ts` + `src/state/gameStore.test.ts` (plus `src/state/copy.ts`, `src/state/testHook.ts`) | store | event-driven | none | no analog (RESEARCH Pattern 3) |
| `src/data/wordData.ts` | service (loader) | request-response (lazy import) | none | no analog (RESEARCH Pattern 4) |
| `src/data/words-{4,5,6}.json` | generated data | batch | none | no analog |
| `src/data/wordData.test.ts`, `scripts/words/pools.test.mjs`, `scripts/words/slang.test.mjs` | test | transform | `src/logic/boards.test.ts` | role-match |
| `src/components/*` (Header, LengthPicker, Grid, Tile, Keyboard, Toast, Banner) | component | request-response | `src/App.tsx` | partial |
| `src/components/*.test.tsx` | test (jsdom) | request-response | `src/App.test.tsx` | exact |
| `src/App.tsx` (modify), `src/main.tsx` (modify) | component / entry | request-response | themselves | exact |
| `src/styles/tokens.css` (extend), `game.css` (new) | config (CSS) | n/a | `src/styles/tokens.css`, `global.css` | exact |
| `scripts/build-words.mjs`, `scripts/words/lib.mjs` | utility (build script) | batch / file-I/O | none (no `scripts/` dir) | no analog |
| `scripts/words/lib.test.mjs` | test | transform | `src/logic/boards.test.ts` | role-match |
| `scripts/words/{blocklist,exclude,extra-guesses}.txt`, `slang.json`, `slang-review.md` | data/config | file-I/O | none | no analog |
| `scripts/check-bundle.mjs` | utility | file-I/O | none | no analog |
| `playwright.config.ts`, `e2e/*.spec.ts` | config / test | request-response | none | no analog (RESEARCH Pattern 8) |
| `vite.config.ts` (modify) | config | n/a | itself | exact |
| `eslint.config.js` (modify) | config | n/a | itself | exact |
| `.prettierignore`, `package.json`, `tsconfig.app.json` (modify) | config | n/a | themselves | exact |
| `.github/workflows/ci.yml` (modify: `words`, `e2e` jobs, `check:bundle`) | config (CI) | n/a | existing `check` job | exact |
| `docs/PIPELINE.md` (modify) | docs | n/a | itself | exact |

## Pattern Assignments

### `src/logic/score.ts`, `pickAnswer.ts`, `keys.ts` (utility, transform)

**Analog:** `src/logic/boards.ts` (lines 1-7). Conventions: no semicolons, single quotes, named exports, no default exports in logic, string-literal unions (no enums; `erasableSyntaxOnly` is on), `as const` config.

```ts
export const BOARD_CONFIG = {
  4: { attempts: 5 },
  5: { attempts: 6 },
  6: { attempts: 7 },
} as const

export type WordLength = keyof typeof BOARD_CONFIG
```

Reuse `WordLength` and `BOARD_CONFIG[len].attempts` for grid sizing; do not redefine. Code bodies: copy RESEARCH.md Pattern 2 (`score`), the "pickAnswer" Code Example, and `mergeKeyState` rank `{absent:1, present:2, correct:3}`.

**Test pattern** (analog `src/logic/boards.test.ts` lines 1-16): colocated, node environment (default in `vite.config.ts`), `describe` titled with the SPEC rule ID, explicit vitest imports:

```ts
import { describe, expect, it } from 'vitest'
import { BOARD_CONFIG } from './boards'

describe('R-LEN-1 BOARD_CONFIG', () => {
  it('gives 5, 6 and 7 attempts for 4, 5 and 6 letters', () => {
    expect(BOARD_CONFIG[4].attempts).toBe(5)
```

Use `describe('R-SCORE-2 ...')` etc. Extensionless relative imports (`'./boards'`). Test-first per D-21 (commit tests before implementation).

---

### `src/components/*.tsx` (component) and `*.test.tsx`

**Analog:** `src/App.tsx` and `src/App.test.tsx`. Function components with `export default function X()`, no semicolons, plain CSS classNames (no CSS-in-JS).

```tsx
export default function App() {
  return (
    <main className="placeholder">
      <h1>Unlimited Wordle</h1>
```

**Component test pattern** (`src/App.test.tsx` lines 1-13): per-file jsdom pragma, explicit `cleanup`, query by role/name (not testids), `.toBeTruthy()` (jest-dom is not installed):

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

it('shows the product name as the level-1 heading', () => {
  render(<App />)
  expect(
    screen.getByRole('heading', { level: 1, name: 'Unlimited Wordle' }),
  ).toBeTruthy()
})
```

Note: `src/App.test.tsx` asserts the placeholder heading and "Coming soon". When `App.tsx` is replaced, rewrite this test (keep the h1 "Unlimited Wordle" assertion if the Header still renders it; drop the coming-soon test).

**ESLint constraint** (`eslint.config.js` lines 11-17): `reactRefresh.configs.vite` is active, so component files should export only components (put hooks/constants in separate `.ts` files). `reactHooks` flat recommended (React-Compiler-derived rules) can flag setState-in-effect and ref access during render; prefer store actions over effects.

---

### `src/main.tsx` (entry, modify)

**Analog:** itself (lines 1-11). Keep StrictMode, the CSS import order (tokens before global; add `game.css` after), and the `.tsx` import extension style `./App.tsx` (allowed by `allowImportingTsExtensions`).

```tsx
import './styles/tokens.css'
import './styles/global.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Per RESEARCH Pattern 3, call `startGame` here before `render` (or once-guarded) rather than in an effect.

---

### `src/styles/tokens.css` and `game.css` (CSS)

**Analog:** `src/styles/tokens.css` (lines 1-13): all tokens on `:root`, kebab-case `--color-*`, `--radius-*`, `--space-*`, `--font-body`. Extend (add tile/key/state colours, `--ease`, durations from UI-SPEC); never rename or replace the existing ones.

```css
:root {
  --color-bg: #fbfaf7;
  --color-accent: #a9c4b0;
  --radius-tile: 14px;
  --space-1: 4px;
```

`src/styles/global.css` (lines 1-13): global `box-sizing` reset and `body` rules. Modify `body { min-height: 100vh }` to the `100vh` then `100dvh` column strategy (RESEARCH Pattern 5); remove the `.placeholder` rules when the placeholder goes. Component CSS uses `var(--token)` only, no hard-coded hex (UI-01).

---

### `vite.config.ts` (modify)

**Analog:** itself (lines 6-9). Widen `include` for script tests (RESEARCH Pitfall 9). Keep `environment: 'node'` default:

```ts
test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
// becomes
test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.{js,mjs,ts}'] },
```

`tsconfig.node.json` includes only `vite.config.ts`; add `playwright.config.ts` there (it uses node types). `tsconfig.app.json` includes `src` only: `src/data/*.json` dynamic imports need `"resolveJsonModule": true` possibly (A2); `types: ["vite/client"]` already present. A `Window` declaration for `__WORDLE_TEST__` goes in a `src/*.d.ts` inside `src`. `e2e/*.spec.ts` is not covered by tsc (add to `tsconfig.node.json` include or a new `e2e/tsconfig.json` if typechecking is wanted).

---

### `eslint.config.js` (modify)

**Analog:** itself. Only `**/*.{ts,tsx}` is linted with `globals.browser`; `.mjs` scripts are unlinted. To lint scripts, add a second block mirroring the first:

```js
{
  files: ['**/*.{ts,tsx}'],
  extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  languageOptions: { ecmaVersion: 2023, globals: globals.browser },
},
// add: { files: ['scripts/**/*.mjs','e2e/**','playwright.config.ts'], languageOptions: { globals: globals.node } }
// add: globalIgnores 'playwright-report', 'test-results'
// optional no-restricted-imports for **/data/words-*.json outside wordData.ts
```

Add `playwright-report` and `test-results` to `globalIgnores(['dist', 'coverage'])` (line 9) and to `.gitignore`/`.prettierignore`.

---

### `.prettierignore`, `package.json` (modify)

**Analog:** `.prettierignore` is one entry per line (`dist`, `coverage`, `package-lock.json`, `.planning`, `docs`, `*.md`, `plan.txt`). Add `src/data/*.json`, `playwright-report`, `test-results` (`*.md` already covers `slang-review.md`). Prettier config is `.prettierrc.json` (no semicolons, single quotes style observed in code); `format:check` runs over everything, including `scripts/**/*.mjs` and `e2e`, so new files must be Prettier-clean (no semicolons, single quotes, trailing commas as in the existing files).

`package.json` scripts follow `name: command` style; add:
`"build:words": "node scripts/build-words.mjs"`, `"check:bundle": "node scripts/check-bundle.mjs"`, `"test:e2e": "playwright test"`. Dependencies: `zustand` in `dependencies`; `@playwright/test`, `wordlist-english`, `obscenity` in `devDependencies`. `"type": "module"` is already set, so `.mjs`/ESM works; `engines.node >=22.12`.

---

### `.github/workflows/ci.yml` (modify)

**Analog:** existing `check` job (lines 11-26). Copy its header and setup steps verbatim for the new `words` and `e2e` jobs:

```yaml
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run build
```

Append `- run: npm run check:bundle` after the `build` step. New jobs (`words`, `e2e`) per RESEARCH "CI additions"; `e2e` adds `npx playwright install --with-deps chromium`, `npx playwright test`, `actions/upload-artifact@v7` with `if: ${{ !cancelled() }}`. Workflow-level `permissions: contents: read` and `concurrency` already apply. Drift check must also catch untracked files (`git status --porcelain`), per Pitfall 4.

---

### `src/state/gameStore.ts` (store, event-driven) - NO ANALOG

Zustand is not installed and there is no store in the repo. Follow RESEARCH Pattern 3 (state shape, actions `startGame/typeLetter/backspace/submit/finishReveal`, idempotent `finishReveal`, request-token for stale loads, answer picked inside `startGame`). Match Phase 1 style (no semicolons, single quotes, string unions, `import type` under `verbatimModuleSyntax`: type-only imports must use `import type { WordLength } from '../logic/boards'`). Test colocated in `src/state/gameStore.test.ts`, node environment, with injected fake deps (a recording setTimer instead of real timers; `vi.useFakeTimers()` only where real timers are used, per STACK.md).

### `src/data/wordData.ts` - NO ANALOG
Follow RESEARCH Pattern 4 (explicit loader map, memoised promise cache cleared on failure). Only file allowed to import `words-N.json`.

### `scripts/build-words.mjs`, `scripts/words/lib.mjs`, `check-bundle.mjs` - NO ANALOG
No `scripts/` directory exists. Use RESEARCH "build-words core" sketch and Pitfalls 1-4. Keep helpers pure in `lib.mjs` with tests at `scripts/words/lib.test.mjs` (needs the `vite.config.ts` include widening above). Write output with explicit `\n`, sorted, utf8 (`.gitattributes` already forces `eol=lf`).

### `playwright.config.ts`, `e2e/*.spec.ts` - NO ANALOG
Copy RESEARCH Pattern 8 config and "Playwright hook" example. Name e2e tests so `-g invalid`, `-g lose`, `-g scroll`, `-g "reduced motion"` match the Validation map.

## Shared Patterns

### Code style (all new TS/TSX/MJS)
**Source:** `src/logic/boards.ts`, `src/App.tsx`, `.prettierrc.json`. No semicolons, single quotes, trailing commas in multiline, 2-space indent. Run `npm run format` before commit; CI runs `format:check` on everything not ignored.

### TypeScript strictness
**Source:** `tsconfig.app.json` lines 12-23. `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no enums, namespaces, parameter properties), `noUnusedLocals/Parameters`, target ES2023. `typecheck` is `tsc -b`, which also gates `npm run build`.

### Test layout and environment
**Source:** `vite.config.ts` line 8, `src/App.test.tsx` line 1. Logic tests are colocated `*.test.ts` in node; component tests add `// @vitest-environment jsdom` and `afterEach(cleanup)`. Cite SPEC rule IDs in `describe` names.

### Tokens only for styling
**Source:** `src/styles/tokens.css`. All colour, spacing, radius via CSS custom properties; extend rather than replace.

### CI job skeleton
**Source:** `.github/workflows/ci.yml` lines 12-21 (checkout@v7, setup-node@v7 with `.nvmrc` + npm cache, `npm ci`).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/state/gameStore.ts` | store | event-driven | No store or Zustand yet; use RESEARCH Pattern 3 |
| `src/data/wordData.ts`, `words-*.json` | loader / data | lazy import | No data layer yet; RESEARCH Pattern 4 |
| `scripts/**` (build-words, lib, check-bundle, txt lists, slang.json) | build scripts | batch / file-I/O | No `scripts/` directory exists; RESEARCH sketch and Pitfalls 1-4 |
| `playwright.config.ts`, `e2e/**` | E2E | request-response | Playwright not installed; RESEARCH Pattern 8 |
| Grid/Tile/Keyboard CSS animations | CSS | n/a | No animations yet; RESEARCH Patterns 5-6 and 02-UI-SPEC.md |

## Planner flags (found while mapping)

- `src/App.test.tsx` will break when `App.tsx` is replaced; plan its rewrite in the same task.
- ESLint only covers `ts/tsx`; decide whether to extend to `.mjs` scripts and `e2e`.
- `format:check` covers `scripts/**` and `e2e/**`; generated `src/data/*.json` must be added to `.prettierignore` in the same plan that first commits them.
- `tsconfig` projects do not include `scripts/`, `e2e/` or `playwright.config.ts`; extend `tsconfig.node.json` include if typechecking them is desired.
- RESEARCH Pitfall 5 (UI-SPEC 320x500 does not fit with 40 px floors) is a design decision the plan must resolve before the E2E scroll test.

## Metadata

**Analog search scope:** whole repo (`git ls-files`, excluding `.planning`); only 8 source files, 13 config files exist.
**Files scanned:** boards.ts, boards.test.ts, main.tsx, App.tsx, App.test.tsx, tokens.css, global.css, vite.config.ts, eslint.config.js, package.json, ci.yml, .prettierignore, tsconfig.app.json, tsconfig.node.json
**Pattern extraction date:** 2026-10-01
