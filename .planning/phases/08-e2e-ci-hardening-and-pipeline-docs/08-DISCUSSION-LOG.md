# Phase 8: E2E, CI Hardening and Pipeline Docs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-10-16
**Phase:** 08-e2e-ci-hardening-and-pipeline-docs
**Areas discussed:** Branch protection & landing, E2E suite shape & CI time, Bundle budget, PIPELINE.md refresh

---

## Branch protection & landing

| Option | Description | Selected |
|--------|-------------|----------|
| Make repo public | Free protection; portfolio project | ✓ |
| Stay private, no protection | Checks visible, merge discipline manual | |
| Upgrade to GitHub Pro | Private plus protection, costs money | |

| Option | Description | Selected |
|--------|-------------|----------|
| Push to PR #3, fix CI, merge | One big PR for Phases 2–7 | |
| Split into per-phase PRs | Cleaner history, several CI rounds | ✓ |
| Phase 8 on top, one PR at end | Late CI feedback | |

| Option | Description | Selected |
|--------|-------------|----------|
| check + words + e2e | All three jobs required | ✓ |
| check + e2e only | Word drift advisory | |

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked chain, merge commits | PR #3 = Phase 2, then 3–7 in order | ✓ |
| Squash-merge each phase | One commit per phase | |

| Option | Description | Selected |
|--------|-------------|----------|
| Public first, before landing | Secret scan, flip, protection on | ✓ |
| After all phases land | Land unprotected | |

| Option | Description | Selected |
|--------|-------------|----------|
| Each PR passes its own specs | Fix red on that phase branch | ✓ |
| Only final tip must be green | Main red for a while | |

## E2E suite shape & CI time

| Option | Description | Selected |
|--------|-------------|----------|
| Audit + traceability map | Map QA-03 items to specs, fill real gaps | ✓ |
| Audit + golden-journey spec | Showcase spec, duplicates coverage | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both projects for all | Current setup | ✓ |
| Mobile tagged subset | Halves time, tagging upkeep | |

| Option | Description | Selected |
|--------|-------------|----------|
| Measure first, shard if >10 min | Plus browser cache | ✓ |
| Shard now (2 ways) | More workflow complexity | |
| No tuning | Raise timeout if needed | |

| Option | Description | Selected |
|--------|-------------|----------|
| retries: 1, flaky = bug | Fix flakes this phase | ✓ |
| retries: 0 | Strict | |

## Bundle budget

| Option | Description | Selected |
|--------|-------------|----------|
| Entry JS ≤ 100 KB gz (+ CSS ≤ 10 KB) | ~15% headroom | ✓ |
| Tight ≤ 90 KB gz | ~5% headroom | |
| Entry + per-pool caps | Gates word-list growth too | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fail + print size table | Clear failure, sizes always visible | ✓ |
| Warn only | Never fails | |

## PIPELINE.md refresh

| Option | Description | Selected |
|--------|-------------|----------|
| Update to reality + retrospective | Remove 🔜, add lessons per phase | ✓ |
| Update to reality only | No retrospective | |
| Full rewrite as tutorial | Longest | |

| Option | Description | Selected |
|--------|-------------|----------|
| A few short "try it" boxes | 3–5 exercises | ✓ |
| No exercises | | |

| Option | Description | Selected |
|--------|-------------|----------|
| You, learning | README stays public face | |
| Also portfolio visitors | Polished, linked from README | ✓ |

## Claude's Discretion

- Sharding mechanics, cache key, size table format, secret-scan method, retrospective format.

## Deferred Ideas

- Production domain for OG/share URL (Phase 7 concern).
- Firefox/WebKit Playwright projects.
