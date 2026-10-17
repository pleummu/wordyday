# Phase 8: E2E, CI Hardening and Pipeline Docs - Pattern Map

**Mapped:** 2026-10-16
**Files analyzed:** 7
**Analogs found:** 7 / 7 (all are edits to existing files or follow an existing doc)

## File Classification

| File | Role | Data Flow | Closest Analog | Match |
|------|------|-----------|----------------|-------|
| `scripts/check-bundle.mjs` (modify) | utility (build check) | batch / file-I/O | itself (existing `fail()` + startNames) | exact |
| `.github/workflows/ci.yml` (modify) | config (CI) | event-driven | itself (e2e job steps) | exact |
| `playwright.config.ts` (modify, only if workers/sharding needed) | config | batch | itself | exact |
| `docs/PIPELINE.md` (modify) | doc | n/a | itself (sections 4.2/4.3) | exact |
| `README.md` (verify only) | doc | n/a | line 13 already links PIPELINE.md | exact |
| `08-VERIFICATION.md` (create) | doc (traceability) | n/a | `.planning/phases/07-themes-accessibility-and-polish/07-VERIFICATION.md` | role-match |
| e2e specs | test | request-response | no change; audit only (D-06) | n/a |

## Pattern Assignments

### `scripts/check-bundle.mjs` (utility, file-I/O)

**Analog:** itself. Add budget code between the `__WORDLE_TEST__` loop (line 117-122) and `if (failed) process.exit(1)` (line 124).

**Existing imports** (lines 4-5), add `gzipSync`:
```js
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
// add: import { gzipSync } from 'node:zlib'
```

**Failure pattern** (lines 38-42), reuse as-is for budget overages:
```js
let failed = false
const fail = (msg) => {
  console.error(`check:bundle FAILED: ${msg}`)
  failed = true
}
```

**Entry set to reuse** (lines 28-29): `startNames` holds `assets/x.js` names for the entry script plus modulepreloads. Entry CSS needs a new parse of `<link rel="stylesheet" href>` from `html`, normalised the same way (`p.replace(/^\.?\//, '')`).

**Budget core** (from RESEARCH, use gzip level 9 to match Vite):
```js
const gz = (rel) => gzipSync(readFileSync(join(dist, rel)), { level: 9 }).length
const BUDGET = { js: 100 * 1024, css: 10 * 1024 }
```

**Ordering rule:** print the size table (every .js and .css in `dist/assets`, raw and gz KB, tagged entry / Nx pool / other) BEFORE `if (failed) process.exit(1)` so red runs show sizes. The current success-only output (lines 126-134) prints pools in raw KB; fold it into the table. Existing exit/OK pattern: `console.log('check:bundle OK')` with two-space indented lines.

Note: the `assets` const (line 86) is `.js` only; the table needs its own css-inclusive listing.

---

### `.github/workflows/ci.yml` (config, event-driven)

**Analog:** itself, `e2e` job (lines 40-60 of the file). Replace the single `npx playwright install` step with the cache pattern; keep the same job id `e2e` (required check name) and the upload step.

**Existing step style to keep** (checkout/setup-node/npm ci, actions at `@v7`):
```yaml
- uses: actions/checkout@v7
- uses: actions/setup-node@v7
  with:
    node-version-file: .nvmrc
    cache: npm
- run: npm ci
- run: npx playwright install --with-deps chromium
- run: npx playwright test
- uses: actions/upload-artifact@v7
  if: ${{ !cancelled() }}
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 14
```

**Cache addition** (RESEARCH, `actions/cache@v6`, key on installed Playwright version): output step `pw` reading `require('@playwright/test/package.json').version`, cache `~/.cache/ms-playwright`, run `install --with-deps chromium` on miss and `install-deps chromium` on hit.

**If sharding is needed (only if > ~10 min):** rename to `e2e-run` matrix over `[chromium, mobile]` with unique artifact names, plus aggregate job `e2e` with `needs: e2e-run`, `if: ${{ always() }}`, step `test "${{ needs.e2e-run.result }}" = "success"`. Try `workers: CI ? 2 : undefined` in `playwright.config.ts` first.

**Check job:** no change needed; `npm run check:bundle` is already the last step (budget rides on it).

---

### `playwright.config.ts` (config)

Only edit if measurement demands. Current knobs to keep (D-09): `retries: CI ? 1 : 0`, `trace: 'on-first-retry'`, `forbidOnly: CI`. Add one line alongside them if needed:
```ts
forbidOnly: CI,
retries: CI ? 1 : 0,
// workers: CI ? 2 : undefined,
```

---

### `docs/PIPELINE.md` (doc)

**Analog:** itself. Stale spots: line 5 status note (the only 🔜), `✅ (Phase 2)` annotations in 4.2/4.3, "2 -> 8" ranges, section 2.1 and 3 snapshots, section 6 human gates (add slang review, owner device checks, repo public flip), "Words build" row (real files are `src/data/words-N.json`, not `answers-N.json`/`guesses-N.json`). Add: `build:e2e` row, bundle budget, branch protection and required checks, per-phase stacked PR flow, retrospective (sources: `.planning/phases/*/*-SUMMARY.md`, `*-VERIFICATION.md`), 3-5 "🧪 Try it" boxes (drift, failing unit test, budget overage, red E2E blocks merge).

Gate after editing: `npx prettier --check docs README.md` and `! grep -n "🔜" docs/PIPELINE.md`.

### `README.md`

Already links it at line 13 (`- [docs/PIPELINE.md](docs/PIPELINE.md): how code gets from a branch to production`). Verify only; optionally add `check:bundle`, `test:e2e` to the Scripts line (line 9 lists only up to `preview`).

---

### `08-VERIFICATION.md` (doc)

**Analog:** `.planning/phases/07-themes-accessibility-and-polish/07-VERIFICATION.md`

Structure to copy: YAML frontmatter (`phase`, `verified`, `status`, `score`, `overrides_applied`), title `# Phase N: ... Verification Report`, Goal/Status lines, then `## Observable Truths` table (`| # | Truth (ROADMAP SC) | Status | Evidence |`), `## Behavioral Spot-Checks` (`| Check | Command | Result | Status |`), `## Requirements Coverage` (`| Req | Plans | Status | Evidence |`).

Embed the QA-03 traceability table from RESEARCH (item to spec file : test name) as the QA-03 evidence. Spec names live in `e2e/game.spec.ts`, `feedback.spec.ts`, `persistence.spec.ts`, `boards.spec.ts`, `forfeit.spec.ts`, `restore.spec.ts`, `a11y-themes.spec.ts`.

## Shared Patterns

### Required-check names
Job ids `check`, `words`, `e2e` in ci.yml are the protection contexts. Never rename; if `e2e` is sharded keep an aggregate job named `e2e`.

### Build mode split
`npm run build` for `check:bundle` (script fails if `__WORDLE_TEST__` is in dist); `build:e2e` only via the Playwright `webServer` command.

### Formatting
Prettier covers `.mjs`, `.yml`, `.md`: no semicolons, single quotes, 2-space indent (match `check-bundle.mjs`). Run `npm run format:check` before commit.

## No Analog Found

| File | Reason |
|------|--------|
| Branch protection `gh api` call | Not a file; command is in RESEARCH (use `strict: false` for stacked PRs). Needs public repo (human gate). |
| Stacked PR branches | Git operations, no file. Phase end SHAs in RESEARCH (2 `32e2175`, 3 `c49138a`, 4 `449ed23`, 5 `ecd554d`, 6 `c15dcfb`, 7 `01f6bae`). |

## Metadata

**Analog search scope:** `scripts/`, `.github/workflows/`, `playwright.config.ts`, `docs/`, `README.md`, `.planning/phases/*/*-VERIFICATION.md`
**Files scanned:** 6
**Pattern extraction date:** 2026-10-16
