---
phase: 7
slug: themes-accessibility-and-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-13
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5 (jsdom for components) + Playwright 1.63 with @axe-core/playwright |
| **Config file** | `vite.config.ts` (`test`), `playwright.config.ts` |
| **Quick run command** | `npx vitest run src/logic/save.test.ts src/state src/components` |
| **Full suite command** | `npm run lint && npm run typecheck && npm test && npm run test:e2e` |
| **Estimated runtime** | ~120 seconds (full), ~20 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** Run the quick command for the touched module
- **After every plan wave:** Run `npm test` plus the new or changed Playwright specs
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

Filled in by the planner / Nyquist audit once PLAN.md task IDs exist. Requirement-level map from RESEARCH.md:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| UI-02 | v2 → v3 migration defaults; bad theme coerced; reset restores defaults | unit | `npx vitest run src/logic/save.test.ts` | extend | ⬜ pending |
| UI-02 | resolveTheme / live matchMedia follow, listener cleanup | unit | `npx vitest run src/state/appearance.test.ts` | ❌ W0 | ⬜ pending |
| UI-02 | No flash: pre-paint data-theme; follows emulateMedia; corrupt storage safe | e2e | `npx playwright test e2e/theme.spec.ts` | ❌ W0 | ⬜ pending |
| UI-02/03 | Two-tab adoption of theme/colourBlind, no ping-pong | unit | `npx vitest run src/state/twoTabs.test.ts` | extend | ⬜ pending |
| UI-03 | Colour-blind persists across reload; orange/blue tiles and keys | e2e | `npx playwright test e2e/theme.spec.ts` | ❌ W0 | ⬜ pending |
| UI-04 | First-visit auto-open, once only, header reopen, existing v2 player once, Restore prompt wins | unit + e2e | `npx vitest run src/state/gameStore.test.ts`; `npx playwright test e2e/help.spec.ts` | ❌ W0 | ⬜ pending |
| UI-05 | Help button first in header, fits at 320 px | e2e | `npx playwright test e2e/layout.spec.ts` | extend | ⬜ pending |
| UI-07 | announce.ts text for each state, tries plural, win/loss/give-up | unit | `npx vitest run src/logic/announce.test.ts` | ❌ W0 | ⬜ pending |
| UI-07 | Live region updates once per guess after reveal, not on typing, no duplicate | component | `npx vitest run src/components/LiveRegion.test.tsx` | ❌ W0 | ⬜ pending |
| UI-08 | Full game + every dialog keyboard-only; Esc; focus return; Restore not Esc-dismissable | e2e | `npx playwright test e2e/keyboard.spec.ts` | ❌ W0 | ⬜ pending |
| UI-08 | axe clean in light, dark, colour-blind light and dark | e2e | `npx playwright test e2e/a11y-themes.spec.ts` | ❌ W0 | ⬜ pending |
| UI-10 | Head meta, absolute OG URLs, icons, noscript; assets exist and sized | unit + e2e | `npx vitest run scripts/meta.test.mjs` | ❌ W0 | ⬜ pending |
| all | Existing suite green with skipHelp default | e2e | `npm run test:e2e` | update helpers | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `e2e/helpers.ts` + `src/state/testHook.ts` — `skipHelp` default, before Help auto-open lands
- [ ] `src/state/appearance.test.ts`, `src/logic/announce.test.ts`, `src/components/LiveRegion.test.tsx`, `scripts/meta.test.mjs`
- [ ] `e2e/theme.spec.ts`, `e2e/help.spec.ts`, `e2e/keyboard.spec.ts`, `e2e/a11y-themes.spec.ts`
- [ ] Update fixtures asserting save version 2 and the `"version":3` newer-build fixture in `e2e/storage.spec.ts` (becomes 4)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real screen reader hears guess results, win/loss/give-up line | UI-07 | Live-region speech can't be asserted in jsdom/Playwright | NVDA (Windows) or VoiceOver: play a win, a loss and a Give Up; confirm one announcement per guess, none during typing |
| iPhone Safari layout and theme-color | UI-02, UI-06 | WebKit not installed here | Open the preview on an iPhone in light and dark; check no flash, header fits, dvh layout |
| Link preview card | UI-10 | Needs the deployed absolute URL | After production deploy, paste https://wordyday.vercel.app into Slack/Discord or opengraph.xyz |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
