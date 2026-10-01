---
phase: 2
slug: playable-normal-game
status: draft
nyquist_compliant: true
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
| **Config file** | `vite.config.ts` (widen `test.include` for `scripts/`, plan 02-02); `playwright.config.ts` (new, plan 02-05) |
| **Quick run command** | `npx vitest run src/logic src/data src/state scripts` |
| **Full suite command** | `npm run lint && npm run typecheck && npm test && npm run build && npm run check:bundle && npx playwright test` |
| **Estimated runtime** | ~90 seconds (unit ~10 s, E2E ~60-80 s) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <touched dir>` (each task's `<automated>` verify)
- **After every plan wave:** Run full unit suite + `npm run build`; E2E runs at the end of each UI plan (02-07, 02-08, 02-09)
- **Before `/gsd:verify-work`:** Full suite (including E2E) must be green and owner review (D-07) complete
- **Max feedback latency:** 15 seconds for unit sampling

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-T1 | 02-01 | 1 | PLAY-02 | unit (TDD) | `npx vitest run src/logic/score.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-T2 | 02-01 | 1 | WORD-05, PLAY-04 (R-GUESS-6) | unit (TDD) | `npx vitest run src/logic` | ❌ W0 | ⬜ pending |
| 02-02-T1 | 02-02 | 1 | WORD-07 (slang, D-18) | unit | `npx vitest run scripts/words/slang.test.mjs -t "shape\|4-letter"` | ❌ W0 | ⬜ pending |
| 02-02-T2 | 02-02 | 1 | WORD-07 (slang, D-18) | unit | `npx vitest run scripts/words/slang.test.mjs` | ❌ W0 | ⬜ pending |
| 02-03-T1 | 02-03 | 2 | WORD-02 | unit (TDD) | `npx vitest run scripts/words/lib.test.mjs` | ❌ W0 | ⬜ pending |
| 02-03-T2 | 02-03 | 2 | WORD-02, WORD-07 | unit + build | `npm run build:words && npx vitest run scripts/words && git status --porcelain src/data scripts/words/slang-review.md` | ❌ W0 (`scripts/words/pools.test.mjs`) | ⬜ pending |
| 02-04-T1 | 02-04 | 3 | WORD-02 | file check | `grep -c "^## " .planning/phases/02-playable-normal-game/02-ANSWER-REVIEW.md` | n/a | ⬜ pending |
| 02-04-T2 | 02-04 | 3 | WORD-02 (D-07) | manual checkpoint | owner review (see Manual-Only) | n/a | ⬜ pending |
| 02-04-T3 | 02-04 | 3 | WORD-02 | unit + build | `npm run build:words && npx vitest run scripts/words && git status --porcelain src/data` | ✅ after 02-03 | ⬜ pending |
| 02-05-T1 | 02-05 | 3 | PLAY-01 (E2E harness, D-19) | config | `npx playwright --version && npm run typecheck && npm run lint` | ❌ W0 (`playwright.config.ts`) | ⬜ pending |
| 02-05-T2 | 02-05 | 3 | PLAY-01, PLAY-04, PLAY-06 | e2e (RED, list only) | `npx playwright test --list` | ❌ W0 (`e2e/game.spec.ts`) | ⬜ pending |
| 02-06-T1 | 02-06 | 4 | WORD-09 (D-12), D-22 | unit (TDD) | `npx vitest run src/data src/state` | ❌ W0 (`src/data/wordData.test.ts`) | ⬜ pending |
| 02-06-T2 | 02-06 | 4 | PLAY-03, PLAY-05, PLAY-06, WORD-05 | unit (TDD) | `npx vitest run src/state` | ❌ W0 (`src/state/gameStore.test.ts`) | ⬜ pending |
| 02-07-T1 | 02-07 | 5 | PLAY-01, UI-01 | component (TDD) | `npx vitest run src/components/Grid.test.tsx` | ❌ W0 | ⬜ pending |
| 02-07-T2 | 02-07 | 5 | PLAY-04 | component (TDD) | `npx vitest run src/components/Keyboard.test.tsx` | ❌ W0 | ⬜ pending |
| 02-07-T3 | 02-07 | 5 | PLAY-04, PLAY-06 | component + e2e (GREEN) | `npx vitest run src && npx playwright test e2e/game.spec.ts` | ✅ after 02-05 | ⬜ pending |
| 02-08-T1 | 02-08 | 6 | PLAY-03 | component (TDD) | `npx vitest run src/components/Toast.test.tsx src/components/Grid.test.tsx` | ❌ W0 (`Toast.test.tsx`) | ⬜ pending |
| 02-08-T2 | 02-08 | 6 | PLAY-05, UI-09 | e2e | `npx playwright test e2e/motion.spec.ts e2e/game.spec.ts e2e/feedback.spec.ts` | ❌ W0 (`motion.spec.ts`) | ⬜ pending |
| 02-09-T1 | 02-09 | 7 | UI-06 | e2e | `npx playwright test -g scroll` | ❌ W0 (`layout.spec.ts`) | ⬜ pending |
| 02-09-T2 | 02-09 | 7 | WORD-09 (load error) | component + e2e | `npx vitest run src/App.test.tsx && npx playwright test e2e/loading.spec.ts` | ❌ W0 (`loading.spec.ts`) | ⬜ pending |
| 02-10-T1 | 02-10 | 8 | QA-06, WORD-09 | script after build | `npm run build && npm run check:bundle && npm run lint` | ❌ W0 (`scripts/check-bundle.mjs`) | ⬜ pending |
| 02-10-T2 | 02-10 | 8 | WORD-07 (D-20 drift) | CI + local drift | `npm run build:words && git diff --exit-code -- src/data scripts/words && test -z "$(git status --porcelain -- src/data scripts/words)"` | ✅ after 02-03 | ⬜ pending |
| 02-11-T1 | 02-11 | 9 | all (CI on PR) | CI | `gh pr checks phase-02/playable-normal-game` | n/a | ⬜ pending |
| 02-11-T2 | 02-11 | 9 | UI-01 | manual checkpoint | owner preview sign-off (see Manual-Only) | n/a | ⬜ pending |

Requirement-level map (from RESEARCH.md, paths synced to the plans):

| Requirement | Behavior | Test Type | Automated Command |
|-------------|----------|-----------|-------------------|
| PLAY-01 | grid dims 5/6/7 rows for 4/5/6 letters | unit+component | `npx vitest run src/components/Grid.test.tsx` |
| PLAY-02 | repeated-letter scoring (ABBEY/BABES, SPEED/ERASE, triples) | unit | `npx vitest run src/logic/score.test.ts` |
| PLAY-03 | short/invalid rejected, no attempt used, shake scoped to the rejected row | store unit + e2e | `npx vitest run src/state/gameStore.test.ts`; `npx playwright test -g invalid` |
| PLAY-04 | key best-state merge; physical keyboard; Enter after a pointer length pick submits | unit + component | `npx vitest run src/logic/keys.test.ts src/components/Keyboard.test.tsx src/App.test.tsx` |
| PLAY-05 | input blocked during reveal; keys update after reveal | store unit + e2e | `npx vitest run src/state/gameStore.test.ts`; `npx playwright test -g "blocked during reveal"` |
| PLAY-06 | answer shown on loss | e2e | `npx playwright test -g lose` |
| WORD-02 | stem rules; blocklist/exclude honoured | unit | `npx vitest run scripts/words` |
| WORD-05 | pickAnswer uniform/injectable/repeats allowed | unit | `npx vitest run src/logic/pickAnswer.test.ts` |
| WORD-07 | build invariants; no drift | unit + CI | `npx vitest run scripts/words/pools.test.mjs`; `npm run build:words && git status --porcelain src/data` |
| WORD-09 / QA-06 | pools lazy, not in entry chunk | unit + script after build | `npx vitest run src/data/wordData.test.ts`; `npm run build && npm run check:bundle` |
| UI-01 | design tokens used, no hard-coded hex in component CSS | grep + review | `grep -cE "#[0-9a-fA-F]{3,8}" src/styles/game.css` returns 0; look and feel manual |
| UI-06 | no vertical scroll at 320x500/540/541/568/640, 6 letters | e2e | `npx playwright test -g scroll` |
| UI-09 | reduced motion: no animation, reveal 150 ms | e2e + CSS | `npx playwright test -g "reduced motion"` |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test files are created test-first inside the plan that first needs them (no separate Wave 0 plan):

- [ ] `playwright.config.ts`, `e2e/helpers.ts`, `e2e/game.spec.ts`, Playwright Chromium install (02-05)
- [ ] `src/logic/score.test.ts`, `pickAnswer.test.ts`, `keys.test.ts` (02-01, written before implementation, D-21)
- [ ] `scripts/words/slang.test.mjs` (02-02), `scripts/words/lib.test.mjs` and `scripts/words/pools.test.mjs` (02-03)
- [ ] `src/data/wordData.test.ts`, `src/state/gameStore.test.ts` (02-06)
- [ ] Vitest `include` widening (02-02); `.prettierignore` for generated JSON (02-03); `check:bundle` script (02-10)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Soft, airy look matches UI-SPEC in light and dark | UI-01 | Visual judgement | Owner plays the Vercel preview (02-11 Task 2) and compares grid, keyboard, toast against 02-UI-SPEC.md |
| Owner review of generated Normal answer pools | WORD-02 / D-07 | Content judgement | Owner reads generated answer lists (02-04 Task 2), adds removals to exclude.txt, rebuilds |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (checkpoints 02-04-T2 and 02-11-T2 are manual by design)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s for unit verifies (E2E verifies run at UI plan ends)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
