---
phase: 1
slug: foundation-spec-and-ci-skeleton
status: draft
nyquist_compliant: false
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

To be filled in by the planner and executor once task IDs exist. Requirement → check mapping:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| QA-01 | TypeScript is 6.0.x | script | `node -e "process.exit(require('typescript/package.json').version.startsWith('6.0.')?0:1)"` | ❌ W0 | ⬜ pending |
| QA-01 | ESLint flat config, Prettier, Node 24, no oxlint | smoke | `npm run lint && npm run format:check && test "$(cat .nvmrc)" = 24 && test -f eslint.config.js && test ! -f .oxlintrc.json` | ❌ W0 | ⬜ pending |
| QA-01 | Unit test infra is real | unit | `npm test` (pure test + component test) | ❌ W0 | ⬜ pending |
| QA-01 | Fresh clone works | integration | in a fresh clone: `npm ci` + full suite command | ❌ W0 | ⬜ pending |
| QA-05 | PR triggers CI `check` job | CI | `gh pr checks <n>` shows `check` passing | ❌ W0 | ⬜ pending |
| DOC-01 | SPEC has decisions, state machine, edge cases | doc grep | `grep -q "R-RESTORE-" SPEC.md && [ $(grep -oE "EC-[0-9]{2}" SPEC.md \| sort -u \| wc -l) -ge 40 ]` | ❌ W0 | ⬜ pending |
| DOC-02 | GLOSSARY has all twelve terms | doc grep | loop over the 12 terms, each must match a heading/bold entry in GLOSSARY.md | ❌ W0 | ⬜ pending |

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
