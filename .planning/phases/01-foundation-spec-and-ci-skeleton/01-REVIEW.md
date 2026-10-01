---
phase: 01-foundation-spec-and-ci-skeleton
reviewed: 2026-10-01T12:35:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - .gitattributes
  - .github/workflows/ci.yml
  - .gitignore
  - .nvmrc
  - .prettierignore
  - .prettierrc.json
  - eslint.config.js
  - index.html
  - package.json
  - src/App.test.tsx
  - src/App.tsx
  - src/logic/boards.test.ts
  - src/logic/boards.ts
  - src/main.tsx
  - src/styles/global.css
  - src/styles/tokens.css
  - tsconfig.app.json
  - tsconfig.json
  - tsconfig.node.json
  - vite.config.ts
findings:
  critical: 0
  warning: 3
  info: 7
  total: 10
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-10-01T12:35:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

This review covers the Phase 1 skeleton: tooling config, the CI workflow, a placeholder App, the `BOARD_CONFIG` constant and the base CSS tokens. There are no game logic, storage or network paths yet, so the attack surface is close to zero. I found no blockers.

I checked these points directly:

- **Strict mode:** I compiled a probe file against TS 6.0.3 with no `strict` flag. It raised TS7006 and TS2322, which shows strict is on by default in TS 6. Leaving `strict` out of the config is therefore not a bug (see IN-01).
- **CI action versions:** recent CI runs on `main` and on the PR branch passed, so `actions/checkout@v7` and `actions/setup-node@v7` resolve.
- **Favicon:** `public/favicon.svg` exists.
- **Contrast:** I measured the colour contrast in tokens.css with the WCAG formula. The muted text colour fails AA (WR-01).

The main concerns are an accessibility contrast failure that conflicts with a project constraint, an `engines` range that allows unsupported Node versions, and a CI concurrency setting that can leave `main` commits unverified.

## Warnings

### WR-01: Muted text colour fails WCAG AA contrast (3.85:1)

**File:** `src/styles/tokens.css:4` (used at `src/styles/global.css:25`)
**Issue:** `--color-muted: #7a7f8a` on `--color-bg: #fbfaf7` has a measured contrast ratio of 3.85:1. Normal-size text needs 4.5:1 (WCAG 1.4.3 AA). The "Coming soon" paragraph is body-size text in this colour. CLAUDE.md makes accessibility a hard constraint and plans axe checks for contrast, so this token will fail once `@axe-core/playwright` is added. Because it is a shared design token, the failure will also spread to every later screen that uses "muted" text.
**Fix:** Darken the token until it reaches at least 4.5:1 while keeping the soft look. For example, `#646975` is about 5.5:1:
```css
--color-muted: #646975;
```
Consider adding a unit or E2E contrast check for each token pair now, so later palettes (dark, colour-blind) are held to the same rule.

### WR-02: `engines.node` allows Node versions the toolchain does not support

**File:** `package.json:40-42`
**Issue:** `"node": ">=22.12"` accepts Node 23 and 25. CLAUDE.md states that Vitest 5 requires `^22.12 || ^24 || >=26`, so a contributor on Node 23 or 25 gets no engine warning and may see test failures that are hard to diagnose. The range also does not match `.nvmrc` (24), the project's single source of truth.
**Fix:**
```json
"engines": { "node": "^22.12 || ^24 || >=26" }
```
Or, to match `.nvmrc` exactly: `"node": "^24"`.

### WR-03: CI concurrency cancels in-progress runs on `main`

**File:** `.github/workflows/ci.yml:8-10`
**Issue:** `group: ci-${{ github.ref }}` with `cancel-in-progress: true` also applies to `push` events on `refs/heads/main`. If two PRs merge close together, the first merge commit's CI run is cancelled, and that commit is never verified. Vercel still deploys it to production, because Vercel Git integration is not gated on CI. Cancelling is only wanted for superseded PR pushes.
**Fix:**
```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

## Info

### IN-01: Strict type checking relies on the TS 6 default rather than explicit config

**File:** `tsconfig.app.json:2-24`, `tsconfig.node.json:2-21`
**Issue:** Neither config sets `"strict": true`. Strict is on because TS 6 defaults to it (verified with a probe compile). Editors, typescript-eslint, or a later TS change could disagree, and the intent is not visible in the config. The Core Value ("scoring including repeated letters must be right") also makes `noUncheckedIndexedAccess` worth turning on before the scoring code arrives. Without it, `guess[i]` and `counts[letter]` are typed as defined even when they may be `undefined`.
**Fix:** Add `"strict": true` and `"noUncheckedIndexedAccess": true` to `tsconfig.app.json` (and `"strict": true` to `tsconfig.node.json`).

### IN-02: `.gitignore` is missing paths the tooling already expects

**File:** `.gitignore:1-24`
**Issue:** `coverage` is listed in `.prettierignore` and in ESLint `globalIgnores`, but not in `.gitignore`. The same is true of Playwright's `playwright-report/` and `test-results/` (planned for E2E), and of `.env` (only `*.local` is covered). A `vitest --coverage` run or a Playwright run would leave untracked artefacts that are easy to commit by mistake.
**Fix:** Add:
```
coverage
playwright-report
test-results
.env
```

### IN-03: `boards.test.ts` second test is tautological and would pass on an empty config

**File:** `src/logic/boards.test.ts:11-15`
**Issue:** The first test already checks all three entries, so the loop adds nothing. If `BOARD_CONFIG` ever lost keys, the loop would run zero times and still pass. It does not check that exactly the lengths 4, 5 and 6 exist.
**Fix:** Assert the key set as well, for example `expect(Object.keys(BOARD_CONFIG)).toEqual(['4', '5', '6'])`, or drop the redundant test.

### IN-04: `body { min-height: 100vh }` overflows on mobile browsers

**File:** `src/styles/global.css:9`
**Issue:** On iOS Safari and Chrome Android, `100vh` includes the area behind the collapsing URL bar. This causes a scrollbar and content shift, which will matter once the board and on-screen keyboard fill the viewport ("works at phone width").
**Fix:** `min-height: 100vh; min-height: 100dvh;`

### IN-05: Type-checking runs twice in CI

**File:** `package.json:8,13`; `.github/workflows/ci.yml:24,26`
**Issue:** `npm run typecheck` (`tsc -b`) runs, then `npm run build` runs `tsc -b` again. The incremental build info softens the cost, but the duplication is confusing and the build step can never fail on types that typecheck did not already catch.
**Fix:** Make `build` just `vite build` and keep `typecheck` as its own CI step. Or keep it as is if you want local `npm run build` to stay type-safe; this is a deliberate trade-off.

### IN-06: Installed version ranges drift from the documented stack

**File:** `package.json:18-19,37`
**Issue:** CLAUDE.md pins React 19.3.0 and Vite 8.3.2, but package.json declares `^19.2.8` and `^8.3.0`. The lockfile decides what is actually installed, but the declared floors do not match the documented stack.
**Fix:** Bump the ranges to `^19.3.0` and `^8.3.2`, or update CLAUDE.md to match what was chosen.

### IN-07: ESLint gives `vite.config.ts` browser globals

**File:** `eslint.config.js:10-19`
**Issue:** A single block applies `globals.browser` to all TS files, including the Node-side `vite.config.ts`. Later Node scripts (for example the planned `build:words` script) would be linted without Node globals.
**Fix:** Add a second block such as `{ files: ['vite.config.ts', 'scripts/**'], languageOptions: { globals: globals.node } }`.

---

_Reviewed: 2026-10-01T12:35:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
