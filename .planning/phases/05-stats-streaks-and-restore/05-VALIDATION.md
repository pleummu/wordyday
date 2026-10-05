---
phase: 5
slug: stats-streaks-and-restore
status: draft
nyquist_compliant: true
wave_0_complete: true
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

> Task IDs are `{plan}-T{n}`. RED tasks are expected to fail when first run (MVP: failing E2E first). Per-task Playwright commands run `--project=chromium` only; both projects (chromium + mobile) run in the 05-08 phase gate.

| Task | Requirement / Decision | Behavior | Test Type | Automated Command | File Exists | Status |
|------|------------------------|----------|-----------|-------------------|-------------|--------|
| 05-01-T1 | STRK-01, D-12 | Win Streak banner line, v2 document (RED) | e2e | `npx playwright test e2e/streaks.spec.ts --project=chromium` (expect fail) | ❌ W0 | ✅ green |
| 05-01-T2 | STRK-01, D-18, D-19, D-20, D-07, EC-36 | v2 schema + slice validators, MIGRATIONS[1], recordResult/nextSeq, store persistence plumbing, version churn | unit + e2e | `npx vitest run src/logic src/state && npm run typecheck && npx playwright test e2e/storage.spec.ts e2e/persistence.spec.ts --project=chromium` | ❌ W0 | ✅ green |
| 05-01-T3 | STRK-01, D-12, D-20, D-21, D-07 | finishGame ledger at submit, finishNote, banner Win Streak line + CSS | unit + e2e | `npx vitest run src/state src/components/Banner.test.tsx && npm run typecheck && npm run lint && npx playwright test e2e/streaks.spec.ts e2e/storage.spec.ts --project=chromium` | ✅ extend | ✅ green |
| 05-01-T4 | D-18, D-22 (WR-03, IN-01), EC-44 | v1 to v2 migration, per-Board/per-slice fallback, migrate throws | unit | `npx vitest run src/logic/save.test.ts src/state/storage.test.ts src/state/gameStore.test.ts` | ✅ extend | ✅ green |
| 05-02-T1 | D-20 | two tabs finish the same game before sync (RED) | two-tab unit | `npx vitest run src/state/twoTabs.test.ts src/logic/save.test.ts` (expect fail) | ✅ extend | ✅ green |
| 05-02-T2 | D-20, STRK-01, STRK-02 | pick-one mergeStats, streakRev pickStreak, no ping-pong | two-tab unit | `npx vitest run src/state/twoTabs.test.ts src/logic/save.test.ts src/state/gameStore.test.ts` | ✅ extend | ✅ green |
| 05-02-T3 | QA-02 | scoring, 75/25, forfeit, storage coverage audit | unit | `npx vitest run src/logic src/state` | ✅ extend | ✅ green |
| 05-03-T1 | STAT-01/02/04, D-01..D-07 | Stats E2E + 320 px header + axe on every Stats tab in both modes; installs pinned `@axe-core/playwright`, creates `e2e/axe.ts` (RED) | e2e + axe | `npx playwright test e2e/stats.spec.ts --project=chromium` (expect fail) | ❌ W0 | ✅ green |
| 05-03-T2 | STAT-01/02/04, D-03, D-04, D-21 | deriveStats zero-safe, openStats guards | unit | `npx vitest run src/logic/stats.test.ts src/state/gameStore.test.ts` | ✅ extend | ✅ green |
| 05-03-T3 | D-01, D-02, D-05, D-06 | StatsButton, StatsModal, header layout; Stats axe tests green | component + e2e + axe | `npx vitest run src/components && npx playwright test e2e/stats.spec.ts e2e/layout.spec.ts e2e/settings.spec.ts e2e/wordubado.spec.ts --project=chromium` | ❌ W0 | ✅ green |
| 05-04-T1 | STRK-02, D-11, A2 | Day Streak credit/toast/footer (RED) | e2e `page.clock` | `npx playwright test e2e/streaks.spec.ts --project=chromium -g "Day Streak"` (expect fail) | ✅ extend | ✅ green |
| 05-04-T2 | STRK-03, EC-08/24/25/26/27/28/29/30/31/32/41/44 | date helpers, creditDay, TZ matrix, lint guard | unit | `npx vitest run src/logic/streaks.test.ts src/state/clock.test.ts && npm run lint` | ❌ W0 | ✅ green |
| 05-04-T3 | STRK-02, STAT-03, D-11, R-RESTORE-11, EC-30/33/34/35 | credit at finish, queued toast, footer, reset | unit + e2e | `npx vitest run src/state src/components && npx playwright test e2e/streaks.spec.ts e2e/stats.spec.ts e2e/settings.spec.ts --project=chromium` | ✅ extend | ✅ green |
| 05-05-T1 | D-08, D-09, D-10 | chip E2E + 320 px fit with 12/123 (RED) | e2e | `npx playwright test e2e/streaks.spec.ts --project=chromium -g "chip"` (expect fail) | ✅ extend | ✅ green |
| 05-05-T2 | D-08, D-09, D-10, D-21 | StreakChip in header | component + e2e | `npx vitest run src/components && npx playwright test e2e/streaks.spec.ts e2e/layout.spec.ts e2e/stats.spec.ts --project=chromium` | ❌ W0 | ✅ green |
| 05-06-T1 | STRK-06, STRK-07, D-14, A1 | Restore prompt E2E incl. double Esc, axe on the prompt in both modes, dimmed chip icon contrast >= 3:1 (RED) | e2e `page.clock` + axe | `npx playwright test e2e/restore.spec.ts --project=chromium` (expect fail) | ❌ W0 | ✅ green |
| 05-06-T2 | STRK-03..08, EC-01..29, 31, 37, 38, 42..44 | check/restore/decline table + store actions + boot check | unit table | `npx vitest run src/logic src/state` | ✅ extend | ✅ green |
| 05-06-T3 | STRK-06, D-13, D-14, D-15, D-21, EC-43 | Modal dismissible, RestorePrompt (not rendered while revealing); prompt axe + contrast green | component + e2e + axe | `npx vitest run src/components && npx playwright test e2e/restore.spec.ts e2e/settings.spec.ts e2e/forfeit.spec.ts e2e/wordubado.spec.ts --project=chromium` | ❌ W0 / ✅ extend | ✅ green |
| 05-07-T1 | STRK-04, D-16, D-17, EC-39, A2 | break modal + visibility/focus/midnight E2E, axe on Fresh start in both modes (RED) | e2e `page.clock` + axe | `npx playwright test e2e/restore.spec.ts --project=chromium -g "Breaks and triggers"` (expect fail) | ✅ extend | ✅ green |
| 05-07-T2 | STRK-04, R-RESTORE-7/10, EC-30/39/40, D-21 | finishDay, breakNotice (set at submit, shown after reveal), streakWatch | unit (fake timers) | `npx vitest run src/logic src/state` | ❌ W0 | ✅ green |
| 05-07-T3 | D-16, D-21, QA-02 (EC-01..44 complete) | StreakBreakModal; prompt/Fresh start not rendered while revealing, rendered after finishReveal; EC completeness gate; Fresh start axe green | component + e2e + axe | `npx vitest run && npx playwright test e2e/restore.spec.ts e2e/streaks.spec.ts e2e/stats.spec.ts --project=chromium` | ❌ W0 | ✅ green |
| 05-08-T1 | all | phase gate | full suite | `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build && npm run check:bundle && npm run test:e2e` | ✅ | ✅ green |
| 05-08-T2 | all | owner play-through + manual-only checks | manual | checkpoint | n/a | ✅ green (owner approved 2026-10-05) |

Accessibility: automated axe checks (`@axe-core/playwright`, exact version pinned in 05-03-T1, helper `e2e/axe.ts`) run with Statistics open on every tab in Normal and Wordubado (05-03), with the Restore prompt open in both modes (05-06) and with the Fresh start dialog open in both modes (05-07). The dimmed chip icon (non-text, which axe does not measure) is checked with `nonTextContrast` >= 3:1 in 05-06.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/logic/streaks.test.ts` — EC-01..EC-44 as `it.each` rows, titles start with the EC ID
- [x] `src/logic/stats.test.ts` — zero games, losses-only, wins distribution, All sum, highlight rule
- [x] `src/state/clock.test.ts` — `localDateKey`, `msUntilNextLocalMidnight` across the TZ matrix and both DST days
- [x] `src/state/streakWatch.test.ts`
- [x] `src/components/{StatsModal,RestorePrompt,StreakChip}.test.tsx`; extend `Modal.test.tsx` for `dismissible`
- [x] `e2e/streaks.spec.ts`, `e2e/stats.spec.ts`; update `e2e/layout.spec.ts` for the new header
- [x] `@axe-core/playwright` devDependency (exact pin) and shared `e2e/axe.ts` (`expectNoA11yViolations`, `nonTextContrast`) — 05-03-T1
- [x] Shared v2 save-doc factory (extend `src/test/storageDoubles.ts`)
- [x] Optional: lint guard against `new Date()` / `Date.now()` in `src/logic/**`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Restore prompt cannot be closed with a double Esc in real Chrome | STRK-06 | Browser `<dialog>` cancel behaviour (research assumption A1) may differ from jsdom | Open the prompt, press Esc twice quickly; it must stay open | Done: owner approval 2026-10-05 |
| Midnight rollover while the tab stays open | STRK-04 | Real wall-clock behaviour across local midnight | Leave the app open past midnight (or move the OS clock); the check runs once | Done: owner approval 2026-10-05 (optional step 6 covered by the overall approval) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-05
