---
phase: 4
slug: six-boards-and-persistence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-02
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.3 (node env default; `// @vitest-environment jsdom` for components); Playwright 1.63 for E2E |
| **Config file** | `vite.config.ts` (test block); `playwright.config.ts` |
| **Quick run command** | `npx vitest run src/logic src/state` |
| **Full suite command** | `npm run lint && npm run typecheck && npm test && npm run test:e2e` |
| **Estimated runtime** | ~10 seconds quick; ~120 seconds full |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/logic src/state`
- **After every plan wave:** Run `npm run lint && npm run typecheck && npm test`
- **Before `/gsd:verify-work`:** Full suite (including `npm run test:e2e`) must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

Filled in by the planner/executor per task. Requirement-level map (from RESEARCH.md):

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| SAVE-01 | Six boards keyed `${mode}-${len}` hold independent games | unit | `npx vitest run src/state/gameStore.test.ts -t boards` | extend | ⬜ pending |
| SAVE-02 | Switch never forfeits; return restores same game | unit + e2e | `npx vitest run src/state/gameStore.test.ts -t switch`; `npx playwright test e2e/boards.spec.ts` | ❌ W0 (e2e) | ⬜ pending |
| SAVE-03 | Reload resumes submitted rows; half-typed row dropped | e2e + unit | `npx playwright test e2e/persistence.spec.ts -g refresh` | ❌ W0 | ⬜ pending |
| SAVE-04 | Finished board restores grid + banner; new game only on Play again | component + e2e | `npx vitest run src/App.test.tsx -t finished` | extend | ⬜ pending |
| SAVE-05 | `SAVE_VERSION` + migration chain | unit | `npx vitest run src/logic/save.test.ts` | ❌ W0 | ⬜ pending |
| SAVE-06 | Corrupt/tampered/newer data => backup, fresh state, never throws | unit | `npx vitest run src/state/storage.test.ts src/logic/save.test.ts` | ❌ W0 | ⬜ pending |
| SAVE-07 | Blocked/full storage: game playable, one toast | unit + e2e | `npx vitest run src/state/storage.test.ts` | ❌ W0 | ⬜ pending |
| SAVE-08 | Two tabs stay in sync (storage event) | unit + e2e | `npx vitest run src/state/sync.test.ts`; `npx playwright test e2e/tabs.spec.ts` | ❌ W0 | ⬜ pending |
| SAVE-09 | Reset all data after confirm | unit + e2e | `npx vitest run src/state/gameStore.test.ts -t reset` | extend | ⬜ pending |
| PLAY-07 | Give Up only at attempts-2, confirm, counts as loss | unit + component + e2e | `npx vitest run src/logic/save.test.ts -t canForfeit` | ❌ W0 | ⬜ pending |
| PLAY-08 | New game mid-game, same rule, forfeit recorded | unit + e2e | `npx vitest run src/state/gameStore.test.ts -t forfeit` | extend | ⬜ pending |
| UI-11 | Settings browser-only note | component | `npx vitest run src/components/SettingsModal.test.tsx` | ❌ W0 | ⬜ pending |
| D-14 | Modal native `close` handled once | component | `npx vitest run src/components/Modal.test.tsx` | extend | ⬜ pending |
| D-15 | Retry offline rejects; online reloads then rejects | unit | `npx vitest run src/data/wordData.test.ts` | extend | ⬜ pending |
| D-16 | Stale reveal timer ignored after token bump | unit | `npx vitest run src/state/gameStore.test.ts -t token` | extend | ⬜ pending |
| D-12 | Length dot on other in-progress boards | component | `npx vitest run src/components/LengthPicker.test.tsx` | ❌ W0 | ⬜ pending |
| Layout | Forfeit row fits at 320x500/568/640 | e2e | `npx playwright test e2e/layout.spec.ts` | extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/logic/save.test.ts` — migration chain, guard tampering table, `canForfeit`, `resolveOutcome`
- [ ] `src/state/storage.test.ts` — in-memory / throwing / quota / corrupt storage doubles (`createMemoryStorage` helper in `src/test/`)
- [ ] `src/state/sync.test.ts` — dispatched `StorageEvent` against a store
- [ ] `src/test/stubDialog.ts` — `close()` dispatches a `close` event
- [ ] `e2e/persistence.spec.ts`, `e2e/tabs.spec.ts`, forfeit/settings flows; update `e2e/wordubado.spec.ts`; reload helper that keeps the `fixAnswers` init script
- [ ] Delete `src/components/SwitchConfirm.test.tsx`; rewrite switch tests in `App.test.tsx`, `Header.test.tsx`, `gameStore.test.ts`

Framework install: none.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Axe a11y with each new dialog open | UI-11, PLAY-07 | `@axe-core/playwright` not installed; adding it needs owner approval | Open Give Up / New game / Reset confirms; check focus trap, Esc, focus return, screen-reader labels |
| Real private-mode / blocked storage in a browser | SAVE-07 | Automated test uses an init-script override, not a real browser setting | Open site with site data blocked; play a full game; see one toast |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
