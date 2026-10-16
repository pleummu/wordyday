# Phase 8: E2E, CI Hardening and Pipeline Docs - Context

**Gathered:** 2026-10-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove the whole game with automated E2E tests, make CI gate every change, and finish the pipeline learning guide (QA-03, QA-04, DOC-03).

Most of the machinery already exists. This phase is mostly audit, landing and hardening, not new test-writing:
- 25 Playwright specs (~200 tests) already run against the production build (`build:e2e`) in `chromium` (Desktop Chrome) and `mobile` (Pixel 7) projects.
- `.github/workflows/ci.yml` already has `check` (lint, format, typecheck, unit, build, check:bundle), `words` (drift) and `e2e` jobs on every PR and push to main.
- `docs/PIPELINE.md` exists (179 lines, written 2026-10-01, with 🔜 markers).

The real gap: Phases 2–7 (190 commits on `phase-02/playable-normal-game`) have never been pushed or run in CI. PR #3 has been open since 2026-10-02. The repo is private on the free plan, so branch protection returns 403.

</domain>

<decisions>
## Implementation Decisions

### Branch protection and landing
- **D-01:** Make the repo public so branch protection is available (free). Before flipping it, scan the git history for secrets (tokens, `.env`, Vercel tokens). The owner flips visibility themselves (human gate).
- **D-02:** Do this first, before landing any phase. Protection is on before Phase 2–7 PRs merge.
- **D-03:** Required status checks on `main`: `check`, `words`, `e2e` (all three existing jobs; matches QA-04).
- **D-04:** Land Phases 2–7 as a **stacked chain of per-phase PRs**. PR #3 shrinks to Phase 2 only, ending at its phase-complete commit (`32e2175` "evolve PROJECT.md after phase completion"). Then one PR each for Phases 3, 4, 5, 6 and 7, in order, each based on the previous one. Use merge commits (no squash, no rebase) so per-plan commits stay on main. Phase 8 work then goes on a fresh `phase-08/...` branch from main.
- **D-05:** Each phase PR must pass CI on its own code and its own specs. If an old phase is red (e.g. an E2E flake or an env difference in CI), fix it on that phase's branch before merging, then carry the fix forward into the next branch.
- Phase-boundary commits found: Phase 2 `32e2175`, Phase 3 `c49138a`, Phase 4 `449ed23`, Phase 7 `01f6bae`. Phases 5 and 6 have no "evolve PROJECT.md" marker, so the planner must find their last commits (e.g. the `docs(05…)`/`docs(06…)` verification commits). Note that ROADMAP lists Phase 6 as 7/8 "In Progress", so check whether it is actually complete before cutting its PR.
- The working tree has uncommitted changes (`.planning/research/FEATURES.md`, `eslint.config.js`, `src/state/gameStore.ts`). Ask the owner about them before cutting branches. Do not discard them.

### E2E suite
- **D-06:** Audit only, plus a traceability map. Map each QA-03 item (win, loss, invalid guess, resume after refresh, switching Boards, Give Up rule, Restore prompt with fake clock, axe) to its existing spec file and test name, and record it in VERIFICATION. Add tests only for real gaps. No duplicate "golden journey" spec.
- **D-07:** Keep all specs running in both the desktop and Pixel 7 projects. No mobile subset tagging.
- **D-08:** Measure the CI e2e job first. Shard (by project, or 2-way) only if it runs over ~10 min. Add Playwright browser caching (keyed on the lockfile Playwright version).
- **D-09:** Keep `retries: 1` with trace on the first retry. Treat any test the report flags as flaky as a bug to fix in this phase.

### Bundle budget
- **D-10:** Extend `scripts/check-bundle.mjs` with a gzip budget: entry JS ≤ 100 KB gz and entry CSS ≤ 10 KB gz. Today's baseline is 86.1 KB JS and 4.4 KB CSS. No per-pool caps.
- **D-11:** Fail CI with a clear message when over budget, and always print a gzip size table for all chunks (entry and the word-4/5/6 pools) so the owner can see sizes in the CI log.

### PIPELINE.md
- **D-12:** Update it to match reality and add a retrospective. Remove all 🔜 markers. Describe the real pipeline: the 3 CI jobs, `build:e2e` mode, check:bundle with its budget, branch protection and required checks, the per-phase PR flow, and Vercel previews. Add a short "what actually happened" section with lessons per phase, drawn from the phase SUMMARY/VERIFICATION files.
- **D-13:** Add 3–5 short "🧪 Try it" boxes next to the matching stage. For example: make the words drift and watch the `words` job fail; break a unit test; push the bundle over budget; open a PR with a red E2E and watch it block the merge.
- **D-14:** Audience is the owner learning, **and** portfolio visitors. Keep the plain-English friendly tone, but polish it enough to link from README.md as a showcase. Adding a link to it from README is in scope.

### Claude's Discretion
- Exact sharding mechanics if needed, the cache key format, and the wording and structure of the size table.
- How the secret scan is done (e.g. `git log -p` grep for common token patterns, or gitleaks via npx if it is quick).
- Exact retrospective format, as long as it stays short.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/ROADMAP.md` §Phase 8 — goal, success criteria, notes (bundle budget, branch protection, page.clock/reducedMotion research flag)
- `.planning/REQUIREMENTS.md` — QA-03, QA-04, DOC-03 text
- `SPEC.md` — game rules the E2E specs assert against (Give Up, Restore state machine, edge cases)

### CI and build
- `.github/workflows/ci.yml` — existing check/words/e2e jobs (actions/*@v7)
- `playwright.config.ts` — projects, webServer (`build:e2e` + preview on 4173), retries, trace
- `scripts/check-bundle.mjs` — entry-chunk and pool-split check to extend with the budget
- `package.json` scripts — build, build:e2e, check:bundle, build:words, test:e2e

### E2E suite
- `e2e/*.spec.ts` — 25 specs. Key ones for QA-03: `game.spec.ts`, `feedback.spec.ts`, `toast.spec.ts`, `persistence.spec.ts`, `boards.spec.ts`, `forfeit.spec.ts`, `restore.spec.ts`, `a11y-themes.spec.ts`
- `e2e/helpers.ts`, `e2e/axe.ts` — `fixAnswers`, `expectNoA11yViolations`, `nonTextContrast`

### Docs
- `docs/PIPELINE.md` — the guide to refresh
- `README.md` — add a link to PIPELINE.md
- `.planning/phases/*/*-SUMMARY.md`, `*-VERIFICATION.md` — source material for the retrospective

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `e2e/helpers.ts` (`fixAnswers`, `fixAnswersWith`, `TEST_ANSWERS`) — deterministic answers via the e2e build mode
- `e2e/axe.ts` (`expectNoA11yViolations`) — waits for dialog animations, then runs axe
- `scripts/check-bundle.mjs` — already parses `dist/index.html` to find the entry and modulepreload files, so the budget can reuse that set

### Established Patterns
- Specs use `test.use({ reducedMotion: 'reduce' })` to skip animation timing.
- The Restore and streak specs already use Playwright clock control for fake dates.
- CI jobs use `node-version-file: .nvmrc` with `cache: npm`, and the Playwright report is uploaded `if: !cancelled()`.

### Integration Points
- Required checks are named by job id: `check`, `words`, `e2e`. If e2e gets sharded, the required check names change, so update protection to match (or add an aggregate `e2e` job).
- Vercel Git integration gives a preview per PR (QA-05, already done).

</code_context>

<specifics>
## Specific Ideas

- Bundle baseline measured 2026-10-16: entry JS 86.1 KB gz (281.9 KB raw), CSS 4.4 KB gz, pools 9.9 / 19.9 / 33.5 KB gz.
- Last CI runs were 2026-10-02, about 1.5 min each, before most specs existed. The real e2e runtime is unknown until the first push.

</specifics>

<deferred>
## Deferred Ideas

- Production domain for OG tags and the share URL (Phase 7 concern). Not in Phase 8 scope.
- Firefox/WebKit Playwright projects. Possible later.

</deferred>

---

*Phase: 08-e2e-ci-hardening-and-pipeline-docs*
*Context gathered: 2026-10-16*
