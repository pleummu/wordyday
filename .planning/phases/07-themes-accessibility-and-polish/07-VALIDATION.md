---
phase: 7
slug: themes-accessibility-and-polish
status: complete
nyquist_compliant: true
wave_0_complete: true
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

| Task | Requirement | Behavior | Automated Command | File Exists | Status |
|------|-------------|----------|-------------------|-------------|--------|
| 07-01-T1 | UI-04 | skipHelp hook, helper defaults, RED help spec | `npx playwright test e2e/help.spec.ts` | yes | ✅ green |
| 07-01-T2 | UI-02 | Save v2 to v3 migration, bad theme coerced | `npx vitest run src/logic/save.test.ts` | yes | ✅ green |
| 07-01-T3 | UI-04 | Store persists fields; help dialog, maybeOpenHelp | `npx vitest run src/state/gameStore.test.ts` | yes | ✅ green |
| 07-02-T1 | UI-10 | Failing metadata unit and E2E tests | `npx vitest run scripts/meta.test.mjs` | yes | ✅ green |
| 07-02-T2 | UI-10 | Head meta, absolute OG URLs, noscript, favicon | `npx playwright test e2e/meta.spec.ts` | yes | ✅ green |
| 07-02-T3 | UI-10 | OG image and apple-touch-icon exist and sized | `npx vitest run scripts/meta.test.mjs` | yes | ✅ green |
| 07-03-T1 | UI-04 | How-to-play content and copy | `npx vitest run src/components` | yes | ✅ green |
| 07-03-T2 | UI-05 | Help button first in header, fits at 320 px | `npx playwright test e2e/layout.spec.ts` | yes | ✅ green |
| 07-03-T3 | UI-04 | Auto-open once; Restore prompt wins; reset reopens | `npx playwright test e2e/help.spec.ts` | yes | ✅ green |
| 07-04-T1 | UI-02 | Failing dark-theme E2E | `npx playwright test e2e/theme.spec.ts` | yes | ✅ green |
| 07-04-T2 | UI-02 | Dark tokens, pre-paint script, no flash | `npx playwright test e2e/theme.spec.ts` | yes | ✅ green |
| 07-04-T3 | UI-02 | resolveTheme and live OS follow, cleanup | `npx vitest run src/state/appearance.test.ts` | yes | ✅ green |
| 07-05-T1 | UI-07 | announce.ts text per state | `npx vitest run src/logic/announce.test.ts` | yes | ✅ green |
| 07-05-T2 | UI-07 | Live region once per guess after reveal | `npx vitest run src/components/LiveRegion.test.tsx`; `npx playwright test e2e/announce.spec.ts` | yes | ✅ green |
| 07-06-T1 | UI-03 | Failing Appearance E2E | `npx playwright test e2e/theme.spec.ts` | yes | ✅ green |
| 07-06-T2 | UI-02/03 | setTheme/setColourBlind, two-tab adoption | `npx vitest run src/state/twoTabs.test.ts` | yes | ✅ green |
| 07-06-T3 | UI-03 | Appearance section in Settings, reset copy | `npx playwright test e2e/settings.spec.ts` | yes | ✅ green |
| 07-07-T1 | UI-08 | Keyboard-only game and dialogs, focus return | `npx playwright test e2e/keyboard.spec.ts` | yes | ✅ green |
| 07-07-T2 | UI-08 | axe clean in four theme/palette combinations | `npx playwright test e2e/a11y-themes.spec.ts` | yes | ✅ green |
| all | all | Full gate: lint, format, typecheck, vitest 678, build, check:bundle, Playwright 437 passed / 15 skipped | `npm run test:e2e` | yes | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `e2e/helpers.ts` + `src/state/testHook.ts` — `skipHelp` default, before Help auto-open lands
- [x] `src/state/appearance.test.ts`, `src/logic/announce.test.ts`, `src/components/LiveRegion.test.tsx`, `scripts/meta.test.mjs`
- [x] `e2e/theme.spec.ts`, `e2e/help.spec.ts`, `e2e/keyboard.spec.ts`, `e2e/a11y-themes.spec.ts`
- [x] Update fixtures asserting save version 2 and the `"version":3` newer-build fixture in `e2e/storage.spec.ts` (becomes 4)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Outcome |
|----------|-------------|------------|-------------------|---------|
| Real screen reader hears guess results, win/loss/give-up line | UI-07 | Live-region speech can't be asserted in jsdom/Playwright | NVDA (Windows) or VoiceOver: play a win, a loss and a Give Up; confirm one announcement per guess, none during typing | approved by owner (2026-10-15) |
| iPhone Safari layout and theme-color | UI-02, UI-06 | WebKit not installed here | Open the preview on an iPhone in light and dark; check no flash, header fits, dvh layout | approved by owner (2026-10-15) |
| Link preview card | UI-10 | Needs the deployed absolute URL | After production deploy, paste https://wordyday.vercel.app into Slack/Discord or opengraph.xyz | approved by owner (2026-10-15) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-15. Automated gate green; owner approved all six manual checks (link preview recorded as approved by the owner, depends on the production deploy).
