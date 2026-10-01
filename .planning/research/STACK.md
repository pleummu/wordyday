# Technology Stack

**Project:** Unlimited Wordle (Normal + Wordubado)
**Researched:** 2026-10-01
**Method:** versions checked against the npm registry on 2026-10-01 (`npm view`). Peer-dependency and engine claims come from registry metadata (HIGH). Word-list facts come from inspecting the published `wordlist-english@1.2.1` tarball (HIGH). Pattern and rationale claims are MEDIUM unless noted.

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | 19.3.0 | UI | Chosen. Plain function components and hooks; no need for Next.js (static SPA). | HIGH |
| Vite | 8.3.2 | Dev server and build (Rolldown-based) | Chosen. Node engines `^20.19 \|\| >=22.12`. Static `dist/` is exactly what Vercel serves. | HIGH |
| @vitejs/plugin-react | 6.1.1 | JSX/Fast Refresh | v6 requires Vite 8 and is Oxc-based (no Babel). Do not add the React Compiler; not needed. | HIGH |
| TypeScript | **6.0.3** (pin `~6.0.3`) | Types | See "TypeScript 7 trap" below. | HIGH |
| Node.js (dev + CI) | 24 LTS (`.nvmrc` = 24) | Runtime | Vitest 5 needs `^22.12 \|\| ^24 \|\| >=26`; Vite 8 needs 20.19+. 24 satisfies all. | HIGH |

**TypeScript 7 trap.** `npm` `latest` for typescript is now 7.0.2, but `typescript-eslint@8.71.0` declares `typescript: >=4.8.4 <6.1.0`. Installing TS 7 gives peer-dependency errors and a broken `typescript-eslint` setup. Pin `typescript@~6.0.3` until typescript-eslint widens its range. Revisit at roadmap time and again at the phase that touches tooling. `tsc --noEmit` in CI is the typecheck, with `vite build` doing no type checking.

### State Management
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.0.15 | Game/stats/settings store with `persist` middleware | Recommended over useReducer+Context. See rationale below. | MEDIUM-HIGH |

**Why Zustand, not useReducer/Context:**
- State is large and cross-cutting: 6 boards, stats, day streak, restores, settings. Context re-renders every consumer on any change; Zustand selectors avoid re-rendering all tiles on every keystroke.
- The `persist` middleware has `version` + `migrate` + `partialize`, which maps directly onto the requirement "saved data has a version number and is migrated on load". Do not hand-roll this around Context.
- Store actions can be called from outside React (the physical-keyboard `keydown` listener, `visibilitychange` handler for the missed-day check) and are unit-testable without rendering.
- ~1 KB, one dependency, minimal ceremony; fits a learning project.

**Hard rule for the roadmap:** keep `src/logic/*` (evaluate, pickAnswer, streaks, storage) as **pure functions with no Zustand/React imports**. The store only calls them. This keeps the highest-risk logic (repeated-letter scoring, Restore rules) trivially testable, and means the store library choice is cheap to reverse. Inject `now`/`today` and the RNG into pure functions; do not call `Date.now()` or `Math.random()` inside them (needed for the 10,000-draw 75/25 test and the clock-moved-backwards test).

Persist gotchas: `persist` writes to localStorage under one key; use `partialize` to exclude transient UI state (open modals, toast); handle `QuotaExceeded`/private-mode failures by wrapping storage in try/catch (supply a custom `createJSONStorage` wrapper); the `version`/`migrate` must be tested with a v1 fixture from day one.

### Styling and Animation
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Plain CSS (CSS Modules or one global file) + CSS custom properties | n/a | Themes (light/dark/colour-blind) and all animation | Themes are just variable sets on `[data-theme]`/`[data-palette]`. No dependency, no runtime cost. | HIGH |
| CSS `@keyframes` + `animation-delay` | n/a | Tile flip, pop, shake | Flip stagger is `animation-delay: calc(var(--i) * 300ms)`; shake and pop are short keyframes. Re-trigger by toggling a class/`key`. | HIGH |
| `@media (prefers-reduced-motion: reduce)` | n/a | Accessibility | Replace flip/shake/pop with an instant colour change or a simple opacity fade; keep the state change visible. Also read the same media query in JS if anything uses timing (e.g. delay before the result modal), because the reveal delay must also shrink. | HIGH |

**Do NOT use framer-motion/motion, react-spring, or GSAP.** Three keyframe animations do not justify 30-100 KB, and JS-driven animation makes the reduced-motion path and Playwright tests harder. Tailwind is also **not recommended** here (see Alternatives): the design is a small custom themed component set, and hand-written CSS is a better learning fit than utility classes for a "soft, airy" bespoke look.

**Animation timing and tests:** Playwright E2E should wait on state (data attributes such as `data-state="correct"` on tiles, set at the *end* of reveal or exposed immediately for assertion), not on `waitForTimeout`. Provide `data-testid`s and set `reducedMotion: 'reduce'` in the Playwright config's `use` so tests run fast and also exercise the reduced-motion path. Recommend a `prefers-reduced-motion` Playwright project or test to verify it.

### Testing
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | 5.0.3 | Unit and component tests | Chosen. Shares the Vite config. Requires Node `^22.12 \|\| ^24`. | HIGH |
| @vitest/coverage-v8 | 5.0.3 (must match Vitest exactly) | Coverage | Optional; matches vitest version pin. | HIGH |
| jsdom | 30.1.1 | DOM environment for component tests | Safer default than happy-dom for correctness; peer of Vitest is `*`. Use `// @vitest-environment node` (the default) for `src/logic/**` tests and jsdom only where needed. Use `vi.useFakeTimers()` and `vi.setSystemTime()` for streak/date tests. | MEDIUM |
| @testing-library/react | 16.3.3 | Component tests | Standard. Needs `@testing-library/dom` and `@types/react-dom` as peers (install them). | HIGH |
| @testing-library/user-event | 14.6.7 | Simulated typing | Standard. | HIGH |
| @testing-library/jest-dom | 7.0.1 | Matchers (`toBeVisible` etc.) | Optional; import `@testing-library/jest-dom/vitest` in setup. | MEDIUM |
| @playwright/test | 1.63.0 | E2E | Chosen. Test against `vite preview` (production build), not the dev server. Chromium only in CI to start (add a mobile viewport project, e.g. Pixel 7, for "works at phone width"); add Firefox/WebKit later if wanted. | HIGH |
| @axe-core/playwright | latest at install time | Automated a11y checks | Cheap way to back the accessibility requirement (contrast in all 3 palettes, modal roles). Not version-checked here. | LOW-MEDIUM |

Playwright config essentials: `webServer: { command: 'npm run build && npm run preview -- --port 4173', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI }`, `retries: process.env.CI ? 2 : 0`, `trace: 'on-first-retry'`, upload `playwright-report/` as a CI artifact on failure. Make E2E deterministic: expose a way to fix the answer (e.g. a build-time/URL-param or `localStorage` seed injected via `page.addInitScript`; or mock `Math.random`) so tests can play a known word. Decide this in the architecture phase; without it E2E "full games" are impossible. Also `page.route()` to mock dictionaryapi.dev (never hit the real API from CI).

### Lint and Format
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | 10.11.0 | Linting (flat config only) | Current major; `@eslint/js@10`, `typescript-eslint@8.71` and `eslint-plugin-react-hooks@7.1.1` all list ESLint 10 in peers. Use `eslint.config.js` with `defineConfig`. | HIGH (peers) |
| @eslint/js | 10.0.1 | Base rules | Peer requires `eslint ^10`. | HIGH |
| typescript-eslint | 8.71.0 | TS rules | Use `tseslint.configs.recommended` (add `recommendedTypeChecked` only if you want the slower type-aware rules; it is a reasonable learning step). | HIGH |
| eslint-plugin-react-hooks | 7.1.1 | Hooks rules (`rules-of-hooks`, `exhaustive-deps`) | Includes the newer React-Compiler-derived rules in `recommended`; some may be noisy on a first pass. | MEDIUM |
| eslint-plugin-react-refresh | 0.5.7 | Fast Refresh safety | Included in Vite's template; optional. | MEDIUM |
| globals | 17.13.0 | Env globals | Browser + node for config files. | HIGH |
| Prettier | 3.9.9 | Formatting | Keep separate from ESLint; add `eslint-config-prettier` only if rules conflict (not version-checked). Do **not** run Prettier as an ESLint rule. | HIGH |
| eslint-plugin-jsx-a11y | not version-checked | A11y lint | Worth adding given the explicit accessibility requirement; check the ESLint 10 peer range at install time. | LOW |

Scripts: `lint` = `eslint .`, `format:check` = `prettier --check .`, `typecheck` = `tsc -b --noEmit` (or `tsc --noEmit -p tsconfig.app.json`), `test` = `vitest run`, `test:e2e` = `playwright test`, `build` = `vite build`.

Skip Husky/lint-staged for v1: CI is the gate and the added tooling is not on the learning path the owner listed. Optional later.

### Word Data (build-time)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| wordlist-english | 1.2.1 (devDependency only) | Source of answer/guess candidates | Chosen. Data is derived from SCOWL, last published 2022-06, MIT-licensed (see its `Copyright` file for SCOWL attribution). It is **build-time only**: it is 1.5 MB of JSON and must never be imported by `src/`. | HIGH |
| obscenity | 0.4.6 | Profanity detector for the build script | Recommended blocklist engine (see below). | MEDIUM |

**What the package actually contains (verified by inspecting the tarball).** The package exports `wordlist['english/N']` (also `english/american/N`, etc.), where N is the SCOWL frequency tier: 10, 20, 35, 40, 50, 55, 60, 70 (lower = more common). Counts of pure a-z words by length 4/5/6:

| Tier | 4 | 5 | 6 |
|------|---|---|---|
| english/10 | 456 | 595 | 635 |
| english/20 | 468 | 760 | 1005 |
| english/35 | 936 | 2062 | 3582 |
| english/70 | 578 | 1329 | 2508 |

Tiers 10+20 give roughly 920 / 1355 / 1640 candidates, which is enough for a random-with-repeats answer pool. (Tiers 10-35 cumulative: ~2300 / ~3400 / ~5200.)

**Profanity is present in the data, even in common tiers.** I checked: `fuck`, `shit` (tier 40), `bitch`, `whore`, `slut`, `pussy`, `penis`, `faggot` (tier 35), `cunt`, `nigga` (tier 50), `rape` (tier 20), `dildo` (55). So **tier filtering alone does not satisfy "no offensive answers"**. A blocklist is mandatory for the answer pools.

**Word-list generation approach (opinionated):**
1. `scripts/build-words.mjs` (ESM, run with plain `node`) imports `wordlist-english`, and writes JSON into `src/data/`. Commit the generated JSON so a clone builds without regenerating, and so list diffs show up in PR review. Add an npm script `build:words` and a CI check that regenerating produces no diff (catches drift).
2. **Answers** = union of tiers `english/10` + `english/20` (optionally `/35` for 6-letter if the pool is thin), filtered by `/^[a-z]{N}$/`, minus the blocklist, minus a hand-maintained `exclude.txt` (obscure/ugly leftovers, proper-noun-ish items, abbreviations). Expect to review the final pool by eye; ~1500 words per length is reviewable. Consider also dropping likely plurals/inflections (`-s`, `-ed`, `-ing` forms of another word in the list) for the answer pool only, since many Wordle players find "plural answers" unsatisfying. (Product decision; flag it.)
3. **Guesses** = all tiers up to 70 (a-z, length N) **plus all slang words**, deduped. Do NOT filter profanity from the guess pool as aggressively: filtering it from guesses means the game says "not in word list" for a crude but real word; either is defensible, but the plan says guesses are a "large dictionary", so keep the blocklist for answers only and be explicit in SPEC.md. Do not use tiers 80+ (obscure/not in package anyway).
4. Slang words must be **excluded from the Normal answer pool** by construction (Normal answers come only from `answers-N.json`), and slang is added to `guesses-N.json`.
5. Output size: guesses ~5-9K words per length; ~40 KB gzip total. Ship as JSON loaded with `import` (bundled) or lazy `import()` per length. A sorted array plus a `Set` built at load is fine. No need for a trie.

**Blocklist source (recommended):** use `obscenity` (0.4.6, active, last published 2026-07) in the build script only, to flag candidates with its English preset (`englishDataset` + `englishRecommendedTransformers`), and additionally maintain `scripts/blocklist.txt` (hand-curated: slurs, sexual terms, and sensitive items such as `rape`, `nazi`, `kill`-type words you decide against). Pipeline: any answer candidate flagged by obscenity or in the blocklist file is dropped; the script prints the removed words so the owner can review. Rationale: obscenity is built for leetspeak/whole-word matching, which is overkill for plain a-z words but gives a maintained dataset; the hand-list covers what a profanity detector will not (e.g. `rape`, `dead`, `drunk`, `nazi`; these are "not great answers" rather than profanity). Alternative: the `bad-words` package (4.1.5, last published 2026-01) is simpler but has a smaller, older list; fine as a second pass. For a 4-6 letter whole-word check you could also just use the community "LDNOOBW" list (github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words, not fetched/verified here, LOW confidence) as a data file. **Because obscenity is only used at build time, put it in `devDependencies` and keep it out of the bundle.** Always manually skim the final answers files before shipping; no automated list is complete.

**Slang file (`slang.json`)** is hand-curated (planned). Have a unit test that validates every slang entry: lowercase a-z, correct length for the file, has a non-empty definition, no duplicates, none on the blocklist, and none appear in the Normal answer pool.

### Definitions API
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| dictionaryapi.dev | `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` | Definition for common words, on click only | Chosen; free, no key. Plain `fetch`, no library. | MEDIUM (not re-verified) |

Use `AbortController` with a ~5 s timeout, treat 404 and network errors as "Definition unavailable", and cache results in memory for the session (not localStorage). Public free service with no SLA: never call it during render or tests. It is a third-party request from the browser, so mention it in the how-to/privacy note (no key means no secret). Vercel static hosting has no CORS issue here because the API sends permissive CORS headers (MEDIUM; verify in the definitions phase).

### Infrastructure
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel (Hobby/free) | n/a | Hosting | Chosen. Vite is auto-detected: build `vite build`, output `dist`. | HIGH |
| GitHub Actions | `actions/checkout@v6`-class, `actions/setup-node`, `actions/upload-artifact` (use the latest majors; not verified) | CI | One workflow: install, lint, typecheck, unit, build, E2E. | MEDIUM |

**Vercel setup (recommended, simplest):** import the GitHub repo in the Vercel dashboard (Git integration). Vercel then creates Preview Deployments for every PR/branch push and a Production deployment on pushes to `main`, with no deploy step in GitHub Actions and no tokens/secrets to manage. Framework preset: Vite. No `vercel.json` needed for a single-page game with no client-side routing; if routes are added later add a rewrite to `index.html`. Set Node version to 24.x in project settings to match CI. Optionally enable "Require status checks / branch protection" in GitHub so Vercel's production deploy only follows green CI on `main` (note: Vercel's Git integration deploys regardless of GitHub Actions results unless you gate via branch protection on PRs; merging via PR only is the practical gate).

**Do NOT** do the "GitHub Actions runs `vercel deploy` with VERCEL_TOKEN" flow for v1: it needs three secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`), duplicates what the Git integration does, and adds failure modes. Mention it in docs/PIPELINE.md as an alternative the owner may learn about later (useful if you want deploys strictly gated on CI passing).

**GitHub Actions workflow shape** (`.github/workflows/ci.yml`; trigger on `pull_request` and `push` to `main`; `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`; `permissions: contents: read`):
- Job `check` (fast, parallel-friendly): checkout, `actions/setup-node` with `node-version-file: .nvmrc` and `cache: npm`, `npm ci`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`.
- Job `e2e` (needs `check` or runs in parallel): same setup, `npx playwright install --with-deps chromium`, `npx playwright test`, upload `playwright-report` artifact `if: ${{ !cancelled() }}`. Cache `~/.cache/ms-playwright` keyed on the Playwright version in the lockfile to save time (optional; `--with-deps` install is ~1 minute).
- Job `words` (optional): `npm run build:words && git diff --exit-code src/data`.
Use `npm ci` (lockfile committed), not `npm install`.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| State | Zustand 5 | useReducer + Context | Re-render fan-out; hand-rolled persist/migrate; harder to call from outside React. Would be fine for a single board, but this app has 6. |
| State | Zustand 5 | Redux Toolkit | Heavy for this size; more boilerplate; no learning benefit that Zustand does not give. |
| State | Zustand 5 | Jotai | Atom model is a worse fit for one cohesive, versioned persisted document. |
| TypeScript | 6.0.3 | 7.0.2 (`latest`) | Outside typescript-eslint's peer range (`<6.1.0`). Revisit when typescript-eslint supports 7. |
| Animation | Plain CSS keyframes | motion / react-spring / GSAP | Bundle weight; reduced-motion handling and E2E timing get harder; three simple animations. |
| Styling | Plain CSS + variables | Tailwind 4.3.3 | Works with Vite, but theme/palette switching via variables is simpler in plain CSS and the bespoke "soft" look gains little from utilities. Valid choice if the owner wants to learn Tailwind; the project does not require it. |
| Styling | Plain CSS | CSS-in-JS (styled-components, emotion) | Runtime cost, React 19 friction, unneeded. |
| Test env | jsdom | happy-dom 20.14.5 | Faster but fewer DOM behaviours implemented; correctness matters more for a small test suite. Either is acceptable. |
| Lint | ESLint 10 + typescript-eslint | Biome / oxlint | Fast and simple, and a legitimate option, but typescript-eslint plus react-hooks is the ecosystem default and matches the learning goal. |
| Profanity | obscenity (build-time) | bad-words 4.1.5 | Smaller/older list; acceptable as a second pass. |
| Profanity | obscenity + hand blocklist | Runtime filtering in the browser | Pools are static; filter at build time so the bundle carries nothing offensive and no filter code. |
| E2E deploy gating | Vercel Git integration | `vercel deploy` from Actions | Extra secrets and moving parts for no v1 benefit. |
| PWA | none (out of scope) | vite-plugin-pwa 1.3.0 | Explicitly deferred to v2. |
| Unit-test dates | `vi.setSystemTime` + injected `today` | date-fns / dayjs | Calendar-day math (YYYY-MM-DD strings, local midnight) is a few lines; a library adds a dependency and timezone footguns. See pitfalls below. |

## Pitfalls specific to this stack (hand off to PITFALLS.md)

- **Date handling:** store `lastActiveDate` as a local-calendar `YYYY-MM-DD` string; compute "days between" using `Date.UTC(y, m-1, d)` differences on the parsed parts, never `(now - then) / 86400000` on local timestamps (DST makes days 23/25 hours). Use `new Date()` only at the edge. Test around DST changes and month boundaries. (HIGH, well-known.)
- **`visibilitychange`/focus re-check** must be wired once (in an effect with cleanup) to avoid duplicate listeners under React StrictMode.
- **StrictMode double-invoking effects** will double-pick an answer or double-count a result if those happen in effects; do them in store actions triggered by events, not effects.
- **`Math.random` answer picking** must be injectable to test and to make E2E deterministic.
- **localStorage unavailable/corrupt:** wrap `JSON.parse` and run a schema validation in `migrate`; fall back to a fresh state rather than white-screening. Consider validating loaded data with a small hand-written guard (zod is not necessary).
- **Vite 8 specifics:** `@vitejs/plugin-react@6` needs Vite 8; mixing plugin-react 5 with Vite 8 or vice versa will break. Scaffold with `npm create vite@latest -- --template react-ts` and then pin TypeScript to 6.0.x. The scaffold may add `typescript` at the 7 line; check after generating.

## Installation

```bash
# scaffold (then pin TypeScript, see note)
npm create vite@latest unlimited-wordle -- --template react-ts

# runtime
npm install react@19 react-dom@19 zustand@5

# build/dev
npm install -D vite@8 @vitejs/plugin-react@6 typescript@~6.0.3 @types/react@19 @types/react-dom@19 @types/node@24

# unit/component tests
npm install -D vitest@5 @vitest/coverage-v8@5 jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom

# e2e
npm install -D @playwright/test@1.63 @axe-core/playwright
npx playwright install chromium

# lint/format
npm install -D eslint@10 @eslint/js@10 typescript-eslint@8 eslint-plugin-react-hooks@7 eslint-plugin-react-refresh globals prettier@3

# word-list build (never imported by src/)
npm install -D wordlist-english obscenity
```

Add `"engines": { "node": ">=22.12" }` and `.nvmrc` containing `24`.

## Open items to verify during the relevant phase

- Whether the `create-vite` template at generation time sets TypeScript 6 or 7 (and whether typescript-eslint has since widened its peer range). (Tooling phase.)
- dictionaryapi.dev availability, CORS and response shape (Definitions phase). Not re-checked in this pass.
- Latest major versions of the `actions/*` GitHub Actions and Playwright's recommended CI snippet (CI phase).
- Answer-pool tier choice per length (and whether to drop plural/inflected forms) needs eyeballing the generated output, owner decision.

## Sources

- npm registry metadata queried 2026-10-01 (`npm view`): versions, `peerDependencies`, `engines`, publish dates for react, vite, typescript (dist-tags latest 7.0.2; 6.0.3 available), vitest, @playwright/test, zustand, eslint, typescript-eslint, @vitejs/plugin-react, eslint-plugin-react-hooks, prettier, jsdom, @testing-library/*, obscenity, bad-words, wordlist-english. HIGH.
- `wordlist-english@1.2.1` tarball (README, `index.js`, tier JSON files) inspected locally; repository: https://github.com/jacksonrayhamilton/wordlist-english. Word counts and profanity presence measured by script. HIGH.
- Vite getting started: https://vite.dev/guide/ ; plugin-react peer-dependency issue discussion: https://github.com/vitejs/vite-plugin-react/issues/1144 (MEDIUM).
- Vite 8 / Rolldown overview: https://dev.to/stacknotice/vite-8-complete-guide-rolldown-oxc-and-10x-faster-builds-2026-48lh (LOW-MEDIUM, community article).
- obscenity repository: https://github.com/jo3-l/obscenity (not deeply reviewed; the English preset API names are from memory, LOW-MEDIUM; verify against its README before use).
- Vercel Git-integration and Playwright CI behaviours described from general knowledge; not re-fetched in this pass (MEDIUM).
