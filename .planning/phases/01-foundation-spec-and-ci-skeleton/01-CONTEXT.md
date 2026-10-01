# Phase 1: Foundation, Spec and CI Skeleton - Context

**Gathered:** 2026-10-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Settle the written spec (SPEC.md, GLOSSARY.md) and stand up a working pipeline: scaffold (React + Vite + TS 6.0.x, Node 24), ESLint flat config, Prettier, Vitest, a baseline GitHub Actions workflow (lint, format check, typecheck, unit, build) and Vercel Git integration (PR previews, production from main) serving a placeholder app. No gameplay, word data or E2E in this phase.

Requirements: QA-01, QA-05, DOC-01, DOC-02.

</domain>

<decisions>
## Implementation Decisions

The owner skipped the interactive discussion ("nevermind discussing, start phase 1"). Everything below is Claude's default, chosen from plan.txt, PROJECT.md and the research. The owner can override any of it when reviewing the plan or SPEC.md.

### Restore state machine edge cases (to be written into SPEC.md)
- **D-01:** The missed-day check is idempotent: running it twice for the same `today` gives the same state (no double reset, no second prompt beyond the pending one).
- **D-02:** A pending Restore prompt is blocking (a modal). The player answers it before playing. The pending state is persisted, so a refresh shows it again (matches plan.txt).
- **D-03:** The monthly refill is applied lazily before any eligibility check: if `restores.month` is not the current `YYYY-MM`, `used` resets to 0 first. A missed-day check on the 1st sees 3 Restores.
- **D-04:** A game counts for the Day Streak on the local date it finishes, not the date it started. Midnight passing mid-game triggers the date-change check. That check must not punish a player who was active yesterday.
- **D-05:** Clock moved backwards (today < lastActiveDate) means missed = 0, and `lastActiveDate` is never moved earlier. It only ever moves forward.
- **D-06:** Day Streak farming by giving up is limited by the existing rule: Give Up and mid-game New game are allowed only when exactly 2 tries are left (per ROADMAP/REQUIREMENTS). A forfeited game still counts as a finished game for the Day Streak (owner decision 2026-10-01).
- **D-07:** SPEC.md contains the Restore logic as an explicit state machine (states, events, transitions) plus an edge-case table (input → expected result) that Phase 5 tests can turn directly into table-driven tests.

### Spec docs shape
- **D-08:** `SPEC.md` and `GLOSSARY.md` live at the repo root (matches plan.txt's file list and the global "GLOSSARY.md at repo root" convention).
- **D-09:** SPEC.md supersedes plan.txt as the source of truth for game rules. plan.txt is kept and committed as the historical Q&A record, and SPEC.md says so at the top.
- **D-10:** SPEC.md rules get stable IDs (e.g. `R-SCORE-1`, `R-RESTORE-3`) so tests and plans can cite them. Prose explains *why* where useful (the owner is learning).
- **D-11:** GLOSSARY.md defines exactly the twelve terms (Board, Mode, Normal, Wordubado, Answer Pool, Guess Pool, Win Streak, Day Streak, Missed Day, Restore, Forfeit, Give Up). Each entry is a short definition plus an "avoid saying" note where a synonym could cause confusion (e.g. "daily streak").
- **D-12:** SPEC.md also records the resolved research decisions: blocklist on answers only, plurals and inflections excluded from Normal answers but valid as guesses, finished Board shows grid + Play again, two-tab sync via the `storage` event.

### Git and deploy flow
- **D-13:** GitHub remote is `pleummu/wordyday`. Work happens on branches with PRs into `main`, so every phase produces a PR that has a CI run and a Vercel preview (that's the point of the pipeline).
- **D-14:** Connecting the Vercel project to the GitHub repo is a **human checkpoint**: the owner does it in the Vercel dashboard, and the plan gives step-by-step instructions. No `vercel deploy` from Actions and no Vercel secrets in GitHub.
- **D-15:** Branch protection (required checks) is deferred to Phase 8, as the roadmap says.
- **D-16:** The product name shown on the site is **"Unlimited Wordle"**. "wordyday" is only the repo name.

### Placeholder app
- **D-17:** The preview shows a minimal placeholder: the "Unlimited Wordle" title and a one-line "coming soon" note, styled with a first small set of CSS custom properties (soft, airy light palette, rounded shapes). This avoids shipping the default Vite starter, but no real design system work happens yet.
- **D-18:** It includes one trivial Vitest unit test (and a component smoke test if cheap) so the `npm test` step in CI runs something real.

### Claude's Discretion
- Exact npm script names (`lint`, `format:check`, `typecheck`, `test`, `build`) and the folder skeleton (`src/logic`, `src/state`, `src/components`, `src/styles`) follow the research ARCHITECTURE.md.
- Whether to add shared types / `BOARD_CONFIG` (4/5/6 → 5/6/7) now or in Phase 2. Adding it now is fine if it's tiny and tested.
- Specific GitHub Actions versions (use the current majors at execution time).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Game rules (source for SPEC.md / GLOSSARY.md)
- `plan.txt`: the settled Q&A decisions (modes, Boards, streaks, Restore, stats, result screen, share)
- `.planning/PROJECT.md`: core value, constraints, key decisions, out of scope
- `.planning/REQUIREMENTS.md`: all requirement IDs (DOC-01, DOC-02, QA-01, QA-05 for this phase; others give the rules SPEC.md must cover)
- `.planning/research/SUMMARY.md` §"Gaps in the Restore state machine", §"Resolved Disagreements", §"Owner Decisions (2026-10-01)"
- `.planning/research/PITFALLS.md`: date/DST, storage and Restore pitfalls that SPEC.md should state as rules

### Tooling and pipeline
- `CLAUDE.md` §Technology Stack: pinned versions, TS 6.0.x trap, CI job layout
- `.planning/research/STACK.md`: version and peer-range evidence
- `.planning/research/ARCHITECTURE.md`: folder layout and module boundaries
- `docs/PIPELINE.md`: existing learning guide; keep its 🔜 markers accurate if Phase 1 makes something real

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None. Greenfield: the repo has only `.planning/`, `docs/PIPELINE.md`, `CLAUDE.md` and `plan.txt` (staged, not yet committed).

### Established Patterns
- None yet. Phase 1 sets them (lint/format config, folder layout, test placement).

### Integration Points
- GitHub remote `origin` → `https://github.com/pleummu/wordyday.git`.
- Vercel: not connected yet (human checkpoint, D-14).

</code_context>

<specifics>
## Specific Ideas

- Check right after scaffolding whether create-vite installed TypeScript 7. If it did, pin `~6.0.3` and confirm typescript-eslint's peer range (research flag).
- `.nvmrc` = 24, `engines` in package.json, `actions/setup-node` with `node-version-file: .nvmrc` and npm cache.

</specifics>

<deferred>
## Deferred Ideas

None. The discussion was skipped at the owner's request.

</deferred>

---

*Phase: 01-foundation-spec-and-ci-skeleton*
*Context gathered: 2026-10-01*
