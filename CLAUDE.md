<!-- GSD:project-start source:PROJECT.md -->
## Project

**Unlimited Wordle**

A public, endless Wordle game on the web (deployed to Vercel). Players can choose 4, 5 or 6-letter words and play as many games as they like, in two modes: **Normal** (common English answers) and **Wordubado** (mostly slang, meme and Gen Z answers). It tracks a Win Streak for each Board and one global Day Streak with monthly Restores. It is also a learning and portfolio project: the owner wants to learn the full pipeline, from spec to word-data build to tests, CI and deploy.

**Core Value:** **Endless, correct Wordle play.** Scoring (including repeated letters), word validation and a smooth, responsive feel must be right for all three lengths. Everything else comes second.

### Constraints

- **Tech stack**: React + Vite + TypeScript, Vitest, Playwright. Chosen for learning value and fast static builds.
- **Hosting**: Vercel, as a static site. No server functions needed.
- **Storage**: localStorage only. Saved data must be versioned so existing players' data survives updates.
- **Design**: minimal, soft, light-feeling. Airy palette, soft rounded tiles, gentle animations, generous white space; dark mode keeps the same softness. Not a copy of the NYT look.
- **Accessibility**: respects prefers-reduced-motion; supports screen readers and keyboard-only play.
- **Content**: slang can be mildly crude, but never slurs or hate terms; Normal answers are clean common words.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | 19.3.0 | UI | Chosen. Plain function components and hooks; no need for Next.js (static SPA). | HIGH |
| Vite | 8.3.2 | Dev server and build (Rolldown-based) | Chosen. Node engines `^20.19 \|\| >=22.12`. Static `dist/` is exactly what Vercel serves. | HIGH |
| @vitejs/plugin-react | 6.1.1 | JSX/Fast Refresh | v6 requires Vite 8 and is Oxc-based (no Babel). Do not add the React Compiler; not needed. | HIGH |
| TypeScript | **6.0.3** (pin `~6.0.3`) | Types | See "TypeScript 7 trap" below. | HIGH |
| Node.js (dev + CI) | 24 LTS (`.nvmrc` = 24) | Runtime | Vitest 5 needs `^22.12 \|\| ^24 \|\| >=26`; Vite 8 needs 20.19+. 24 satisfies all. | HIGH |
### State Management
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.0.15 | Game/stats/settings store with `persist` middleware | Recommended over useReducer+Context. See rationale below. | MEDIUM-HIGH |
- State is large and cross-cutting: 6 boards, stats, day streak, restores, settings. Context re-renders every consumer on any change; Zustand selectors avoid re-rendering all tiles on every keystroke.
- The `persist` middleware has `version` + `migrate` + `partialize`, which maps directly onto the requirement "saved data has a version number and is migrated on load". Do not hand-roll this around Context.
- Store actions can be called from outside React (the physical-keyboard `keydown` listener, `visibilitychange` handler for the missed-day check) and are unit-testable without rendering.
- ~1 KB, one dependency, minimal ceremony; fits a learning project.
### Styling and Animation
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Plain CSS (CSS Modules or one global file) + CSS custom properties | n/a | Themes (light/dark/colour-blind) and all animation | Themes are just variable sets on `[data-theme]`/`[data-palette]`. No dependency, no runtime cost. | HIGH |
| CSS `@keyframes` + `animation-delay` | n/a | Tile flip, pop, shake | Flip stagger is `animation-delay: calc(var(--i) * 300ms)`; shake and pop are short keyframes. Re-trigger by toggling a class/`key`. | HIGH |
| `@media (prefers-reduced-motion: reduce)` | n/a | Accessibility | Replace flip/shake/pop with an instant colour change or a simple opacity fade; keep the state change visible. Also read the same media query in JS if anything uses timing (e.g. delay before the result modal), because the reveal delay must also shrink. | HIGH |
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
### Word Data (build-time)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| wordlist-english | 1.2.1 (devDependency only) | Source of answer/guess candidates | Chosen. Data is derived from SCOWL, last published 2022-06, MIT-licensed (see its `Copyright` file for SCOWL attribution). It is **build-time only**: it is 1.5 MB of JSON and must never be imported by `src/`. | HIGH |
| obscenity | 0.4.6 | Profanity detector for the build script | Recommended blocklist engine (see below). | MEDIUM |
| Tier | 4 | 5 | 6 |
|------|---|---|---|
| english/10 | 456 | 595 | 635 |
| english/20 | 468 | 760 | 1005 |
| english/35 | 936 | 2062 | 3582 |
| english/70 | 578 | 1329 | 2508 |
### Definitions API
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| dictionaryapi.dev | `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` | Definition for common words, on click only | Chosen; free, no key. Plain `fetch`, no library. | MEDIUM (not re-verified) |
### Infrastructure
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel (Hobby/free) | n/a | Hosting | Chosen. Vite is auto-detected: build `vite build`, output `dist`. | HIGH |
| GitHub Actions | `actions/checkout@v6`-class, `actions/setup-node`, `actions/upload-artifact` (use the latest majors; not verified) | CI | One workflow: install, lint, typecheck, unit, build, E2E. | MEDIUM |
- Job `check` (fast, parallel-friendly): checkout, `actions/setup-node` with `node-version-file: .nvmrc` and `cache: npm`, `npm ci`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`.
- Job `e2e` (needs `check` or runs in parallel): same setup, `npx playwright install --with-deps chromium`, `npx playwright test`, upload `playwright-report` artifact `if: ${{ !cancelled() }}`. Cache `~/.cache/ms-playwright` keyed on the Playwright version in the lockfile to save time (optional; `--with-deps` install is ~1 minute).
- Job `words` (optional): `npm run build:words && git diff --exit-code src/data`.
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
# scaffold (then pin TypeScript, see note)
# runtime
# build/dev
# unit/component tests
# e2e
# lint/format
# word-list build (never imported by src/)
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
