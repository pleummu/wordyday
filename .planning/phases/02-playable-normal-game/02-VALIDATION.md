---
phase: 2
slug: playable-normal-game
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-01
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.3 (node env for logic, jsdom for components); Playwright 1.63.0 for E2E |
| **Config file** | `vite.config.ts` (widen `test.include` for `scripts/`); `playwright.config.ts` (new, Wave 0) |
| **Quick run command** | `npx vitest run src/logic scripts` |
| **Full suite command** | `npm run lint && npm run typecheck && npm test && npm run build && npm run check:bundle && npx playwright test` |
| **Estimated runtime** | ~90 seconds (unit ~10 s, E2E ~60-80 s) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched dir>`
- **After every plan wave:** Run full unit suite + `npm run build`
- **Before `/gsd:verify-work`:** Full suite (including E2E) must be green and owner review (D-07) complete
- **Max feedback latency:** 15 seconds for unit sampling

---

## Per-Task Verification Map

Filled in by the planner/executor per task. Requirement-level map from RESEARCH.md:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| PLAY-01 | grid dims 5/6/7 rows for 4/5/6 letters | unit+component | `npx vitest run src/components/Grid.test.tsx` | ❌ W0 | ⬜ pending |
| PLAY-02 | repeated-letter scoring (ABBEY/BABES, SPEED/ERASE, triples) | unit | `npx vitest run src/logic/score.test.ts` | ❌ W0 | ⬜ pending |
| PLAY-03 | short/invalid rejected, no attempt used | store unit + e2e | `npx vitest run src/store/gameStore.test.ts`; `npx playwright test -g invalid` | ❌ W0 | ⬜ pending |
| PLAY-04 | key best-state merge; physical keyboard | unit + component | `npx vitest run src/logic/keys.test.ts src/components/Keyboard.test.tsx` | ❌ W0 | ⬜ pending |
| PLAY-05 | input blocked during reveal; keys update after reveal | store unit (fake timers) | `npx vitest run src/store/gameStore.test.ts` | ❌ W0 | ⬜ pending |
| PLAY-06 | answer shown on loss | e2e | `npx playwright test -g lose` | ❌ W0 | ⬜ pending |
| WORD-02 | stem rules; blocklist/exclude honoured | unit | `npx vitest run scripts/words` | ❌ W0 | ⬜ pending |
| WORD-05 | pickAnswer uniform/injectable/repeats allowed | unit | `npx vitest run src/logic/pickAnswer.test.ts` | ❌ W0 | ⬜ pending |
| WORD-07 | build invariants; no drift | unit + CI | `npx vitest run src/data/words.test.ts`; `npm run build:words && git status --porcelain src/data` | ❌ W0 | ⬜ pending |
| WORD-09 / QA-06 | pools not in entry chunk | script after build | `npm run build && node scripts/check-bundle.mjs` | ❌ W0 | ⬜ pending |
| UI-01 | design tokens used, no hard-coded hex in component CSS | review | manual | n/a | ⬜ pending |
| UI-06 | no vertical scroll at 320x500/568/640, 6 letters | e2e | `npx playwright test -g scroll` | ❌ W0 | ⬜ pending |
| UI-09 | reduced motion: no animation, reveal 150 ms | e2e + CSS | `npx playwright test -g "reduced motion"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `playwright.config.ts`, `e2e/` specs, Playwright Chromium install
- [ ] `src/logic/score.test.ts`, `pickAnswer.test.ts`, `keys.test.ts` (written before implementation, D-21)
- [ ] `scripts/words/*.test.*`, `src/data/words.test.ts`, slang validation test
- [ ] Vitest `include` widening; `.prettierignore` for generated JSON; `check:bundle` script

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Soft, airy look matches UI-SPEC in light and dark | UI-01 | Visual judgement | Run `npm run dev`, compare grid, keyboard, toast against 02-UI-SPEC.md in both themes |
| Owner review of generated Normal answer pools | WORD-02 / D-07 | Content judgement | Owner reads generated answer lists, adds removals to exclude list, rebuilds |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
