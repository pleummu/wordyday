---
phase: 04-six-boards-and-persistence
verified: 2026-10-03T00:00:00Z
status: gaps_found
score: 3/5 roadmap success criteria fully verified (SC1, SC2, SC3, SC5 verified; SC4 partial)
gaps:
  - truth: "Two open tabs stay in sync (SC4, SAVE-08)"
    status: failed
    reason: "CR-02: when the other tab's document lacks the active Board (Play again, New game, forfeit, Reset all write a board-less 'loading' document), each tab starts its own random game; tabs end up crossed on different answers and both toast 'Updated from your other tab'. e2e hides it because fixAnswers forces the same answer in both tabs (WR-07)."
    artifacts:
      - path: "src/state/gameStore.ts"
        issue: "applyExternal theirs===undefined branch (about lines 420-431) calls startGame with local rng; startGame persists a board-less loading document"
      - path: "e2e/tabs.spec.ts"
        issue: "No test for Play again / New game / Reset with a second tab and different answers; uses waitForTimeout(300)"
    missing:
      - "Keep the live game when the external doc lacks the active Board and raw !== null; merge other Boards only"
      - "Do not broadcast a board-less loading document"
      - "E2E where the answer is fixed only in tab A, Play again in A, B shows the same answer"
  - truth: "Saved data has a version number and a migration chain that protects data across updates (SAVE-05, SAVE-06 hand-off to Phase 5)"
    status: failed
    reason: "CR-01 (confirmed in code): loadSave returns { ok:false } for version > SAVE_VERSION; storage.getItem backs it up to :corrupt, toasts 'corrupt', returns null, and the next write overwrites it. Across tabs, read() yields 'invalid' and the old tab later overwrites a newer document. Phase 5 bumps the schema, so v1 code in old tabs/rollbacks will wipe streaks and Restores."
    artifacts:
      - path: "src/logic/save.ts"
        issue: "lines 171-179 no distinct 'newer' result"
      - path: "src/state/storage.ts"
        issue: "getItem/setItem/read have no read-only mode for newer-version saves"
    missing:
      - "Distinct 'newer' result; storage goes read-only for the session, no corrupt toast/backup, no overwrite"
      - "Unit tests for newer-version load on boot and via storage event"
  - truth: "Reset all data fully resets and a finished game is never double-counted (SAVE-09, CONTEXT seam for Phase 5)"
    status: partial
    reason: "WR-03: pendingExternal is not cleared by resetAll/startGame (only set undefined at gameStore.ts:263 and consumed at 613-615), so a pre-reset document can be applied after reset and undo it. WR-04: applyExternal replaces whole boards document (last-writer-wins) and can roll back a game already finished, allowing onGameFinished to fire twice."
    artifacts:
      - path: "src/state/gameStore.ts"
        issue: "resetAll does not clear pendingExternal; applyExternal not merged per Board"
    missing:
      - "Clear pendingExternal wherever loadToken is bumped (resetAll, startGame, loadBoard)"
      - "Per-Board merge: same answer keeps more guesses, never move finished back to playing"
---

# Phase 4: Six Boards and Persistence Verification Report

**Phase Goal:** Users keep six independent games that survive refresh, mode/length switches and bad storage
**Status:** gaps_found
**Re-verification:** No, initial verification

## Automated Checks (run by verifier)

| Check | Result |
| ----- | ------ |
| `npx vitest run` | 23 files, 324 tests pass |
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| `npx playwright test --project=chromium` | 59 passed |
| Debt markers (TBD/FIXME/XXX) in src, e2e | none found |

Green tests do not cover the gaps below: the review reproduced CR-02 and WR-01 with a throwaway two-store script, and the e2e suite masks CR-02 by fixing the same answer in both tabs.

## Success Criteria

| # | Criterion | Status | Evidence |
| - | --------- | ------ | -------- |
| 1 | Six Boards, switch without losing progress, refresh resumes, half-typed row discarded | VERIFIED | Persisted store, non-forfeiting switchBoard, refresh/switch E2E and unit tests pass |
| 2 | Finished Board shows grid, banner, Play again; new game only on Play again | VERIFIED | Static restore in Grid/Banner, tests pass |
| 3 | Give Up / New game only at exactly 2 tries left, confirm, counts as loss | VERIFIED | canForfeit, forfeit E2E (give up, new game, 4/6 letters) pass |
| 4 | Corrupt/blocked/full storage still works; two tabs stay in sync | PARTIAL / FAILED | Corrupt/blocked/full handled (storage tests, loading E2E). Tab sync diverges (CR-02); newer-version saves destroyed (CR-01) |
| 5 | Reset all from Settings after confirm; browser-only note | VERIFIED (with WR-03 caveat) | ResetConfirm, SettingsModal, resetAll present and tested; stale pendingExternal can undo a reset in a narrow race |

## Requirements Coverage

All 12 IDs appear in plan frontmatter and in REQUIREMENTS.md (all marked Complete, mapped to Phase 4); no orphans.

| Requirement | Plans | Status |
| ----------- | ----- | ------ |
| SAVE-01, SAVE-02, SAVE-03, SAVE-04 | 01, 02, 03 | SATISFIED |
| SAVE-05 (versioned, migration chain) | 01, 02 | PARTIAL: chain exists but forward-version handling destroys newer data (CR-01) |
| SAVE-06 (corrupt data never white-screens, backed up) | 01, 02, 07 | SATISFIED for corrupt; newer-version misclassified as corrupt (CR-01); WR-05 one bad Board drops all |
| SAVE-07 (storage unavailable/full) | 02, 07 | SATISFIED (WR-02: second failure after recovery is not reported, minor) |
| SAVE-08 (tabs in sync) | 07 | BLOCKED by CR-02 (also WR-04) |
| SAVE-09 (reset all) | 06 | SATISFIED with WR-03 caveat |
| PLAY-07, PLAY-08 | 04, 05 | SATISFIED |
| UI-11 | 06 | SATISFIED |

## Review Findings Weighed

- CR-01: BLOCKER for SAVE-05/SAVE-06 intent; code confirmed (save.ts version > SAVE_VERSION returns ok:false; storage.getItem backs up to :corrupt, emits corrupt, returns null).
- CR-02: BLOCKER for SC4 / SAVE-08; tabs diverge on Play again / New game / Reset.
- WR-03, WR-04: gaps (Reset completeness; double-count of finish, which Phase 5 stats depend on per CONTEXT).
- WR-01 (stale snapshot written during startGame) is tied to CR-02/WR-04; fix together.
- Non-blocking, warning level: WR-02, WR-05, WR-06 (toast behind modals, a11y), WR-07 (test weakness), IN-01..06.

## Human Verification

None required beyond closing the gaps; two-tab behaviour should be re-checked manually after the CR-02 fix.

## Gaps Summary

Everything is built and tests pass, but the cross-tab and forward-compat paths have real defects that contradict SC4 (tabs stay in sync) and the versioning intent of SAVE-05/06. Plan a gap-closure (`/gsd-plan-phase 4 --gaps`) covering CR-01, CR-02 (with WR-01), WR-03/WR-04, and the missing e2e (WR-07). Deferral to Phase 5 is not appropriate: Phase 5 success criteria do not cover tab sync or v1 forward-compat.

---

_Verified: 2026-10-03_
_Verifier: Claude (gsd-verifier)_
