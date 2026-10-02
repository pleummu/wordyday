---
phase: 3
slug: wordubado-mode-and-slang
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-02
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.3 (node for logic/scripts, jsdom for components) + Playwright 1.63.0 |
| **Config file** | `vite.config.ts` (includes `scripts/`), `playwright.config.ts` |
| **Quick run command** | `npx vitest run src/logic src/data src/state src/components scripts` |
| **Full suite command** | `npm run lint && npm run typecheck && npm test && npm run build && npm run check:bundle && npx playwright test` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick run command for the touched directories
- **After every plan wave:** Run `npm test` plus `npm run build:words && git diff --exit-code src/data scripts/words`
- **Before `/gsd:verify-work`:** Full suite must be green and the owner has signed off the slang review
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

Filled in by the planner and executor. Requirement-level map from research:

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| WORD-04 | 10,000 seeded draws give ~75% slang (7300–7700), each word from its own pool; empty-slang fallback | unit | `npx vitest run src/logic/pickAnswer.test.ts` | extend (W0 cases) | ⬜ pending |
| WORD-04 | Store picks by mode in `startGame`; Normal never draws slang | unit | `npx vitest run src/state/gameStore.test.ts` | extend | ⬜ pending |
| WORD-03 | Generated answers contain no slang; every slang word is in guesses; Normal accepts a slang guess | unit + e2e | `npx vitest run scripts/words/pools.test.mjs`; `npx playwright test e2e/wordubado.spec.ts` | e2e ❌ W0 | ⬜ pending |
| WORD-08 | slang.json shape, all reviewed true, no blocklist hits, no dupes, count floor/ceiling, `words-N.json` slang equals reviewed entries | unit | `npx vitest run scripts/words/slang.test.mjs` | exists, edit | ⬜ pending |
| WORD-01 | Switch toggles mode; confirm only when rows>0 and playing; blocked while revealing; cancel keeps state; confirm restarts | unit + component + e2e | `npx vitest run src/state src/components` | extend / new | ⬜ pending |
| WORD-06 | (i) dialog shows crude warning; auto-opens once on first enable (after confirm); Esc closes; focus returns | component + e2e | `npx playwright test e2e/wordubado.spec.ts` | ❌ W0 | ⬜ pending |
| UI-05 | Header shows switch + picker; switch has accessible name "Wordubado" | component + e2e | `npx vitest run src/components/Header` | new | ⬜ pending |
| WORD-09 (regression) | Slang words not in entry chunk | build check | `npm run build && npm run check:bundle` | extend | ⬜ pending |
| Keys | Physical keys ignored while a dialog is open; Enter on switch does not submit | component | `npx vitest run src/components` | new | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] jsdom `HTMLDialogElement.showModal/close` stub in test setup
- [ ] `e2e/wordubado.spec.ts` — switch, popup, confirm, win with a slang answer read from words JSON
- [ ] Seeded RNG helper in `src/logic/pickAnswer.test.ts`
- [ ] `scripts/words/slang.test.mjs` flipped to `reviewed === true` in the same task that applies the owner review

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Owner reviews slang.json (no slurs/hate terms, definitions OK) | WORD-08 | Content judgement | Read the review sheet, give a cut list, confirm counts per length |
| Popup copy and mode accent feel right | WORD-06, UI-05 | Visual/tone judgement | Toggle Wordubado in light and dark, open (i) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
