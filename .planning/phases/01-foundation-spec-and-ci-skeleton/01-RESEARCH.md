# Phase 1: Foundation, Spec and CI Skeleton - Research

**Researched:** 2026-10-01
**Domain:** Vite/React/TS scaffold, lint/format/test tooling, GitHub Actions CI, Vercel Git integration, written game spec (Restore state machine)
**Confidence:** HIGH (tooling was installed and run end to end in a scratch project); MEDIUM on Vercel dashboard click-path (docs checked, UI labels not).

<user_constraints>
## User Constraints (from CONTEXT.md)

The owner skipped discussion. D-01..D-18 are Claude defaults, treated as locked unless clearly wrong.

### Locked Decisions
- **D-01:** The missed-day check is idempotent: running it twice for the same `today` gives the same state (no double reset, no second prompt beyond the pending one).
- **D-02:** A pending Restore prompt is blocking (a modal). The player answers it before playing. The pending state is persisted, so a refresh shows it again (matches plan.txt).
- **D-03:** The monthly refill is applied lazily before any eligibility check: if `restores.month` is not the current `YYYY-MM`, `used` resets to 0 first. A missed-day check on the 1st sees 3 Restores.
- **D-04:** A game counts for the Day Streak on the local date it finishes, not the date it started. Midnight passing mid-game triggers the date-change check. That check must not punish a player who was active yesterday.
- **D-05:** Clock moved backwards (today < lastActiveDate) means missed = 0, and `lastActiveDate` is never moved earlier. It only ever moves forward.
- **D-06:** Day Streak farming by giving up is limited by the existing rule: Give Up and mid-game New game are allowed only when exactly 2 tries are left. A forfeited game still counts as a finished game for the Day Streak (owner decision 2026-10-01).
- **D-07:** SPEC.md contains the Restore logic as an explicit state machine (states, events, transitions) plus an edge-case table (input -> expected result) that Phase 5 tests can turn directly into table-driven tests.
- **D-08:** `SPEC.md` and `GLOSSARY.md` live at the repo root.
- **D-09:** SPEC.md supersedes plan.txt as the source of truth for game rules. plan.txt is kept and committed as the historical Q&A record, and SPEC.md says so at the top.
- **D-10:** SPEC.md rules get stable IDs (e.g. `R-SCORE-1`, `R-RESTORE-3`). Prose explains why where useful.
- **D-11:** GLOSSARY.md defines exactly the twelve terms (Board, Mode, Normal, Wordubado, Answer Pool, Guess Pool, Win Streak, Day Streak, Missed Day, Restore, Forfeit, Give Up), each a short definition plus an "avoid saying" note where useful.
- **D-12:** SPEC.md also records the resolved research decisions: blocklist on answers only, plurals and inflections excluded from Normal answers but valid as guesses, finished Board shows grid + Play again, two-tab sync via the `storage` event.
- **D-13:** GitHub remote is `pleummu/wordyday`. Work happens on branches with PRs into `main`.
- **D-14:** Connecting the Vercel project to GitHub is a **human checkpoint** with step-by-step instructions. No `vercel deploy` from Actions and no Vercel secrets in GitHub.
- **D-15:** Branch protection deferred to Phase 8.
- **D-16:** Product name on the site is **"Unlimited Wordle"**. "wordyday" is only the repo name.
- **D-17:** Placeholder app: "Unlimited Wordle" title + one-line "coming soon" note, a small set of CSS custom properties (soft, airy light palette, rounded shapes). No default Vite starter. No real design-system work.
- **D-18:** One trivial Vitest unit test (and a component smoke test if cheap) so `npm test` runs something real.

### Claude's Discretion
- Exact npm script names and folder skeleton (`src/logic`, `src/state`, `src/components`, `src/styles`) follow ARCHITECTURE.md.
- Whether to add shared types / `BOARD_CONFIG` (4/5/6 -> 5/6/7) now or in Phase 2. Fine now if tiny and tested.
- Specific GitHub Actions versions (use current majors at execution time).

### Deferred Ideas (OUT OF SCOPE)
None. No gameplay, word data or E2E in this phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QA-01 | React + Vite + TypeScript (pinned 6.0.x), ESLint flat config, Prettier, Node 24 | "Standard Stack", "Verified Scaffold Recipe": every tool was installed and run green in a scratch project |
| QA-05 | Vercel preview per PR, production from main | "Vercel Git Integration" owner checkpoint steps; no `vercel.json` needed |
| DOC-01 | SPEC.md with every owner decision, full Restore state machine, edge-case table | "SPEC.md Structure and Restore State Machine" with a drafted state machine and 40-row edge-case list |
| DOC-02 | GLOSSARY.md with the twelve terms | "GLOSSARY.md Guidance" with draft definitions |
</phase_requirements>

## Summary

The scaffold is straightforward but has one surprise that contradicts the project docs: **`create-vite@9.2.1` (current) scaffolds oxlint, not ESLint** (`"lint": "oxlint"`, `.oxlintrc.json`, no `eslint.config.js`). QA-01 requires ESLint flat config, so the plan must remove oxlint and add ESLint 10. TypeScript is not 7: the template pins `typescript: "~6.0.2"` (resolves to 6.0.3), and the plan should tighten that to `~6.0.3`. typescript-eslint 8.71.0 peers `typescript >=4.8.4 <6.1.0` and ESLint `^8.57 || ^9 || ^10`, so TS 6.0.x + ESLint 10 is a supported combination. npm `latest` for typescript is still 7.0.2; do not run `npm i typescript` without a version.

I scaffolded in a scratch directory, swapped oxlint for ESLint 10 + typescript-eslint + react-hooks 7 + react-refresh, added Prettier 3, Vitest 5 and jsdom, and ran `lint`, `format:check`, `typecheck` (`tsc -b`), `test` and `build`: all passed (2 tests, build 222 kB JS). The recipe below is exactly what was run. CI is one workflow using `actions/checkout@v7` and `actions/setup-node@v7` (both Node 24 runtime actions). Vercel needs no `vercel.json` for a single-page app; its preview URLs arrive as a PR comment from the Vercel bot.

The spec work is the bigger planning task. A Restore state machine is drafted below with 11 events/transitions and a 40-row edge-case table, built from plan.txt, D-01..D-07 and the research gaps. Three items need an owner decision flagged during review (see Open Questions): finishing a game that itself triggers a pending prompt, Restore count when the prompt is answered the next month, and the "K left" number in the prompt text.

**Primary recommendation:** Scaffold with create-vite into a scratch folder, copy into the repo, delete oxlint, install the verified ESLint/Prettier/Vitest set, pin `typescript@~6.0.3`, add `.gitattributes` (`* text=auto eol=lf`), then write SPEC.md/GLOSSARY.md as two independent plans parallel to the tooling work.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Placeholder page | Browser / Client (static SPA) | CDN / Static | Vite builds static `dist/`; no server tier exists |
| Lint, format, typecheck, unit tests | CI (GitHub Actions) + local dev | - | Pure build-time checks; no runtime tier |
| PR preview / production deploy | CDN / Static (Vercel Git integration) | - | Vercel builds from Git itself; Actions does not deploy (D-14) |
| Game rules spec | Documentation (repo root) | - | SPEC.md is the source of truth for later logic tiers |
| Restore state machine (spec only) | Documentation now; Pure logic module (`src/logic/streaks.ts`) in Phase 5 | Store (clock/storage owner) | Phase 1 writes it as `(state, event, today) -> state`; no code yet |

## Standard Stack

Versions verified with `npm view` on 2026-10-01 and by installing them together.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react / react-dom | 19.3.0 (`npm view react version`; scaffold range `^19.2.8` resolved to 19.3.0) | UI | Chosen in PROJECT |
| vite | 8.3.2 | Dev server and build | Chosen; scaffold uses `^8.3.0` |
| @vitejs/plugin-react | 6.1.1 | JSX / Fast Refresh | Needs Vite 8; scaffold default |
| typescript | **~6.0.3** (resolves 6.0.3; `latest` tag is 7.0.2, avoid) | Types | typescript-eslint peer `<6.1.0` |
| @types/node | 24.19.0 (scaffold `^24.13.3`) | Types for `vite.config.ts` | Matches Node 24 |
| @types/react, @types/react-dom | 19.3.0 | Types | Scaffold default |

### Supporting (dev tooling)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint | 10.11.0 | Linting, flat config only | Always |
| @eslint/js | 10.0.1 | Base recommended rules | Always |
| typescript-eslint | 8.71.0 | TS parser + rules; one package for flat config | Always |
| eslint-plugin-react-hooks | 7.1.1 | Hooks rules (`configs.flat.recommended`) | Always |
| eslint-plugin-react-refresh | 0.5.7 (peer `eslint ^9 \|\| ^10`) | Fast Refresh safety (`configs.vite`) | Always (in Vite template) |
| globals | 17.13.0 | `globals.browser` | Always |
| prettier | 3.9.9 | Formatting; separate from ESLint | Always |
| vitest | 5.0.3 (engines `^22.12 \|\| ^24 \|\| >=26`; peer `vite ^6.4 \|\| ^7 \|\| ^8`, `@types/node ^22 \|\| >=24`) | Unit tests | Always |
| jsdom | 30.1.1 | DOM env for component smoke test | Phase 1 smoke test |
| @testing-library/react | 16.3.3 | Component smoke test | Phase 1 smoke test |
| @testing-library/dom | 10.4.2 (peer of RTL, must be installed) | RTL peer | With RTL |

Not needed in Phase 1: Zustand, Playwright, user-event, jest-dom, coverage, axe, eslint-plugin-jsx-a11y, obscenity, wordlist-english. Install them in their phases.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ESLint 10 (QA-01) | oxlint (scaffold default) | Faster, but violates QA-01 and the project decision; remove it |
| `test` block in `vite.config.ts` | separate `vitest.config.ts` | Separate file overrides vite.config entirely and must be added to `tsconfig.node.json` `include`; no benefit for this project |
| `eslint-config-prettier` | none | Not needed: this ESLint config enables no stylistic rules (verified: lint and prettier pass together) |

**Installation (recipe verified in scratch dir):**
```bash
# scaffold elsewhere, then copy into the repo (the repo is not empty, create-vite would prompt)
npm create vite@latest app -- --template react-ts --no-interactive
# in the project:
npm pkg set devDependencies.typescript="~6.0.3"
npm uninstall oxlint            # delete .oxlintrc.json too
npm i -D eslint@10 @eslint/js@10 typescript-eslint@8 eslint-plugin-react-hooks@7 \
  eslint-plugin-react-refresh globals prettier@3 vitest@5 jsdom \
  @testing-library/react @testing-library/dom
npm ls typescript   # must show 6.0.x everywhere, "deduped"
```

## Package Legitimacy Audit

slopcheck was not run. All packages are first-party or category-standard tooling named in the project's own pinned stack (CLAUDE.md) and were confirmed with `npm view` and a real install/run; none came from search results. Per the protocol, `[VERIFIED]` requires slopcheck, so the planner should treat these as `[CITED: CLAUDE.md + npm view]`, and a one-line `checkpoint:human-verify` before the first `npm install` is optional (low risk).

| Package | Registry | Source Repo | slopcheck | Disposition |
|---------|----------|-------------|-----------|-------------|
| react, react-dom, vite, @vitejs/plugin-react, typescript | npm | facebook/react, vitejs/*, microsoft/TypeScript | not run | Approved (scaffold-installed) |
| eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, prettier | npm | official orgs | not run | Approved |
| vitest, jsdom, @testing-library/react, @testing-library/dom | npm | vitest-dev, jsdom, testing-library | not run | Approved |

**Packages removed:** none. **Flagged [SUS]:** none. `oxlint` is removed from the scaffold by design (QA-01), not for legitimacy.

## Architecture Patterns

### Pipeline Flow
```
git push branch ──► GitHub PR ──┬─► GitHub Actions "CI" (pull_request + push main)
                                │      checkout ► setup-node(.nvmrc, npm cache) ► npm ci
                                │      ► lint ► format:check ► typecheck ► test ► build
                                │      └─► green/red check on the PR
                                └─► Vercel (GitHub App webhook, independent of Actions)
                                       npm install ► vite build ► dist/
                                       ├─ PR branch  -> preview URL (bot comment on PR)
                                       └─ main merge -> production deployment
```
Actions and Vercel run in parallel and do not depend on each other. In Phase 1 a red CI does **not** block the Vercel deploy (branch protection arrives in Phase 8, D-15).

### Recommended Project Structure (Phase 1 end state)
```
.github/workflows/ci.yml
.gitattributes  .gitignore  .nvmrc  .prettierrc.json  .prettierignore
eslint.config.js  vite.config.ts  index.html
tsconfig.json  tsconfig.app.json  tsconfig.node.json   # scaffold layout, keep
package.json  package-lock.json
SPEC.md  GLOSSARY.md  plan.txt  CLAUDE.md
docs/PIPELINE.md
public/favicon.svg                # keep the scaffold favicon (or a simple own one); delete public/icons.svg
src/
  main.tsx  App.tsx  App.test.tsx
  styles/tokens.css  styles/global.css
  logic/ state/ components/       # empty dirs do not exist in git; create when first file lands
```
Delete from the scaffold: `src/assets/*`, `src/App.css`, `public/icons.svg`, `README.md` content (replace with a short project README), Vite starter markup. Create `src/logic/boards.ts` (+ test) only if the planner chooses the optional tiny `BOARD_CONFIG` task; a dated empty folder is not needed.

### Pattern 1: ESLint 10 flat config (verified working)
```js
// eslint.config.js  (ran clean with eslint 10.11.0)
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
  },
])
```
Note: `files: ['**/*.{ts,tsx}']` also lints `vite.config.ts` with browser globals; harmless. `eslint.config.js` itself is not linted (JS not matched); acceptable. `.mjs` build scripts arrive in Phase 2; add a second block with `globals.node` then.

### Pattern 2: Vitest inside `vite.config.ts` (verified working)
```ts
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
})
```
Logic tests use the default `node` environment. A component test opts into jsdom per file with a docblock as the first line: `// @vitest-environment jsdom`. Import `describe/it/expect` from `vitest` explicitly (no `globals: true`), so no extra tsconfig `types` entry is needed. `tsc -b` type-checks `vite.config.ts` (via `tsconfig.node.json`) and test files (via `tsconfig.app.json`, `include: ["src"]`) with no changes.

### Pattern 3: Scripts (verified)
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc -b",
  "test": "vitest run",
  "test:watch": "vitest"
}
```
Keep the scaffold's `build` as `tsc -b && vite build`. Typecheck runs twice in CI (once in `typecheck`, once inside `build`); that is a few seconds and fine.

### Pattern 4: Prettier + line endings
```json
// .prettierrc.json
{ "singleQuote": true, "semi": false, "endOfLine": "lf" }
```
`.prettierignore`: `dist`, `coverage`, `package-lock.json`, and also `plan.txt` is not a Prettier-handled type so it is skipped automatically. Decide whether `.planning/**` is formatted: **add `.planning` and `docs` to `.prettierignore`** unless the plan also wants to reformat all existing markdown (the GSD files are machine-written; reformatting them creates noisy diffs and risks `format:check` failing on future GSD output). `SPEC.md`/`GLOSSARY.md` at root: either ignore `*.md` entirely or format them once with `prettier --write`; recommend ignoring `*.md` (simplest, avoids table-reflow churn).

`.gitattributes`: `* text=auto eol=lf`. The owner's machine has `core.autocrlf=true` (verified), which makes the working tree CRLF; without `.gitattributes`, a local `prettier --check` fails on every file while Linux CI passes, and vice versa confusion. With `eol=lf` Git checks out LF on Windows, matching Prettier `endOfLine: lf`. Existing files may need `git add --renormalize .` once (the staged `plan.txt` will warn about CRLF->LF; harmless).

### Pattern 5: GitHub Actions workflow (versions verified via `gh api`)
`actions/checkout` latest release is v7.0.1 (2026-07-20); `actions/setup-node` is on the v7 major (v7.0.0 released 2026-07-14, later v7.x possible). A floating `v7` tag exists for both, and both `action.yml` files declare `using: node24`. Re-check with `gh api repos/actions/<name>/releases/latest` at execution time.
```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
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
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```
`.nvmrc` contains `24`. The job name `check` is what branch protection will reference in Phase 8; keep it stable. `package.json` gets `"engines": { "node": ">=22.12" }` per research (Vitest 5 floor); `.nvmrc` is the actual pin. Repo is private (`gh api` -> private), so Actions minutes are metered but ample for this project [ASSUMED: free-plan allowance].

### Anti-Patterns to Avoid
- **`npm i typescript`/`npm i -D typescript@latest`:** installs 7.0.2 and breaks the typescript-eslint peer range. Always `~6.0.3`.
- **Keeping `oxlint` alongside ESLint:** two linters, violates QA-01. Remove it and `.oxlintrc.json`.
- **Adding `vercel.json` "just in case":** not needed (see below); one more file to explain.
- **Vercel deploy step in Actions:** rejected by D-14.
- **Importing from `vitest` globals types without config:** keep explicit imports.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Node version selection in CI | Hardcoded `node-version: 24` | `node-version-file: .nvmrc` | One source of truth for local and CI |
| npm dependency caching | Manual `actions/cache` | `setup-node` `cache: npm` | Built in, keyed on lockfile |
| Deploy to Vercel | Custom deploy workflow with tokens | Vercel Git integration | D-14; zero secrets |
| Line-ending handling | Per-developer git config | `.gitattributes` + Prettier `endOfLine` | Repo-enforced, works on Windows and Linux |
| Spec edge-case tracking | Prose-only rules | ID-tagged rule list + table | Phase 5 turns rows into tests; IDs go into test names |

## Runtime State Inventory

Not a rename/refactor phase. Omitted.

## Common Pitfalls

### Pitfall 1: Scaffold ships oxlint, not ESLint
**What goes wrong:** The planner follows CLAUDE.md ("Vite's template includes react-refresh/ESLint") and assumes `eslint.config.js` exists; it does not.
**How to avoid:** Task explicitly deletes `.oxlintrc.json`, uninstalls `oxlint`, writes `eslint.config.js`, and replaces the `lint` script.
**Warning signs:** `package.json` still has `"lint": "oxlint"`.

### Pitfall 2: TypeScript drifts to 7
**What goes wrong:** Any later `npm i typescript` or `npm update` crossing the tilde is blocked, but a fresh `npm i -D typescript` takes 7.0.2 and typescript-eslint warns on peers / fails.
**How to avoid:** `"typescript": "~6.0.3"` in package.json; CI `npm ci` uses the lockfile. Optionally add a verification step `npm ls typescript | grep 6.0` in the plan's checks.
**Warning signs:** `npx tsc -v` prints 7.x; peer warnings on install.

### Pitfall 3: CRLF vs LF between Windows and CI
**What goes wrong:** `core.autocrlf=true` on the owner's machine produces CRLF files; Prettier (`endOfLine: lf`) reports every file, or passes locally and fails on Linux.
**How to avoid:** `.gitattributes` `* text=auto eol=lf` committed in the same commit as the Prettier config, before the other source files. Run `git add --renormalize .` once.
**Warning signs:** `format:check` lists every file; `warning: CRLF will be replaced by LF`.

### Pitfall 4: Prettier choking on GSD markdown
**What goes wrong:** `prettier --check .` includes `.planning/**/*.md`, `docs/*.md`, SPEC/GLOSSARY tables; CI goes red on files nobody should hand-format.
**How to avoid:** `.prettierignore` includes `.planning`, `docs`, `*.md`, `plan.txt`.

### Pitfall 5: Testing Library cleanup without Vitest globals
**What goes wrong:** With `globals: false`, RTL does not auto-register `afterEach(cleanup)`, so a second render test sees leftover DOM. The single smoke test hides this.
**How to avoid:** If more than one component test is added, add `src/test/setup.ts` with `import { afterEach } from 'vitest'; import { cleanup } from '@testing-library/react'; afterEach(cleanup)` and register via `test.setupFiles`. For Phase 1's single test, not needed; document it.

### Pitfall 6: Vercel auto-deploys even when CI fails
**What goes wrong:** Owner expects "CI red = no deploy". Vercel's integration is independent.
**How to avoid:** State in the checkpoint instructions that this is expected until Phase 8 branch protection.

### Pitfall 7: Vercel root cannot be verified until the repo has a pushed `main` with the app
**What goes wrong:** The owner connects Vercel before the scaffold is on `main`; first production build fails or deploys an empty repo.
**How to avoid:** Order: (1) PR with scaffold + CI merged to main (or at least pushed), (2) owner imports repo in Vercel, (3) open a second small PR to prove preview + merge to prove production. Success criterion 4 needs this sequencing; the Vercel checkpoint is therefore **late** in the phase.

### Pitfall 8: Private repo and Vercel Hobby
**What goes wrong:** The repo `pleummu/wordyday` is private. Hobby plan supports GitHub private repos for personal accounts, but a collaborator cannot import it and Vercel must be authorised for that repo. [CITED: vercel.com/docs/git/vercel-for-github "Personal account repositories": must be repository Owner]. Owner is the repo owner, so fine. Hobby terms limit commercial use [ASSUMED]; not an issue for a portfolio game.

## Vercel Git Integration (owner checkpoint content)

Docs verified (vercel.com/docs/frameworks/frontend/vite, last updated 2026-08-26; vercel.com/docs/git/vercel-for-github, 2026-09-17).

- **vercel.json:** not needed. The doc says SPA `rewrites` are only for **deep linking** (client-side routes). This app is one page with no router, so skip it. [CITED: vercel.com/docs/frameworks/frontend/vite]
- **Framework preset:** Vercel auto-detects Vite; build command `vite build` (or the `build` npm script, `tsc -b && vite build`), output directory `dist`, install `npm install`. The owner should confirm the preset reads "Vite" and leave defaults. [CITED for auto-detect; build/output defaults from CLAUDE.md STACK, MEDIUM]
- **Node version on Vercel:** Vercel's project setting "Node.js Version" may default to a non-24 value. Vite 8 needs Node `^20.19 || >=22.12`; Vercel supports 24.x. Add a checkpoint line: Settings > General > Node.js Version = 24.x. If left lower than 20.19 the build fails with an engines error. Adding `engines.node` to package.json makes Vercel pick a matching version [ASSUMED]; set both. [ASSUMED: Vercel honours `engines`; verify on first build]
- **Owner steps (draft for the plan):**
  1. Sign in at vercel.com with GitHub (as the repo owner `pleummu`).
  2. Add New > Project > Import `pleummu/wordyday`. If the repo is not listed, "Adjust GitHub App Permissions" and grant access to that repo.
  3. Framework Preset: Vite. Build command `npm run build` (default), Output Directory `dist`. No environment variables. Deploy.
  4. Settings > Git: Production Branch = `main` (default).
  5. Paste the production URL back to the planner/STATE (needed later for share URL and OG tags, Phase 7).
- **Previews:** every push to a non-production branch deploys; Vercel comments the preview URL on the PR and adds a commit status / deployment entry. [CITED: vercel-for-github]
- **Production:** push/merge to `main` publishes to the production domain (`<project>.vercel.app`).
- **Skip noise (optional):** Settings > Git can silence PR comments; leave on because the comment is how the owner finds the preview URL.
- **Verification of QA-05** is manual: open the PR, see the Vercel comment, open the URL, see the placeholder; merge, open the production URL.

## SPEC.md Structure and Restore State Machine

### Recommended SPEC.md outline
```
# Unlimited Wordle: Spec            (top note: supersedes plan.txt, which is kept as the Q&A history, D-09)
0. How to read this spec            (rule IDs R-<AREA>-<n>, MUST/SHOULD wording, "why" notes)
1. Overview and scope               (what is in/out; links to REQUIREMENTS.md IDs)
2. Modes, lengths, attempts         R-MODE-*, R-LEN-*     (4/5/6 -> 5/6/7)
3. Word pools                       R-POOL-*              (Normal/Wordubado, 75/25, blocklist on answers only, plurals excluded from Normal answers but valid guesses, slang valid guess in Normal)
4. Guess rules and scoring          R-SCORE-*, R-GUESS-*  (two-pass, invalid guess does not use attempt, keyboard best-state)
5. Boards and persistence           R-BOARD-*, R-SAVE-*   (6 Boards, resume, finished Board shows grid + Play again, storage event, versioned/validated storage, in-memory fallback)
6. Give Up, New game, Forfeit       R-FORFEIT-*           (exactly 2 tries left; confirm texts)
7. Streaks                          R-WIN-*, R-DAY-*      (Win Streak, Day Streak, Missed Day)
8. Restore state machine            R-RESTORE-*           (state, derived values, events, transitions, edge-case table)
9. Statistics                       R-STAT-*
10. Result and share                R-RESULT-*, R-SHARE-*
11. Extras and UI rules             R-UI-*                (How-to-play, themes, reduced motion, Wordubado popup, no hard mode)
12. Resolved decisions log          (owner decisions 2026-10-01 + D-12 research decisions, each with date and source)
13. Out of scope
```
Keep prose short; one rule per ID; each ID maps to REQUIREMENTS.md IDs in a trailing "Covers" column or line so DOC-01 is traceable. Confirm text strings verbatim (confirm dialog: "This counts as a loss. Start a new game?"; Restore prompt: "Your N-day streak broke. Restore it? (K left this month)").

### Restore state machine (draft to put in section 8)

**Persisted state** (names match plan.txt; shape finalised in Phase 4):
- `dayStreak { current, longest, lastActiveDate: 'YYYY-MM-DD' | null }`
- `restores { month: 'YYYY-MM', used: 0..3 }`
- `pendingRestore: null | { streak: number, missed: number }` (persisted so refresh re-shows it, D-02). Research ARCHITECTURE says derive it; either is allowed, but the **observable rule** is: the prompt is shown whenever the Day Streak is broken but undecided.
- per-Board `winStreak`.

**Derived values** (never stored): `restoresLeft = 3 - used` after refill; `missed = max(0, days(today) - days(lastActiveDate) - 1)` where `days()` uses `Date.UTC(y, m-1, d)/86400000` on parsed `YYYY-MM-DD` parts (DST-safe); `missed = 0` when `lastActiveDate` is null or in the future.

**Day Streak states:** `NO_STREAK` (current = 0), `ACTIVE` (current > 0, missed = 0), `PENDING` (a prompt is outstanding).

**Events** (all take an injected `today`):
| # | Event | Trigger |
|---|-------|---------|
| E1 | `CHECK(today)` | app open, tab focus/visibilitychange, local-midnight timer, before every E4 |
| E2 | `RESTORE(today)` | player taps Restore in the prompt |
| E3 | `DECLINE(today)` | player taps No |
| E4 | `FINISH(today, board, outcome)` | win, loss, Give Up or Forfeit completes a game |
| E5 | `RESET_ALL` | Settings reset (Phase 4) |

**Transitions:**
1. `CHECK`, step 0: `refill(today)`: if `monthOf(today) > restores.month` then `restores = { month: monthOf(today), used: 0 }` (refill only forward; never on a clock moved backwards). Applied before every eligibility test (D-03).
2. `CHECK`, `missed = 0`: no change (includes null `lastActiveDate`, same day, yesterday, clock backwards).
3. `CHECK`, `missed >= 1`, state `PENDING`: re-evaluate eligibility with current `today` (the gap may have grown): still eligible -> no change; no longer eligible (missed > 4, or no Restore left after refill logic) -> go to rule 5 (auto-decline). Win Streaks are already 0, so this is idempotent (D-01).
4. `CHECK`, `missed >= 1`, not pending: set **all** Board Win Streaks to 0. Then if `current > 0 AND missed <= 4 AND restoresLeft > 0` -> `PENDING` (`pendingRestore = { streak: current, missed }`, modal shown). Otherwise (`current = 0`, or `missed >= 5`, or `restoresLeft = 0`) -> `current = 0`, no prompt.
5. Auto-decline / `DECLINE`: `current = 0`, `pendingRestore = null`. `lastActiveDate` unchanged, `longest` unchanged. A second `CHECK` for the same `today` then sees `current = 0` and does nothing.
6. `RESTORE`: only valid in `PENDING`; apply `refill(today)` first; require `restoresLeft > 0` else treat as `DECLINE`; `used += 1` (counted in the month of `today`); `lastActiveDate = yesterday(today)`; `current` and `longest` unchanged; `pendingRestore = null`. A second `RESTORE` is a no-op (state is no longer pending). Win Streaks stay 0.
7. `FINISH`: first run `CHECK(today)`. If it produced `PENDING`, record the Board result now (Win Streak, stats) but defer the Day Streak credit until the prompt is answered (then continue with rule 8) **[needs owner confirmation, see Open Questions]**. If not pending, apply rule 8.
8. Day Streak credit: if `lastActiveDate === null` or `today > lastActiveDate`: `current += 1`, `longest = max(longest, current)`, `lastActiveDate = today`. If `today === lastActiveDate` (already credited) or `today < lastActiveDate` (clock backwards): no change; `lastActiveDate` never decreases (D-05).
9. Win Streak on `FINISH`: win -> Board `winStreak += 1`; loss, Give Up or Forfeit -> that Board's `winStreak = 0`. Credit rule 8 applies to all four outcomes (D-06).
10. `FINISH` date: `today` is the local date at the moment the game finishes, not when it started (D-04).
11. `RESET_ALL`: everything to the initial state (current 0, longest 0, lastActiveDate null, restores for the current month with used 0, pending null).

Blocking rule: while `PENDING`, the UI accepts no game input; the modal cannot be dismissed except by answering (D-02).

**Prompt text:** `"Your {streak}-day streak broke. Restore it? ({restoresLeft} left this month)"` where `restoresLeft` is the count **before** this use (matches plan.txt example) **[confirm, Open Questions 2]**.

### Edge-case table: rows that must appear (draft)
Format for SPEC.md: `ID | Given (state before) | Event + today | Expected (state after, prompt?)`. All dates 2026 unless noted (1 Jun 2026 is a Monday, verified by calendar). `S` = day streak current, `LAD` = lastActiveDate, `R` = restores `month/used`, `WS` = win streaks.

| ID | Case | Given | Event | Expected |
|----|------|-------|-------|----------|
| EC-01 | Same day | S=5, LAD=Jun 3 | CHECK Jun 3 | no change |
| EC-02 | Yesterday | S=5, LAD=Jun 2 | CHECK Jun 3 | no change, no prompt (missed 0) |
| EC-03 | 1 missed day | S=5, LAD=Jun 1, R=2026-06/0 | CHECK Jun 3 | WS all 0, prompt shown (3 left) |
| EC-04 | 4 missed days (boundary) | S=5, LAD=Mon Jun 1 | CHECK Sat Jun 6 | prompt offered |
| EC-05 | 5 missed days (boundary) | S=5, LAD=Mon Jun 1 | CHECK Sun Jun 7 | S=0, no prompt, WS 0 |
| EC-06 | Streak is 0 | S=0, LAD=Jun 1 | CHECK Jun 4 | WS 0, no prompt |
| EC-07 | No Restores left | S=5, LAD=Jun 1, R=2026-06/3 | CHECK Jun 3 | S=0, no prompt, WS 0 |
| EC-08 | New player | S=0, LAD=null | CHECK any | no change |
| EC-09 | Idempotent check | after EC-03 pending | CHECK Jun 3 again | identical state, one prompt |
| EC-10 | Idempotent after reset | after EC-05 | CHECK Jun 7 again | identical state |
| EC-11 | Pending then refresh | EC-03 pending, reload | CHECK Jun 3 | prompt shown again, `used` still 0 |
| EC-12 | Gap grows while pending | EC-03 pending | CHECK Jun 8 (missed 6) | S=0, pending cleared, no prompt |
| EC-13 | Restore accepted | EC-03 pending | RESTORE Jun 3 | S=5, LAD=Jun 2, R used=1, WS 0, pending null |
| EC-14 | Restore then finish today | after EC-13 | FINISH win Jun 3 | S=6, LAD=Jun 3 |
| EC-15 | Restore, no finish, next day | after EC-13, nothing played | CHECK Jun 4 | LAD=Jun 2 -> missed 1 -> prompt again if eligible (Restore does not buy a free pass for today) |
| EC-16 | Decline | EC-03 pending | DECLINE Jun 3 | S=0, pending null, R unchanged |
| EC-17 | Decline then finish | after EC-16 | FINISH Jun 3 | S=1, LAD=Jun 3 |
| EC-18 | Double RESTORE | after EC-13 | RESTORE Jun 3 | no-op, `used` stays 1 |
| EC-19 | One Restore covers whole gap | S=9, LAD=Jun 1 | RESTORE Jun 5 (missed 3) | used+1 only, LAD=Jun 4 |
| EC-20 | Restore limit | R=2026-06/2 | RESTORE (third) then later gap, 4th offer | third works (used=3); 4th gap -> S=0 no prompt |
| EC-21 | Refill on the 1st | S=5, LAD=Jun 28, R=2026-06/3 | CHECK Jul 1 (missed 2) | R=2026-07/0 then prompt shows "3 left" |
| EC-22 | Gap began last month, answered this month | pending shown Jun 30 or Jul 1 | RESTORE Jul 1 | counted against 2026-07, used=1 |
| EC-23 | Month changes while prompt unanswered | pending on Jun 30 (R=2026-06/2) | RESTORE Jul 1 | refill first, used=1 in 2026-07 (owner confirm) |
| EC-24 | Year boundary | S=5, LAD=2026-12-30 | CHECK 2027-01-02 (missed 2) | prompt, month key 2027-01 refills |
| EC-25 | Leap day | S=5, LAD=2028-02-28 | CHECK 2028-03-01 (missed 1) | prompt; 2027-02-28 -> 2027-03-01 is missed 0 |
| EC-26 | DST spring forward | TZ America/Los_Angeles, S=5, LAD=2026-03-07 | CHECK 2026-03-09 (missed 1) | prompt; day math uses UTC parts, not 23h day |
| EC-27 | DST fall back | TZ America/Los_Angeles, LAD=2026-10-31 | CHECK 2026-11-02 (missed 1) | prompt |
| EC-28 | Tz variety | TZ Pacific/Auckland, Asia/Kolkata, UTC | same dates as EC-03/05 | identical results |
| EC-29 | Clock backwards | S=5, LAD=Jun 10 | CHECK Jun 5 | no change, no prompt, LAD stays Jun 10 |
| EC-30 | Clock backwards then finish | S=5, LAD=Jun 10 | FINISH Jun 5 | no credit, LAD stays Jun 10, S=5 |
| EC-31 | Clock backwards across month | R=2026-07/2 | CHECK with today in 2026-06 | no refill, no regress of `restores.month` |
| EC-32 | Several games one day | LAD=Jun 2, S=4 | FINISH x3 on Jun 3 | S=5, LAD=Jun 3 (+1 once) |
| EC-33 | Loss counts | LAD=Jun 2 | FINISH loss Jun 3 | S+1 |
| EC-34 | Give Up counts | LAD=Jun 2 | FINISH giveup Jun 3 | S+1 |
| EC-35 | Forfeit counts | LAD=Jun 2 | FINISH forfeit Jun 3 | S+1 (owner decision 2026-10-01) |
| EC-36 | Loss resets only own Board | WS a=3, b=2 | FINISH loss on a | a=0, b=2 |
| EC-37 | Missed day resets all Win Streaks | WS a=3, b=2, S=5, LAD=Jun 1 | CHECK Jun 3 | a=0, b=0 even before answering, even if declined later |
| EC-38 | Restore never revives Win Streaks | after EC-37 | RESTORE | WS stay 0 |
| EC-39 | Midnight mid-game, was active yesterday | LAD=Jun 2, game started Jun 3 23:59 | FINISH Jun 4 | check no-op (missed 0), credit for Jun 4 |
| EC-40 | Midnight mid-game, break discovered at finish | S=5, LAD=Jun 1, game started Jun 3 | FINISH Jun 4 | pending behaviour per rule 7 (owner confirm) |
| EC-41 | Longest streak | S=3, longest=8 | FINISH credit | longest stays 8; longest updates only when S exceeds |
| EC-42 | `longest` unaffected by decline/Restore | S=5, longest=9 | DECLINE | S=0, longest=9 |
| EC-43 | Prompt text numbers | S=12, R used=1 | CHECK -> pending | text "Your 12-day streak broke. Restore it? (2 left this month)" |
| EC-44 | Fresh month with used>3 corrupt | R month matches, used=7 | CHECK | restoresLeft clamps to 0 (never negative); Phase 4 validation also rejects |

Each row should name the REQUIREMENTS IDs it supports (STRK-03..08, STRK-01/02). Phase 5 test titles should cite `EC-xx`.

### Further SPEC items that must be decided/written (not in plan.txt)
- Definition of "exactly 2 tries left": `attemptsUsed === maxAttempts - 2` (5-letter board: 4 used of 6). Give Up and mid-game New game are disabled otherwise; once a game is finished New game is always available. A game in progress with 0 guesses is still "in progress" and cannot be abandoned except via the 2-tries rule [confirm with owner: this means a player with a fresh unwanted board cannot reroll; research flagged this is the intended anti-farming consequence].
- Storage rules in the spec: versioned document, migrate chain, validation on load, backup under `:corrupt` key, in-memory fallback, `storage` event sync, persist submitted guesses only.
- Date rules: local calendar date strings, injected `today`, `Date.UTC` day diff, timer + `visibilitychange` check.
- Resolved decisions (D-12): blocklist on answers only; plurals/inflections out of Normal answers, valid guesses; finished Board shows grid + Play again; two-tab sync.

## GLOSSARY.md Guidance

Exactly twelve entries, alphabetical or grouped (Play: Board, Mode, Normal, Wordubado, Answer Pool, Guess Pool, Forfeit, Give Up; Streaks: Win Streak, Day Streak, Missed Day, Restore). Draft definitions:
- **Board:** one of six independent saved games, a Mode and a word length (4, 5 or 6) together. Avoid "level", "game slot". Key format `${mode}-${len}` can be mentioned as the code name.
- **Mode:** Normal or Wordubado; decides which words can be the answer.
- **Normal:** Mode whose answers are common English words only. Slang is a valid guess but never the answer.
- **Wordubado:** Slang Mode; each game's answer is slang 75% and a common word 25% of the time. Avoid "slang mode" in UI copy (fine in prose).
- **Answer Pool:** words that can be drawn as the answer, per Mode and length. Avoid "word list" when you mean this.
- **Guess Pool:** words a player may submit (large dictionary plus all slang); superset of every Answer Pool. Avoid "dictionary".
- **Win Streak:** consecutive wins on one Board; resets on loss, Give Up, Forfeit or any Missed Day; a Restore never brings it back.
- **Day Streak:** one global count of consecutive days with at least one finished game. Avoid "daily streak" and "streak" alone.
- **Missed Day:** a local calendar day with no finished game, counted strictly between `lastActiveDate` and today.
- **Restore:** one of 3 per calendar month, spent to keep the Day Streak number after up to 4 Missed Days; one Restore covers the whole gap; does not touch Win Streaks.
- **Forfeit:** abandoning an in-progress game by pressing New game when exactly 2 tries are left; counts as a loss and a finished game.
- **Give Up:** revealing the answer on purpose when exactly 2 tries are left; counts as a loss and a finished game. Difference from Forfeit: Give Up reveals the answer; Forfeit starts a new game.

Note global CLAUDE.md says GLOSSARY.md single-context at repo root (matches D-08).

## Code Examples

### Placeholder app + token CSS (shape only)
```tsx
// src/App.tsx
export default function App() {
  return (
    <main className="placeholder">
      <h1>Unlimited Wordle</h1>
      <p>Coming soon: endless Wordle in 4, 5 and 6 letters.</p>
    </main>
  )
}
```
```css
/* src/styles/tokens.css: first few variables only (D-17) */
:root {
  --color-bg: #fbfaf7;
  --color-text: #2b2d33;
  --color-muted: #7a7f8a;
  --radius-tile: 14px;
  --font-body: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
```
Also set `<title>Unlimited Wordle</title>` and `lang="en"` in `index.html`, `<meta name="viewport">` stays.

### Smoke tests (both ran green)
```ts
// src/boards.test.ts or a trivial pure test
import { describe, expect, it } from 'vitest'
describe('smoke', () => { it('adds', () => { expect(1 + 1).toBe(2) }) })
```
```tsx
// src/App.test.tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from './App'
it('shows the product name', () => {
  render(<App />)
  expect(screen.getByRole('heading', { level: 1, name: 'Unlimited Wordle' })).toBeTruthy()
})
```
Prefer asserting the real title (D-16) over an arbitrary heading. Avoid `toBeInTheDocument` (needs jest-dom, not installed).

### Optional tiny typed constant (discretion)
```ts
// src/logic/boards.ts
export const BOARD_CONFIG = { 4: { attempts: 5 }, 5: { attempts: 6 }, 6: { attempts: 7 } } as const
export type WordLength = keyof typeof BOARD_CONFIG
```
With a test asserting `attempts === length + 1`. Recommendation: **include it**; it gives `src/logic` a real, tested file and the first spec-to-code trace (R-LEN rule). Keep it a single small task.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ESLint in create-vite template | oxlint in create-vite 9.x template | by create-vite 9.2.1 | Must swap to ESLint for QA-01 |
| `.eslintrc` | Flat `eslint.config.js` with `defineConfig` from `eslint/config` | ESLint 9+/10 | Use only flat config |
| Separate `@typescript-eslint/*` packages | single `typescript-eslint` package | 2024+ | One dependency |
| `actions/checkout@v4`-class | `@v7` (Node 24 runtime) | v7.0.0 2026-07 | Use v7; docs snippet from Vercel still shows v6 |
| TypeScript latest | TS 7.0.2 is `latest`, 6.0.3 is the last 6.x | 2026 | Pin `~6.0.3` |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel honours `package.json` `engines.node` for Node selection | Vercel Git Integration | Build uses older Node; fix via dashboard setting (owner checkpoint also says set 24.x) |
| A2 | Vercel Hobby plan allows private GitHub repos for the personal owner | Pitfall 8 | Owner may have to make repo public or change plan |
| A3 | GitHub free-plan Actions minutes are sufficient for private repo CI | Pattern 5 | CI could throttle; unlikely for this size |
| A4 | Vercel dashboard labels ("Add New > Project", "Adjust GitHub App Permissions", Node version setting path) are as described | Vercel owner steps | Owner has to look around; wording only |
| A5 | Vercel default build/output (`vite build`/`dist`) are auto-detected for the Vite preset | Vercel Git Integration | Owner sets them manually per instructions |
| A6 | Edge-case table rows EC-15, EC-20, EC-23, EC-40 reflect the owner's intent | SPEC state machine | Spec must be changed after owner review; Phase 5 tests follow SPEC |

## Open Questions (RESOLVED)

1. **FINISH that itself reveals a broken streak (EC-40, rule 7).**
   - Known: the check runs on app open/focus/midnight, so normally the prompt appears before a guess. A game left open overnight could finish after the break.
   - Unclear: credit for that game before or after the prompt.
   - Recommendation: record the Board result immediately; defer the Day Streak credit until the prompt is answered; then credit +1 (Accept: LAD=yesterday then today; Decline: S=0 then S=1). Write this as the default in SPEC.md and list it under "Owner can override".
   - RESOLVED: written into SPEC.md as the stated default (record the Board result now, defer Day Streak credit until the prompt is answered, then +1), listed as owner-overridable open question 1; plan 01-02 Task 2.
2. **"K left this month" in the prompt.** plan.txt example "(2 left this month)" is ambiguous (before or after use). Recommendation: K = left before answering.
   - RESOLVED: SPEC.md default is K = Restores left before this use (EC-43), owner-overridable open question 2; plan 01-02 Task 2.
3. **Restore answered in a later month than the gap (EC-22/23).** plan.txt: "counted against the month the Restore is used in". Recommendation: refill first on the answer date, count against that month (consistent with D-03).
   - RESOLVED: SPEC.md default is refill first on the answer date and count the Restore against that month (EC-22, EC-23), owner-overridable open question 3; plan 01-02 Task 2.
4. **Zero-guess board and the 2-tries rule.** Under PLAY-07/08 a player cannot abandon a fresh board. Confirm this is intended (REQUIREMENTS says so explicitly, so SPEC just records it).
   - RESOLVED: SPEC.md records that a zero-guess Board cannot be abandoned (exactly-2-tries rule per PLAY-07/PLAY-08), owner-overridable open question 4; plan 01-02 Tasks 1-2.
5. **Does `README.md` need a rewrite now?** Not required; recommend a 10-line README (what it is, scripts, Node 24) so the Vercel/GitHub landing page is not the Vite default.
   - RESOLVED: yes, a short project README (what it is, Node 24, scripts, links to SPEC/GLOSSARY/PIPELINE) replaces the Vite default; plan 01-01 Task 2.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | all tooling | yes | 24.19.0 (matches `.nvmrc` 24) | - |
| npm | install | yes | 11.17.0 | - |
| git | repo | yes | remote `origin` = pleummu/wordyday (private, default branch main, empty of workflows) | - |
| gh CLI | PR creation, checking Actions | yes (authenticated: API calls worked) | - | github.com UI |
| GitHub Actions | CI | yes (repo exists) | `.github/` absent | - |
| Vercel account / project | QA-05 | unknown, human checkpoint | - | none; success criterion 4 blocks until owner acts |
| Vercel MCP tools in this session | optional verification | present (claude.ai Vercel) | - | not required; do not use to change settings without owner |

**Missing with no fallback:** the Vercel project link (owner action, D-14).
**Windows note:** shell is Git Bash/PowerShell; `core.autocrlf=true` set globally (verified), handled by `.gitattributes`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.3 (+ jsdom 30.1.1 and Testing Library 16.3.3 for one component test) |
| Config file | `vite.config.ts` `test` block (Wave 0 creates it) |
| Quick run command | `npm test` (`vitest run`, ~2 s) |
| Full suite command | `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QA-01 | TS is 6.0.x | script check | `npm ls typescript` output contains `6.0.` and no `7.`; `node -e "require('typescript/package.json').version.startsWith('6.0.')"` | Wave 0 (add as plan verify step; optional tiny CI step) |
| QA-01 | ESLint flat config, Prettier, Node 24 | smoke | `npm run lint && npm run format:check`; `cat .nvmrc` = 24; `ls eslint.config.js`; no `.oxlintrc.json` | Wave 0 |
| QA-01 | Fresh clone works | integration | in a fresh `git clone` dir: `npm ci && npm run lint && npm run format:check && npm run typecheck && npm test && npm run build` | manual-once at end of phase (or push and read CI) |
| QA-01 | Unit test infra real | unit | `npm test` (2 tests: pure + component) | Wave 0 |
| QA-05 | PR triggers CI | CI | `gh pr checks <n>` shows `check` pass (`gh run list`) | after workflow merged |
| QA-05 | Vercel preview on PR | manual | open the PR, find Vercel comment, open URL, see "Unlimited Wordle" placeholder | manual (owner), justified: external service dashboard |
| QA-05 | Production from main | manual | merge PR, open production URL, same placeholder, latest commit | manual (owner) |
| DOC-01 | SPEC has all owner decisions, state machine, edge-case table | doc check | `grep -c "R-RESTORE-" SPEC.md` > 0; `grep -E "EC-[0-9]{2}" SPEC.md` count >= 40; grep for each D-12 decision keyword (blocklist, plural, storage event, Play again), the "plan.txt" supersede note, and the 5 owner decisions of 2026-10-01 | Wave 0 (grep script in plan verify steps) |
| DOC-02 | GLOSSARY has twelve terms | doc check | for each of the 12 terms: `grep -c "^\*\*Board\*\*"` style or heading match; count of term entries == 12 | Wave 0 |
| DOC-01/02 | Rule cross-consistency | manual | owner reads SPEC.md Restore section against plan.txt example (Mon 1 -> Sat 6 offered, Sun 7 reset) | manual review, justified: semantic |

### Sampling Rate
- **Per task commit:** `npm test` plus the relevant single check (lint or typecheck) for tooling tasks; the doc grep for doc tasks.
- **Per wave merge:** full suite command above.
- **Phase gate:** full suite green locally, CI green on the PR, Vercel preview and production manually confirmed, before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `vite.config.ts` `test` block, `src/App.test.tsx`, one pure test file: none exist yet (greenfield).
- [ ] Framework install: `npm i -D vitest@5 jsdom @testing-library/react @testing-library/dom`.
- [ ] A doc-check script or documented grep commands for SPEC.md/GLOSSARY.md (can be inline in plan verify steps; no new test framework).

## Security Domain

`security_enforcement` is not set to false, so it applies; surface area in this phase is small (static site, no auth, no input, no storage yet).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | no accounts |
| V3 Session Management | no | none |
| V4 Access Control | no | none |
| V5 Input Validation | no (no input yet) | later phases validate localStorage on load |
| V6 Cryptography | no | none |
| V14 Config / supply chain | yes | `npm ci` with committed lockfile; Actions `permissions: contents: read`; no secrets in GitHub; pin action majors; Vercel has no env vars |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/typosquatted npm package | Tampering | names come from the project's own stack; lockfile committed; `npm ci` in CI |
| Over-permissioned workflow token | Elevation | top-level `permissions: contents: read` (in snippet) |
| Compromised third-party action | Tampering | only first-party `actions/*` used, major-tag pinned; optionally SHA-pin later (Phase 8) |
| Secrets in repo/Vercel config | Info disclosure | none required; do not add Vercel tokens (D-14) |
| Fork PR runs privileged | Elevation | `pull_request` (not `pull_request_target`); Vercel requires owner authorisation for fork PRs [CITED: vercel-for-github] |

## Sources

### Primary (HIGH confidence)
- Live run in scratch dir (2026-10-01): `npm create vite@latest -- --template react-ts` (create-vite 9.2.1) scaffold inspected; ESLint 10 + typescript-eslint 8.71 + react-hooks 7.1.1 + react-refresh + Prettier 3.9.9 + Vitest 5.0.3 + jsdom installed; lint, format:check, `tsc -b`, `vitest run`, `vite build` all passed.
- `npm view` for versions, `peerDependencies`, `engines`, dist-tags (typescript latest 7.0.2; 6.0.3 exists; typescript-eslint peer `typescript >=4.8.4 <6.1.0`, `eslint ^8.57 || ^9 || ^10`).
- `gh api` on actions/checkout and actions/setup-node: releases v7.0.1 / v7.0.0, `v7` tags exist, `using: node24`, `node-version-file` input documented in setup-node README.
- https://vitest.dev/config/ : `vitest.config.ts` vs `vite.config.ts` `test` block, `/// <reference types="vitest/config" />`.
- https://vercel.com/docs/frameworks/frontend/vite (updated 2026-08-26): rewrites only for SPA deep linking.
- https://vercel.com/docs/git/vercel-for-github (updated 2026-09-17): deploy every push, preview URL as PR comment, production branch behaviour, personal-repo owner requirement, fork authorisation.

### Secondary (MEDIUM)
- `.planning/research/SUMMARY.md`, `PITFALLS.md` (Pitfall 3 gaps), plan.txt, CONTEXT.md D-01..D-18 for the state machine content.

### Tertiary (LOW)
- Vercel dashboard click path and Node-version/engines behaviour (A1, A4, A5): from general knowledge; confirm on first deploy.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, installed and executed together.
- Architecture/CI: HIGH for workflow; MEDIUM for Vercel settings UI.
- Spec/state machine: MEDIUM-HIGH; logic is derived from settled rules, four rows flagged for owner confirmation.
- Pitfalls: HIGH for tooling ones (reproduced facts), MEDIUM for Vercel.

**Research date:** 2026-10-01
**Valid until:** 2026-10-31 (fast-moving tooling majors; re-run `npm view` for versions if execution slips)
