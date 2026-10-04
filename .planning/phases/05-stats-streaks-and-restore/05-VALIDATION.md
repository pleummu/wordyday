---
phase: 5
slug: stats-streaks-and-restore
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-04
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.3 (node env default; jsdom per-file for components) + Playwright 1.63 |
| **Config file** | `vite.config.ts` (`test.include: src/**/*.test.{ts,tsx}`), `playwright.config.ts` (chromium + Pixel 7 "mobile") |
| **Quick run command** | `npx vitest run src/logic src/state` |
| **Full suite command** | `npm run lint && npm run typecheck && npm test && npm run test:e2e` |
| **Estimated runtime** | ~20 seconds quick; ~120 seconds full |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/logic src/state`
- **After every plan wave:** Run `npm run lint && npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite (incl. `npm run test:e2e`, `npm run build`, `npm run check:bundle`) must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Filled in by the planner/executor once task IDs exist. Requirement-level map from 05-RESEARCH.md:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| STRK-03 | missed-day maths, DST, leap, year end, clock backwards (EC-24..31) | unit table | `npx vitest run src/logic/streaks.test.ts` | ❌ W0 | ⬜ pending |
| STRK-04/05/06/07/08 | CHECK/RESTORE/DECLINE/FINISH reducer, EC-01..23, 32..44 | unit table | `npx vitest run src/logic/streaks.test.ts` | ❌ W0 | ⬜ pending |
| STRK-01/02 | Win Streak + Day Streak via store finish (win/loss/give-up/forfeit, once per day; recorded at submit per D-21) | store unit | `npx vitest run src/state/gameStore.test.ts` | ✅ extend | ⬜ pending |
| STRK-04 (triggers) | focus/visibility/midnight watcher registers once, idempotent, cleans up | unit, fake timers | `npx vitest run src/state/streakWatch.test.ts` | ❌ W0 | ⬜ pending |
| STRK-06 | prompt blocks input, not dismissable, survives refresh, EC-11 | component + store | `npx vitest run src/components/RestorePrompt.test.tsx src/components/Modal.test.tsx` | ❌ W0 / ✅ extend | ⬜ pending |
| STRK-07 (E2E) | prompt after missed day, Restore keeps number, No resets, reload re-shows | e2e `page.clock` | `npx playwright test e2e/streaks.spec.ts` | ❌ W0 | ⬜ pending |
| STAT-01..04 | derive, tabs, All sums rows 1-7, empty state "—" never NaN; openers disabled while revealing (D-21) | unit + component | `npx vitest run src/logic/stats.test.ts src/components/StatsModal.test.tsx` | ❌ W0 | ⬜ pending |
| D-18 / D-22 | v1 doc migrates to v2 with zero stats, boards kept; bad Board skipped (WR-03); `persist.migrate` throws (IN-01) | unit | `npx vitest run src/logic/save.test.ts src/state/storage.test.ts` | ✅ extend | ⬜ pending |
| D-20 | idempotent finish; two tabs finish same game before sync; merge never double-counts | two-tab unit | `npx vitest run src/state/twoTabs.test.ts` | ✅ extend | ⬜ pending |
| UI / a11y | axe on Stats (each tab), Restore prompt, break modal, both modes; 320 px header with Day Streak 12/123 | e2e | `npx playwright test e2e/layout.spec.ts e2e/stats.spec.ts` | ✅ extend / ❌ W0 | ⬜ pending |
| QA-02 | scoring, 75/25 over 10,000 seeded draws, forfeit, storage, streak tables + TZ matrix | audit | `npx vitest run src/logic/score.test.ts src/logic/pickAnswer.test.ts src/logic/save.test.ts src/state/storage.test.ts` | ✅ confirm | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/logic/streaks.test.ts` — EC-01..EC-44 as `it.each` rows, titles start with the EC ID
- [ ] `src/logic/stats.test.ts` — zero games, losses-only, wins distribution, All sum, highlight rule
- [ ] `src/state/clock.test.ts` — `localDateKey`, `msUntilNextLocalMidnight` across the TZ matrix and both DST days
- [ ] `src/state/streakWatch.test.ts`
- [ ] `src/components/{StatsModal,RestorePrompt,StreakChip}.test.tsx`; extend `Modal.test.tsx` for `dismissible`
- [ ] `e2e/streaks.spec.ts`, `e2e/stats.spec.ts`; update `e2e/layout.spec.ts` for the new header
- [ ] Shared v2 save-doc factory (extend `src/test/storageDoubles.ts`)
- [ ] Optional: lint guard against `new Date()` / `Date.now()` in `src/logic/**`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Restore prompt cannot be closed with a double Esc in real Chrome | STRK-06 | Browser `<dialog>` cancel behaviour (research assumption A1) may differ from jsdom | Open the prompt, press Esc twice quickly; it must stay open |
| Midnight rollover while the tab stays open | STRK-04 | Real wall-clock behaviour across local midnight | Leave the app open past midnight (or move the OS clock); the check runs once |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
