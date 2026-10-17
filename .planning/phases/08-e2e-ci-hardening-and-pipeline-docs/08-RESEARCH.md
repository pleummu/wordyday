# Phase 8: E2E, CI Hardening and Pipeline Docs - Research

**Researched:** 2026-10-16
**Domain:** Playwright E2E audit, GitHub Actions CI, branch protection, bundle budget, git landing, docs
**Confidence:** HIGH (repo facts verified by grep/git/gh); MEDIUM for `gh api` protection payload and cache snippet (written from knowledge, not run; repo is private so the call 403s today)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Make the repo public so branch protection is available (free). Scan git history for secrets first. Owner flips visibility (human gate).
- D-02: Do this first, before landing any phase. Protection is on before Phase 2-7 PRs merge.
- D-03: Required status checks on `main`: `check`, `words`, `e2e`.
- D-04: Land Phases 2-7 as a stacked chain of per-phase PRs. PR #3 shrinks to Phase 2 only (end `32e2175`). Then one PR each for Phases 3, 4, 5, 6, 7, each based on the previous. Merge commits (no squash, no rebase). Phase 8 goes on a fresh `phase-08/...` branch from main.
- D-05: Each phase PR must pass CI on its own code. Fix reds on that phase's branch, carry the fix forward.
- D-06: Audit only plus traceability map; add tests only for real gaps. No duplicate "golden journey" spec.
- D-07: All specs run in both desktop and Pixel 7 projects. No mobile subset tagging.
- D-08: Measure CI e2e first. Shard only if over ~10 min. Add Playwright browser caching keyed on lockfile Playwright version.
- D-09: Keep `retries: 1`, trace on first retry. Flaky tests are bugs to fix this phase.
- D-10: gzip budget: entry JS <= 100 KB gz, entry CSS <= 10 KB gz. No per-pool caps.
- D-11: Fail with clear message when over budget; always print gzip size table for all chunks.
- D-12: Update PIPELINE.md to match reality, remove all 🔜 markers, add short retrospective per phase.
- D-13: 3-5 short "🧪 Try it" boxes.
- D-14: Audience owner + portfolio visitors; link from README (in scope).

### Claude's Discretion
Sharding mechanics, cache key format, size-table wording, secret-scan method, retrospective format.

### Deferred Ideas (OUT OF SCOPE)
Production domain for OG tags/share URL; Firefox/WebKit projects.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QA-03 | Playwright E2E against production build: win, loss, invalid guess, refresh resume, Board switching, Give Up, Restore (fake clock), axe; desktop + mobile | Traceability table below: every item already has a spec; no real gap found |
| QA-04 | CI on every PR/push runs lint, format, typecheck, unit, build, E2E, word drift | ci.yml already has all; remaining work is first real run, caching, bundle budget, branch protection |
| DOC-03 | docs/PIPELINE.md learning guide | Stale-section list below |
</phase_requirements>

## Summary

Phase 8 is audit and landing, not building. All QA-03 items already have E2E specs (table below). `ci.yml` already contains the `check`, `words` and `e2e` jobs. The real risks are (1) landing 6 phases of code through CI for the first time, (2) the stacked-PR mechanics, and (3) Phase 6 not being formally closed.

**Corrections to CONTEXT.md assumptions (verified):**
- `origin/phase-02/playable-normal-game` is already pushed, but it points at `c49138a` (Phase 3 end), not Phase 2. So PR #3 currently contains Phase 2 + 3 (78 commits ahead of main). Local branch is 192 commits ahead of that remote tip. Phases 4-7 are unpushed.
- Phase 5 has no completion marker; its last commit is `ecd554d` "docs(05): add phase verification report (gaps found)". Phase 6 has no VERIFICATION.md, plan 06-07 is unchecked in ROADMAP, though `06-VALIDATION.md` says `status: complete` and last Phase 6 commit is `c15dcfb`.
- `docs/PIPELINE.md` contains no literal 🔜 emoji on any line except the status note on line 5; staleness is in other places (see below).
- README.md already links `docs/PIPELINE.md` (line 13). The link task is done; only verify.
- Working-tree changes: `eslint.config.js` has a stray 2-space indent on line 1 (`  import js ...`) which would fail `format:check`/lint; `.planning/research/FEATURES.md` gains a leading blank line; `src/state/gameStore.ts` shows modified but `git diff` is empty (line-ending/stat noise). All three look like accidental edits: ask owner, then likely `git checkout` them (owner's decision, do not discard unasked).

## Architectural Responsibility Map

| Capability | Primary Tier | Rationale |
|------------|-------------|-----------|
| E2E / CI / protection / budget | CI (GitHub Actions) | Static site; no server tier |
| Bundle budget | Build output check script (Node) | Reads `dist/` |
| Docs | Repo static markdown | n/a |

## Standard Stack

No new runtime dependencies. Use what exists: `@playwright/test` 1.63.0 installed (`^1.63.0`; registry latest 1.64.1) [VERIFIED: npm view + node_modules], `@axe-core/playwright` 4.13.0, `node:zlib` for gzip.

### Current latest action majors [VERIFIED: gh api repos/actions/*/releases/latest, 2026-10-16]
| Action | Latest | ci.yml uses |
|---|---|---|
| actions/checkout | v7.0.1 | @v7 (current) |
| actions/setup-node | v7.1.0 | @v7 (current) |
| actions/upload-artifact | v7.0.2 | @v7 (current) |
| actions/cache | v6.1.0 | not used yet; use `@v6` if added |

No version bumps needed. Optional: add `download-artifact` only if sharding with merged reports (not recommended).

## Package Legitimacy Audit

No new packages are installed. (gitleaks is a Go binary, not an npm install; see secret scan.) Not applicable.

## Architecture Patterns

### Pipeline flow
```
PR/push -> [check: lint,format,tsc,vitest,build,check:bundle(+budget)]
        -> [words: build:words, git diff --exit-code]
        -> [e2e: cache browsers -> playwright install -> build:e2e + preview -> chromium+mobile -> report artifact]
all three -> required status checks on main -> merge commit -> Vercel production
```

### QA-03 traceability (verified by grep of e2e/*.spec.ts)
| QA-03 item | Spec file : test | Gap? |
|---|---|---|
| Full win | `game.spec.ts` : "win a 5-letter game" (also `result.spec.ts` win modal/banner) | none |
| Full loss | `game.spec.ts` : "lose a 4-letter game reveals the answer"; `result.spec.ts` "loss shows Out of guesses" | none |
| Invalid guess | `feedback.spec.ts` : "invalid word shakes without using an attempt"; toasts in `toast.spec.ts` | none |
| Resume after refresh | `persistence.spec.ts` : "refresh keeps submitted guesses and drops the half-typed row", "a finished Board comes back finished after refresh", "a refresh reopens the last Board played", "a refresh mid-loss cannot dodge the loss" | none |
| Switching Boards | `boards.spec.ts` : "switching length never ends a game", "switching mode never ends a game...", "a finished Board stays finished after switching away and back" | none |
| Give Up rule | `forfeit.spec.ts` : "Give up appears only with exactly 2 tries left", "confirming Give up reveals the answer and survives a refresh", "Give up works at 4 and 6 letters" | none |
| Restore prompt, fake clock | `restore.spec.ts` : "STRK-06 prompt after one missed day", "STRK-07 Restore keeps the streak", "STRK-07 No resets silently", EC-05/07/11/21, uses `page.clock.install`/`setSystemTime`/`fastForward` | none |
| axe | `a11y-themes.spec.ts` : "axe and focus ring: <combo>"; also `restore.spec.ts` axe tests, `result.spec.ts` "axe passes with the modal open", `definition.spec.ts` "axe with the panel in each state" | none |

Conclusion: no real gap. VERIFICATION should embed this table. One weak point to confirm during execution: the 5-letter win and 4-letter loss are the only "full game" tests in `game.spec.ts`; other lengths covered via forfeit/layout specs. Acceptable per D-06.

### Playwright patterns already in the repo (confirmed)
- `test.use({ reducedMotion: 'reduce' })` at file top (most specs); `result.spec.ts` and `motion.spec.ts` explicitly switch to `'no-preference'` for timing tests.
- Fake clock: `await page.clock.install({ time: new Date('2026-06-03T09:00:00') })` before `goto`, then `page.clock.setSystemTime(...)` and `page.clock.fastForward('00:03:00')` (restore.spec.ts, help.spec.ts, layout.spec.ts). Local-time ISO string without `Z` is used on purpose (the app uses local calendar dates).
- `playwright.config.ts`: `retries: CI ? 1 : 0`, `trace: 'on-first-retry'`, `forbidOnly` in CI, html + list reporters, webServer `npm run build:e2e && npm run preview -- --port 4173 --strictPort`, `reuseExistingServer: !CI`, projects `chromium` + `mobile` (Pixel 7). No `workers` set (CI default is 1 worker on 2-core runner... Playwright defaults to half of cores, so ~1 on ubuntu-latest 2 vCPU). Expect a slow run: ~200 tests x 2 projects = ~400 test executions serial. This is the likeliest place to exceed 10 min.

### CI e2e job: browser cache pattern (no sharding first)
```yaml
- id: pw
  run: echo "v=$(node -p "require('@playwright/test/package.json').version")" >> "$GITHUB_OUTPUT"
- uses: actions/cache@v6
  id: pwcache
  with:
    path: ~/.cache/ms-playwright
    key: pw-${{ runner.os }}-${{ steps.pw.outputs.v }}
- if: steps.pwcache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps chromium
- if: steps.pwcache.outputs.cache-hit == 'true'
  run: npx playwright install-deps chromium   # OS libs are not cached
```
[CITED: playwright.dev/docs/ci, caching browsers is documented but the Playwright team discourages it as gains are small; D-08 still asks for it. MEDIUM.] Browser is only the chromium download (~150 MB); gain is ~20-40 s. Do it only after measuring.

### Sharding only if e2e > ~10 min, keeping required check name stable
Prefer first: set `workers` in CI (e.g. `workers: CI ? 2 : undefined`) since tests are isolated per-page. If still slow, matrix by project, plus an aggregate job named `e2e`:
```yaml
e2e-run:
  strategy: { fail-fast: false, matrix: { project: [chromium, mobile] } }
  name: e2e-run (${{ matrix.project }})
  # ... npx playwright test --project=${{ matrix.project }}
  # upload-artifact name: playwright-report-${{ matrix.project }}  (names must be unique in v4+)
e2e:
  needs: e2e-run
  if: ${{ always() }}
  runs-on: ubuntu-latest
  steps:
    - run: test "${{ needs.e2e-run.result }}" = "success"
```
The aggregate job id/name `e2e` keeps the required context unchanged. Each matrix leg also rebuilds (webServer builds `build:e2e`), acceptable. Note `if: always()` is essential: a skipped required check counts as passing in GitHub protection when the job is skipped due to failed needs; the explicit result test avoids that hole. [ASSUMED: GitHub behaviour on skipped required checks; widely documented.]

### Branch protection (after repo is public)
Job `name` defaults to the job id, so contexts are exactly `check`, `words`, `e2e` (workflow name `CI` is not part of the context for classic protection).
```bash
gh api -X PUT repos/pleummu/wordyday/branches/main/protection --input - <<'EOF'
{
  "required_status_checks": { "strict": true, "contexts": ["check", "words", "e2e"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```
Repo is `pleummu/wordyday` [VERIFIED: git remote]. `strict: true` requires branches to be up to date with main: this interacts badly with a stacked chain (each PR must be rebased/merged with main after the previous merges), so for the landing set `strict: false`, or use `merge main into branch` on each PR. Recommend `strict: false` (solo owner). `enforce_admins: false` lets the owner bypass in an emergency; set true only if desired. A checks context only appears for selection after it has run once; the API accepts any string, so setting before the first run is fine but a typo makes PRs unmergeable (verify by reading back: `gh api repos/pleummu/wordyday/branches/main/protection/required_status_checks`). Currently `gh api .../protection` returns 403 "Upgrade to GitHub Pro or make this repository public" [VERIFIED]. Alternative: repository rulesets also need public/Pro.

### Stacked PR landing (verified state)
Phase end commits on `phase-02/playable-normal-game`:

| Phase | Last commit | Note |
|---|---|---|
| 2 | `32e2175` | docs(phase-02): evolve PROJECT.md |
| 3 | `c49138a` | currently the remote branch tip |
| 4 | `449ed23` | |
| 5 | `ecd554d` | verification report "(gaps found)"; no later 05 commit. Check 05-VERIFICATION.md status; ROADMAP shows 05 complete 2026-10-05 |
| 6 | `c15dcfb` | "mark phase 6 nyquist compliant"; no 06-VERIFICATION.md, 06-07 unchecked in ROADMAP. Plan 06-07's owner checks (iPhone, live dictionary) may be unfinished: ask owner before the Phase 6 PR |
| 7 | `01f6bae` | |

Mechanics: for each phase create branch at its end commit (`git branch phase-0N/<slug> <sha>`), push, open PR with `--base` = previous phase branch (first one base `main`). Merge commits only. After the base PR merges, GitHub auto-retargets the child PR to main if the base branch is deleted on merge; otherwise `gh pr edit N --base main`. Caveat: with a pure merge commit chain the child PR diff stays correct because history is linear; no conflicts expected. Retarget PR #3: `git push --force-with-lease origin 32e2175:phase-02/playable-normal-game` shrinks it (force push of owner's own branch; confirm with owner; branch protection is on main only). Pushing 190 commits at once triggers CI per PR; `concurrency: cancel-in-progress` per ref is fine.
CI note: PRs whose base is not `main` still run `pull_request` workflows (trigger has no branch filter). Good.
Phase 2-5 PRs will run CI with the then-current Playwright specs; Node from `.nvmrc`.
`gh pr view 3`: OPEN, base main, MERGEABLE, "Phase 2: playable Normal game". Remote branches: main, phase-01/foundation (merged), phase-02/playable-normal-game; `phase-01/deploy-proof` appears in tracking refs but not on remote (deleted).

### Secret scan (recommend git grep over history; gitleaks not installed)
`gitleaks` is not on PATH [VERIFIED]; `npx gitleaks` is not an official path (npm package `gitleaks` v1.0.0 exists but is NOT the Zricethezav tool; treat as untrusted, do not run). winget/go binary needs install. Quickest reliable: already performed here:
```bash
git log --all -p -G"(ghp_|github_pat_|sk-[A-Za-z0-9]{20}|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|PRIVATE)|VERCEL_TOKEN)" --format=%h --name-only
git log --all --diff-filter=A --name-only --format= | grep -iE "\.env|\.pem|\.key|secret|\.vercel"
```
Result (2026-10-16, all refs): only hit is `.planning/research/STACK.md` mentioning the *name* `VERCEL_TOKEN` in prose (no value). Only added file matching the name filter is `src/styles/tokens.css` (design tokens). No `.env`/`.vercel` ever committed. Residual privacy note: commit author email `akrananb@gmail.com` is in history (the other author is a noreply address); the owner should know it becomes public. Optional second pass: the Docker-free `gitleaks` binary via `winget install gitleaks` if the owner wants belt and braces. [MEDIUM: regex scan is not exhaustive, e.g. high-entropy unknown formats.]

### Bundle budget: extend scripts/check-bundle.mjs
Existing script: parses `dist/index.html` for `<script type=module src>` and `modulepreload` links into `startNames` (entry set), asserts pools live in separate chunks, prints per-pool raw KB at the end. Add before the final `if (failed)`:
```js
import { gzipSync } from 'node:zlib'
const gz = (rel) => gzipSync(readFileSync(join(dist, rel))).length
const BUDGET = { js: 100 * 1024, css: 10 * 1024 }
const cssStart = [...(html.match(/<link\b[^>]*rel="stylesheet"[^>]*>/g) ?? [])]
  .map((t) => t.match(/\bhref="([^"]+)"/)?.[1]).filter(Boolean)
  .map((p) => p.replace(/^\.?\//, ''))
const entryJs = [...startNames].filter((n) => n.endsWith('.js'))
const sum = (names) => names.reduce((s, n) => s + gz(n), 0)
const jsGz = sum(entryJs), cssGz = sum(cssStart)
if (jsGz > BUDGET.js) fail(`entry JS is ${(jsGz/1024).toFixed(1)} KB gzip, budget ${BUDGET.js/1024} KB.`)
if (cssGz > BUDGET.css) fail(`entry CSS is ${(cssGz/1024).toFixed(1)} KB gzip, budget ${BUDGET.css/1024} KB.`)
// table: print for every file in dist/assets (js+css) with raw and gz KB, tagged entry / 4-letter pool / other
```
Notes: budget the sum of entry + modulepreloaded JS (that is what loads at start); baseline 86.1 KB gz JS / 4.4 KB gz CSS is 14% / 56% headroom. Print the table BEFORE the failure exit so a red run still shows sizes (move table printing above `process.exit(1)` or print in both paths). Existing success output prints only pools in raw KB; replace with the table. Vite's own gzip numbers use gzip level 9 via `gzip-size`; `gzipSync` default level 6 gives slightly larger numbers, so pass `{ level: 9 }` to match `vite build` output. Unit-testing: the script is run in CI against a real build; acceptable verification is a deliberate-overage run (temporarily set budget to 50 KB, see it fail, revert) which doubles as a PIPELINE "Try it" box.

### docs/PIPELINE.md stale vs reality
- Line 5 status note says "written at project start... sections marked 🔜 describe things that don't exist yet": delete/replace. No other 🔜 glyph exists (grep verified); instead stale markers are the `✅ (Phase 2)` annotations in 4.2/4.3 (E2E tests ✅, Word drift ✅, `build:words ✅`, `test:e2e ✅`, `check:bundle ✅`) and the phase ranges "2 -> 8", "1 -> 8".
- 4.2 table lacks: `build:e2e` mode row, bundle budget, branch protection/required checks, Vercel previews already described. "Words build" row describes `answers-N.json`/`guesses-N.json`, but the real files are `src/data/words-N.json` (answers/slang/defs fields) - verify and fix.
- Section 2.1 "What's already done" and section 3 (8 phases) and section 6 human gates (only Phase 1 gates listed; add slang review, owner checks, repo public flip) are start-of-project snapshots.
- Section 4.3 CI description (3 jobs) is accurate; add caching, budget, aggregate/sharding only if introduced.
- Missing: per-phase PR flow, branch protection, retrospective, 3-5 Try-it boxes. Sources for retrospective: `.planning/phases/*/*-SUMMARY.md`, `*-VERIFICATION.md` (Phase 4 had a gaps-found verification then gap-closure plans 04-08..04-12; Phase 5 verification "gaps found"; Phase 6 plan 06-08 migrated legacy specs; Phase 7 added axe themes).
- Heed `format:check`: PIPELINE.md is Prettier-checked (README/docs included unless .prettierignore). Run `npx prettier --check docs README.md` after editing.

## Don't Hand-Roll
| Problem | Use | Why |
|---|---|---|
| Gzip size | `node:zlib` gzipSync level 9 | matches Vite report; no dep |
| Secret scan | git log -G regex now; gitleaks binary optional | no package install needed |
| Browser caching | actions/cache@v6 on `~/.cache/ms-playwright` | standard |
| Test-sharding report merge | skip it; matrix per project with separate artifacts | merge-reports adds complexity not needed |

## Common Pitfalls
1. **First CI run of old phases fails for env reasons** (Linux vs Windows: font metrics in layout specs at 320x500, case-sensitive imports, CRLF/LF in `words` drift job and Prettier `endOfLine`). Check for `.gitattributes`/`.prettierrc` `endOfLine`. The accidental working-tree edits (indented import in eslint.config.js) would also fail `format:check`. Warning sign: `words` job red on a clean checkout, `layout.spec.ts` fails only in CI.
2. **E2E runtime**: ~400 executions on 2 vCPU with timeout-minutes 15; may hit the timeout. Set `workers: 2` in CI first before sharding. Measure on the first PR.
3. **Required-check name drift**: sharding or renaming a job strands PRs as "Expected - waiting". Keep aggregate `e2e`.
4. **strict up-to-date + stacked PRs**: forces repeated rebases; use `strict: false`.
5. **`check:bundle` vs `build:e2e`**: check:bundle fails if `dist/` came from e2e mode; the CI `check` job runs `npm run build` fresh so fine; locally run build before check.
6. **Retargeting stacked PRs**: deleting the base branch on merge auto-closes (not retargets) the child PR in some configurations; retarget with `gh pr edit --base main` BEFORE deleting the base branch.
7. **Flaky = bug (D-09)**: read `playwright-report` for "flaky" status; timing specs in `result.spec.ts`/`motion.spec.ts` (no-preference) are the likeliest.
8. **Public flip**: commit email exposure; Vercel Git integration for public repos still fine. `permissions: contents: read` in ci.yml is already least-privilege; PRs from forks do not get secrets (none used).

## Environment Availability
| Dependency | Needed by | Available | Fallback |
|---|---|---|---|
| gh CLI authenticated | landing, protection | yes (works against repo) | - |
| gitleaks | secret scan | no | `git log -G` regex (done) |
| Node/npm | all | yes (>=22.12) | - |
| Playwright browsers local | local e2e | install times out here (user memory: curl+unzip into ms-playwright) | rely on CI for the full run |
| GitHub public repo | branch protection | not yet (PRIVATE) | human gate D-01 |

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | Vitest 5.0.3 (unit/component) + Playwright 1.63.0 (E2E, projects chromium + mobile) |
| Config | `vite.config.*` (vitest), `playwright.config.ts` |
| Quick run | `npm test` ; `npx playwright test e2e/game.spec.ts --project=chromium` |
| Full suite | `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build && npm run check:bundle && npx playwright test` |

### Phase Requirements -> Test Map
| Req | Behavior | Type | Command | Exists |
|---|---|---|---|---|
| QA-03 | All eight items pass in both projects | e2e | `npx playwright test game feedback persistence boards forfeit restore a11y-themes` | yes |
| QA-03 | Traceability table recorded in VERIFICATION | manual doc check | grep spec names exist: `npx playwright test --list` | yes |
| QA-04 | CI runs 3 jobs green on a PR | CI | `gh pr checks <n>` | yes (ci.yml) |
| QA-04 | Required checks set on main | smoke | `gh api repos/pleummu/wordyday/branches/main/protection/required_status_checks --jq .contexts` equals check,words,e2e | Wave 0 (needs public repo) |
| QA-04 | Bundle budget fails when over | script | temporarily lower BUDGET, `npm run build && npm run check:bundle` exits 1 with message and table | Wave 0 (new code) |
| DOC-03 | No stale markers; README links guide | grep | `! grep -n "🔜" docs/PIPELINE.md` and `grep -n PIPELINE.md README.md`; `npx prettier --check docs README.md` | yes |

### Sampling Rate
- Per task commit: quick commands above plus `npm run typecheck`.
- Per wave merge: full suite (E2E on CI via PR).
- Phase gate: all three required checks green on each landing PR; protection read-back matches.

### Wave 0 Gaps
- [ ] Budget code + size table in `scripts/check-bundle.mjs` (and a deliberate-overage verification)
- [ ] Owner decision on working-tree edits before cutting branches
- [ ] Repo public flip (human) before the protection call

## Security Domain
| ASVS | Applies | Control |
|---|---|---|
| V14 config/supply chain | yes | `permissions: contents: read`, pinned major action versions, no secrets in repo (history scanned) |
| V2/V3/V4/V5/V6 | no | static client app, localStorage only |

Threats: leaked secret in public history (mitigated by scan), unreviewed merge (required checks), malicious third-party action (only first-party `actions/*` used).

## Assumptions Log
| # | Claim | Risk if wrong |
|---|---|---|
| A1 | Skipped needs-dependent job counts as passing for required checks, so aggregate uses `if: always()` | Failed shard might not block merge |
| A2 | `gh api PUT .../protection` payload above is accepted as written | Fix JSON fields on first run (read error message) |
| A3 | Default Playwright CI workers = 1 on 2-vCPU runner | E2E runtime estimate off |
| A4 | PR child retarget behaviour on base-branch deletion | Child PR closed; reopen with new base |

## Sources
- Repo verification (HIGH): `.github/workflows/ci.yml`, `playwright.config.ts`, `scripts/check-bundle.mjs`, `e2e/*.spec.ts`, `docs/PIPELINE.md`, `git log`, `gh pr view 3`, `gh api` (403 on protection, latest releases of actions/*), `npm view @playwright/test`.
- Playwright docs CI/caching, GitHub branch protection REST docs (from knowledge; not re-fetched this session): MEDIUM.

## Metadata
Confidence: repo facts HIGH; protection/cache snippets MEDIUM. Valid until ~2026-11-15.
