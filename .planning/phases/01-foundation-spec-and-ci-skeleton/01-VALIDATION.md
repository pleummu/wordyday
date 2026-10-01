---
phase: 1
slug: foundation-spec-and-ci-skeleton
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-01
---

# Phase 1: Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.3 (+ jsdom 30.1.1, Testing Library 16.3.3 for one component test) |
| **Config file** | `vite.config.ts` `test` block (none yet; Wave 0 installs) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`, plus lint/typecheck for tooling tasks or the doc grep checks for doc tasks
- **After every plan wave:** Run the full suite command
- **Before `/gsd:verify-work`:** Full suite green locally, CI green on the PR, Vercel preview + production confirmed manually
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|----------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01-01 | 1 | QA-01 | Scaffold + toolchain; TS 6.0.x; ESLint 10; no oxlint | smoke | `npm run lint && npm run format:check && npm run typecheck && npm run build && node -e "process.exit(require('typescript/package.json').version.startsWith('6.0.')?0:1)"` | ❌ W0 | ⬜ pending |
| 01-01-T2 | 01-01 | 1 | QA-01 | Placeholder page + BOARD_CONFIG, test-first (D-16..D-18) | unit + component | `npm test && npm run lint && npm run format:check && npm run typecheck && npm run build` | ❌ W0 | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | DOC-01 | SPEC sections 0-7, rule IDs, plan.txt supersede note | doc grep | `head -8 SPEC.md \| grep -q plan.txt` + R-<AREA>-1 loop + `daily streak` count = 0 (see plan verify) | ❌ W0 | ⬜ pending |
| 01-02-T2 | 01-02 | 2 | DOC-01 | Restore state machine, EC-01..EC-44, sections 9-13 | doc grep | EC-01..44 loop, `R-RESTORE-` unique >= 13, states/events, verbatim prompt, `^## ` >= 14 (see plan verify) | ❌ W0 | ⬜ pending |
| 01-03-T1 | 01-03 | 3 | DOC-02 | GLOSSARY has exactly the twelve terms | doc grep | 12-term `grep -qx "### $t"` loop and `grep -c '^### '` = 12 | ❌ W0 | ⬜ pending |
| 01-03-T2 | 01-03 | 3 | DOC-01, DOC-02 | SPEC/GLOSSARY cross-link and shared vocabulary | doc grep | rule-ID existence loop, 12 terms in SPEC, `grep -q GLOSSARY.md SPEC.md` | ❌ W0 | ⬜ pending |
| 01-04-T1 | 01-04 | 4 | QA-01 | CI workflow `check` job; PIPELINE.md commands | config grep | ci.yml step loop, `contents: read`, no `pull_request_target`/vercel, `npm run format:check` | ❌ W0 | ⬜ pending |
| 01-04-T2 | 01-04 | 4 | QA-01, QA-05 | PR #1 open, `check` green; fresh clone passes | CI | `gh pr view phase-01/foundation --json state,statusCheckRollup ...` = `OPEN SUCCESS` | ❌ W0 | ⬜ pending |
| 01-04-T3 | 01-04 | 4 | DOC-01, DOC-02 | Owner approves SPEC/GLOSSARY (checkpoint) | CI + manual | `gh pr checks phase-01/foundation \| grep -E "^check\s" \| grep -q pass` | ❌ W0 | ⬜ pending |
| 01-05-T1 | 01-05 | 5 | QA-05 | PR #1 merged; main CI green | CI | `gh pr view ... MERGED` and latest main CI run = success | ❌ W0 | ⬜ pending |
| 01-05-T2 | 01-05 | 5 | QA-05 | Owner connects Vercel (checkpoint) | smoke + manual | `curl -fsSL "$PRODUCTION_URL" \| grep -c "<title>Unlimited Wordle</title>"` | ❌ W0 | ⬜ pending |
| 01-05-T3 | 01-05 | 5 | QA-05 | Proof PR #2: `check` + Vercel preview pass | CI | `gh pr checks phase-01/deploy-proof` shows `check` and Vercel pass | ❌ W0 | ⬜ pending |
| 01-06-T1 | 01-06 | 6 | QA-05 | Owner sees placeholder at preview URL (checkpoint) | CI + manual | `gh pr checks phase-01/deploy-proof \| grep -i vercel \| grep -q pass` | ❌ W0 | ⬜ pending |
| 01-06-T2 | 01-06 | 6 | QA-05 | Merge PR #2; production deploy for merge SHA | CI + smoke | `gh pr view ... MERGED`, main CI success, deployment status success, curl title | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Vitest + jsdom + Testing Library install, `vite.config.ts` `test` block
- [ ] One pure unit test and `src/App.test.tsx` component smoke test
- [ ] Doc-check grep commands (inline in plan verify steps)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel preview on a PR | QA-05 | External service dashboard (owner connects Vercel) | Open the PR, find the Vercel bot comment, open the URL, see the "Unlimited Wordle" placeholder |
| Production deploy from main | QA-05 | External service | Merge the PR, open the production URL, see the placeholder at the latest commit |
| SPEC rules read correctly | DOC-01 | Semantic review | Owner checks the Restore section against the plan.txt example (Mon 1 → Sat 6 offered, Sun 7 reset) and the four flagged open-question defaults |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [ ] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
