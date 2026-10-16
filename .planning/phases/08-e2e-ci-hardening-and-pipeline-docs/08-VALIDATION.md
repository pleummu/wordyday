---
phase: 8
slug: e2e-ci-hardening-and-pipeline-docs
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-16
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.3 (unit/component) + Playwright 1.63.0 (E2E, projects `chromium` + `mobile`) |
| **Config file** | `vite.config.*` (vitest), `playwright.config.ts` |
| **Quick run command** | `npm run typecheck && npm test` |
| **Full suite command** | `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build && npm run check:bundle && npx playwright test` |
| **Estimated runtime** | ~60 s quick; E2E ~5.5 min on CI (437 passed, 15 skipped, 0 flaky) |

---

## Sampling Rate

- **After every task commit:** Run the quick command (plus `npm run build && npm run check:bundle` when the bundle script changes)
- **After every plan wave:** Run the full suite (E2E on CI via the PR)
- **Before `/gsd:verify-work`:** All three required checks (`check`, `words`, `e2e`) green on every landing PR; protection read-back matches
- **Max feedback latency:** 120 seconds locally

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| QA-03 | Eight QA-03 items pass in both projects | e2e | `npx playwright test game feedback persistence boards forfeit restore a11y-themes` | ✅ | ✅ green (CI run 38930577200) |
| QA-03 | Traceability table recorded in VERIFICATION | doc | `npx playwright test --list` (names exist) | ✅ | ✅ green (22 lines, both projects) |
| QA-04 | CI runs 3 jobs green on a PR | CI | `gh pr checks <n>` | ✅ | ✅ green (PRs #3-#9) |
| QA-04 | Required checks set on main | smoke | `gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks --jq .contexts` = check, words, e2e | ✅ | ✅ green |
| QA-04 | Bundle budget fails when over, always prints table | script | `npm run build && npm run check:bundle`; over-budget exit 1 + table: `npx vitest run scripts/check-bundle.test.mjs` | ✅ | ✅ green |
| DOC-03 | No stale markers; README links guide | grep | `! grep -n "🔜" docs/PIPELINE.md && grep -n PIPELINE.md README.md && npx prettier --check docs README.md` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Budget code + size table in `scripts/check-bundle.mjs`, plus a deliberate-overage check
- [x] Owner decision on the uncommitted working-tree edits before cutting branches
- [x] Repo made public (human) before the branch-protection call

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Repo visibility flip | QA-04 | Owner-only GitHub setting (D-01) | GitHub → Settings → Danger Zone → Change visibility → Public |
| Failing check visibly blocks merge | QA-04 | Needs a real PR in the GitHub UI | Open a PR with a red check; confirm the merge button is blocked |
| PIPELINE.md reads well for owner and visitors | DOC-03 | Subjective tone | Owner reads docs/PIPELINE.md end to end |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-16

---

## Validation Audit 2026-10-16

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

Gap: QA-04 bundle budget over-limit path had only a one-off manual run. Resolved by `scripts/check-bundle.test.mjs` (runs the real script on a temp dist: oversized entry exits 1 with message and table; small entry exits 0 with table). CSS budget path is not separately tested.
