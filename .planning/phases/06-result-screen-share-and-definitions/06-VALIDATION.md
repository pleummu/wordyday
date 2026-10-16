---
phase: 6
slug: result-screen-share-and-definitions
status: complete
nyquist_compliant: true
wave_0_complete: true
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
| 06-01 T1-2 | 06-01 | 1 | RSLT-01 | — | N/A | component | `npx vitest run src/components/ResultModal.test.tsx` | ✅ | ✅ green |
| 06-01 | 06-01 | 1 | RSLT-01 | T-06-01 | Answer not exposed before game ends | unit | `npx vitest run src/state/gameStore.test.ts -t result` | ✅ | ✅ green |
| 06-02 | 06-02 | 2 | RSLT-01 | T-06-04 | N/A | component | `npx vitest run src/components/Banner.test.tsx` | ✅ | ✅ green |
| 06-02, 06-08 | 06-02/06-08 | 2/8 | RSLT-01 | T-06-05 | N/A | e2e | `npx playwright test e2e/result.spec.ts e2e/layout.spec.ts` | ✅ | ✅ green |
| 06-06 | 06-06 | 6 | RSLT-02 | T-06-17 | Defs not in entry bundle | script/unit | `npx vitest run scripts/words/lib.test.mjs scripts/words/pools.test.mjs src/data/wordData.test.ts && npm run build && npm run check:bundle` | ✅ | ✅ green |
| 06-05 | 06-05 | 5 | RSLT-02 | T-06-12 | XSS via API text / outage: shape guard, React text only, 5 s timeout | unit | `npx vitest run src/logic/definition.test.ts` | ✅ | ✅ green |
| 06-05 | 06-05 | 5 | RSLT-02 | T-06-13 | N/A | component | `npx vitest run src/components/ResultModal.test.tsx src/components/DefinitionPanel.test.tsx` | ✅ | ✅ green |
| 06-05, 06-06 | 06-05/06-06 | 5/6 | RSLT-02 | T-06-18 | No network call for curated slang | e2e | `npx playwright test e2e/definition.spec.ts` | ✅ | ✅ green |
| 06-01 | 06-01 | 1 | RSLT-03 | T-06-02 | Share text built from own state; no letters in grid | unit | `npx vitest run src/logic/share.test.ts src/logic/timing.test.ts` | ✅ | ✅ green |
| 06-03 | 06-03 | 3 | RSLT-04 | T-06-06 | N/A | unit/component | `npx vitest run src/logic/share.test.ts src/components/ResultModal.test.tsx src/components/Modal.test.tsx` | ✅ | ✅ green |
| 06-03, 06-04 | 06-03/06-04 | 3/4 | RSLT-04 | T-06-10 | N/A | e2e | `npx playwright test e2e/share.spec.ts e2e/toast.spec.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/logic/share.test.ts` — stubs for RSLT-03, RSLT-04
- [x] `src/logic/definition.test.ts` — stubs for RSLT-02
- [x] `src/components/ResultModal.test.tsx` — stubs for RSLT-01, RSLT-02, RSLT-04
- [x] `e2e/result.spec.ts` — stubs for RSLT-01..04
- [x] Extend `e2e/layout.spec.ts`, `src/state/gameStore.test.ts`, `scripts/words/lib.test.mjs`, `src/data/wordData.test.ts`, `Banner.test.tsx`, `App.test.tsx`, `Modal.test.tsx` (textarea Tab trap), `Toast.test.tsx`
- [x] No new framework install

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real iOS Safari share sheet and clipboard fallback | RSLT-04 | No iOS device in CI | On an iPhone, finish a game, tap Share: share sheet opens with the grid + URL; cancel does nothing; on desktop Safari, Share copies and shows "Copied" |
| dictionaryapi.dev reachable + CORS-open from the deployed origin | RSLT-02 | Service returned 522 during research; E2E stubs the API | In a real browser on the preview deploy, finish a Normal game, click "Show definition": a definition or "Definition unavailable" appears within 5 s, no console CORS error |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** automated gate green; manual-only checks pending owner sign-off (06-07 Task 2)
