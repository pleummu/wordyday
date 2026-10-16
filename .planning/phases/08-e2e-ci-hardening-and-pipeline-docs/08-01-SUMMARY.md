---
phase: 08-e2e-ci-hardening-and-pipeline-docs
plan: 01
subsystem: infra
tags: [github, branch-protection, secret-scan, ci]
requires: []
provides:
  - "Clean secret scan of all git refs"
  - "pleummu/wordyday is public"
  - "main protected by required checks check, words, e2e"
affects: [08-02]
key-files:
  created: []
  modified: []
decisions:
  - "strict false on required checks so the stacked PR chain does not need rebasing after each merge"
  - "Author email akrananb@gmail.com accepted as public (owner informed before the flip)"
metrics:
  completed: 2026-10-16
requirements-completed: [QA-04]
---

# Phase 8 Plan 01: Public flip and branch protection Summary

Full-history secret scan came back clean, the owner made pleummu/wordyday public, and main is now protected by the required checks check, words and e2e (strict false, force pushes and deletion off).

## Task 1: Secret scan of full git history (all refs), run 2026-10-16

### (a) Token regex over `git log --all -p`
Pattern: ghp_, gho_, github_pat_, sk-[A-Za-z0-9]{20}, AKIA[0-9A-Z]{16}, BEGIN (RSA|OPENSSH|EC|PRIVATE), VERCEL_TOKEN, vercel_[A-Za-z0-9]{20}, xox[bp]-

| Commit | File | Hit | Verdict |
|---|---|---|---|
| ead2172 docs: add project research | .planning/research/STACK.md | prose naming `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` as secrets NOT to be used | Not a secret (variable names only, no value) |
| 3856703 docs(phase-08): add research | 08-RESEARCH.md | the scan regex itself and the note on it | Not a secret (regex text) |
| 061f513 docs(08): create phase plan | 08-01-PLAN.md | the scan regex itself | Not a secret (regex text) |

### (b) Added files with sensitive names
Pattern: `(^|/)\.env|\.pem$|\.key$|\.p12$|secret|\.vercel/|id_rsa|credentials`. Hits: none.

### (c) Tracked files
`git ls-files | grep -iE "(^|/)\.env|\.vercel/"`: empty, count = 0.

### Author emails (`git log --all --format=%ae | sort -u`)
- akrananb@gmail.com (becomes public with the repo)
- 168964871+pleummu@users.noreply.github.com

### Verdict
No secrets found.

## Task 2: Owner makes the repo public

- The owner was shown the Task 1 verdict and was told, before the flip, that author email akrananb@gmail.com becomes public with the repo (history rewrite out of scope).
- Owner reply: "public".
- `gh repo view pleummu/wordyday --json visibility --jq .visibility` printed `PUBLIC` (checked by the orchestrator and re-checked at the start of Task 3).

## Task 3: Branch protection on main

Payload (kept in the session scratchpad, not in the repo): required_status_checks `{strict: false, contexts: [check, words, e2e]}`, enforce_admins false, required_pull_request_reviews null, restrictions null, allow_force_pushes false, allow_deletions false. Applied with `gh api -X PUT repos/pleummu/wordyday/branches/main/protection --input <file>`; accepted on the first try, no fields adjusted.

Read-back (`.../protection/required_status_checks`):

```json
{"strict":false,"contexts":["check","words","e2e"],"checks":[{"context":"check","app_id":null},{"context":"words","app_id":null},{"context":"e2e","app_id":null}]}
```

Acceptance checks:
- visibility: `PUBLIC`
- `--jq '[.strict, (.contexts|sort|join(","))]|@csv'`: `false,"check,e2e,words"`
- `.allow_force_pushes.enabled`: `false`

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
