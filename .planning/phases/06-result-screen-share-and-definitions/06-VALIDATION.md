---
phase: 6
slug: result-screen-share-and-definitions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-12
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.3 (node env for `src/logic/**`, jsdom for components; `stubDialog()` in `src/test/stubDialog.ts`) + Playwright 1.63 (chromium + Pixel 7 "mobile" projects) |
| **Config file** | vite config (vitest) and `playwright.config.ts` |
| **Quick run command** | `npx vitest run src/logic/share.test.ts src/logic/definition.test.ts src/components/ResultModal.test.tsx src/components/Banner.test.tsx` |
| **Full suite command** | `npm test && npm run build && npm run check:bundle && npx playwright test` |
| **Estimated runtime** | ~120 seconds (full), ~10 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** Run the quick run command for touched files plus `npm run typecheck`
- **After every plan wave:** Run `npm test && npm run lint && npm run build && npm run check:bundle`
- **Before `/gsd:verify-work`:** Full suite must be green (Playwright, both projects)
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | RSLT-01 | — | N/A | component | `npx vitest run src/components/ResultModal.test.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RSLT-01 | — | Answer not exposed before game ends | unit | `npx vitest run src/state/gameStore.test.ts -t result` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | RSLT-01 | — | N/A | component | `npx vitest run src/components/Banner.test.tsx` | ✅ rewrite | ⬜ pending |
| TBD | TBD | TBD | RSLT-01 | — | N/A | e2e | `npx playwright test e2e/result.spec.ts e2e/layout.spec.ts` | ❌ W0 / ✅ extend | ⬜ pending |
| TBD | TBD | TBD | RSLT-02 | — | Defs not in entry bundle | script/unit | `npx vitest run scripts/words/lib.test.mjs src/data/wordData.test.ts && npm run build && npm run check:bundle` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | RSLT-02 | XSS via API text / outage | Shape guard, React text only, 5 s timeout | unit | `npx vitest run src/logic/definition.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RSLT-02 | — | N/A | component | `npx vitest run src/components/ResultModal.test.tsx -t definition` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RSLT-02 | — | No network call for curated slang | e2e | `npx playwright test e2e/result.spec.ts -g definition` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RSLT-03 | Share text injection | Built from own state; no letters in grid | unit | `npx vitest run src/logic/share.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RSLT-04 | — | N/A | unit/component | `npx vitest run src/logic/share.test.ts src/components/ResultModal.test.tsx -t share` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RSLT-04 | — | N/A | e2e | `npx playwright test e2e/result.spec.ts -g share` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/logic/share.test.ts` — stubs for RSLT-03, RSLT-04
- [ ] `src/logic/definition.test.ts` — stubs for RSLT-02
- [ ] `src/components/ResultModal.test.tsx` — stubs for RSLT-01, RSLT-02, RSLT-04
- [ ] `e2e/result.spec.ts` — stubs for RSLT-01..04
- [ ] Extend `e2e/layout.spec.ts`, `src/state/gameStore.test.ts`, `scripts/words/lib.test.mjs`, `src/data/wordData.test.ts`, `Banner.test.tsx`, `App.test.tsx`, `Modal.test.tsx` (textarea Tab trap), `Toast.test.tsx`
- [ ] No new framework install

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real iOS Safari share sheet and clipboard fallback | RSLT-04 | No iOS device in CI | On an iPhone, finish a game, tap Share: share sheet opens with the grid + URL; cancel does nothing; on desktop Safari, Share copies and shows "Copied" |
| dictionaryapi.dev reachable + CORS-open from the deployed origin | RSLT-02 | Service returned 522 during research; E2E stubs the API | In a real browser on the preview deploy, finish a Normal game, click "Show definition": a definition or "Definition unavailable" appears within 5 s, no console CORS error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
