---
phase: 08
slug: e2e-ci-hardening-and-pipeline-docs
status: verified
threats_open: 0
asvs_level: 1
created: 2026-10-16
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| private repo -> public internet | every commit, file and author email on every ref is public | source, history, author email |
| PR -> main -> Vercel | merge to main deploys the public site | code |
| local repo -> origin | pushes and one force push rewrite remote refs | git refs |
| CI cache -> e2e job | restored browser binaries run in the job | binaries |
| repo docs -> public readers | docs are a portfolio page | prose |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation / Evidence | Status |
|-----------|----------|-----------|-------------|-----------------------|--------|
| T-08-01 | Info disclosure | git history | mitigate | Full-history scan recorded in 08-01-SUMMARY (Task 1): file-name regex hits none, content hits all reviewed as non-secrets (variable names, regex text) | closed |
| T-08-02 | Info disclosure | author email | accept | See Accepted Risks | closed |
| T-08-03 | Tampering | main branch | mitigate | gh API read-back: required contexts check, words, e2e; allow_force_pushes false; allow_deletions false | closed |
| T-08-04 | DoS | required contexts | mitigate | Read-back contexts `check`,`words`,`e2e` equal ci.yml job ids (.github/workflows/ci.yml jobs check/words/e2e); PR #9 is evaluated against them | closed |
| T-08-05 | EoP | fork PRs | accept | See Accepted Risks | closed |
| T-08-06 | Tampering/data loss | force push phase-02 | mitigate | 08-02-SUMMARY: owner confirmed ("Force-push to 32e2175"), phase-03 pushed at c49138a first, `--force-with-lease=phase-02/...:c49138a` used. Remote refs now phase-03=c49138a, phase-02=32e2175, matching merge parents | closed |
| T-08-07 | Data loss | uncommitted edits | mitigate | 08-02-SUMMARY: owner chose "Restore all" explicitly (Q1); tree clean | closed |
| T-08-08 | Integrity | weakening tests | mitigate | `git diff 08bc356 HEAD -- e2e playwright.config.ts` is empty (no .skip/.only/retries change in phase 8). Existing `test.skip(project)` lines and `retries: CI ? 1 : 0` date from phases 02/06/07; `forbidOnly: CI` set. 08-02-SUMMARY: no fix commits | closed |
| T-08-09 | Tampering | history rewrite | mitigate | 08-02-SUMMARY: no fix commits, nothing to carry; no rebase/fixup/squash commits in `git log --all`; only one lease-guarded force push (T-08-06) | closed |
| T-08-10 | Tampering | check-bypassing merges | mitigate | 08-03-SUMMARY: merged only when CLEAN, no --admin; PR #5 waited for required checks; 8 merge commits on main, PRs 1-8 MERGED | closed |
| T-08-11 | DoS | base branch deleted | mitigate | `git ls-remote origin` shows all phase-01..08 branches still present; PRs 1-8 all MERGED into main (none auto-closed) | closed |
| T-08-12 | Tampering | squash/rebase | mitigate | `git log origin/main --first-parent --merges` shows 8 merge commits with two parents (#1-#8); each PR mergeCommit set | closed |
| T-08-13 | Tampering | Playwright cache | accept | See Accepted Risks | closed |
| T-08-14 | Tampering | third-party actions | mitigate | ci.yml uses only actions/checkout@v7, setup-node@v7, cache@v6, upload-artifact@v7 | closed |
| T-08-15 | DoS | e2e job renamed | mitigate | ci.yml job id `e2e` unchanged, unsharded; required context `e2e` matches | closed |
| T-08-16 | Repudiation | budget silently passing | mitigate | 08-04-SUMMARY: js budget 50 forced exit 1 with FAILED message, reverted to 100; scripts/check-bundle.mjs calls process.exit(1) on failure and `check:bundle` is a step in job `check` | closed |
| T-08-17 | Info disclosure | docs | mitigate | grep for email addresses and token patterns (ghp_, gho_, github_pat_, sk-, AKIA) over docs/PIPELINE.md, README.md, 08-VERIFICATION.md: no matches | closed |
| T-08-18 | Repudiation | traceability | mitigate | 08-VERIFICATION.md QA-03 section states it was checked against `npx playwright test --list` in chromium and mobile (2026-10-16) | closed |

*Status: open · closed*

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-08-01 | T-08-02 | Author email becomes public with the repo. Owner was told before the flip (08-01-SUMMARY) and replied "public". History rewrite out of scope. | Owner (pleum) | 2026-10-16 |
| AR-08-02 | T-08-05 | Fork PRs on a public repo. Verified ci.yml has top-level `permissions: contents: read` and references no `secrets.*`. | Owner (plan) | 2026-10-16 |
| AR-08-03 | T-08-13 | Playwright browser cache is repo-scoped, key `pw-${{ runner.os }}-<exact Playwright version>` (ci.yml). | Owner (plan) | 2026-10-16 |

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-16 | 18 | 18 | 0 | gsd-security-auditor |

Unregistered flags: none found in the SUMMARY files.

## Sign-Off

- [x] All threats have a disposition
- [x] Accepted risks documented
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-16
