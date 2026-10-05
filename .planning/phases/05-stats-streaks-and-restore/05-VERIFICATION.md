---
phase: 05-stats-streaks-and-restore
verified: 2026-10-05T00:00:00Z
status: gaps_found
score: 4/5 roadmap truths verified (SC1 and SC3 carry a partial caveat from CR-01; see gaps)
gaps:
  - truth: "Day Streak goes up at most once per local day, for a day on which a game finished (STRK-02); Restore sets lastActiveDate to yesterday and keeps the number (STRK-07)"
    status: partial
    reason: "CR-01 confirmed in code. PendingRestore.creditDeferred is a boolean; withCredit(s, deferred, today) credits the day the offer is ANSWERED or LAPSES, not the day the game was played. If a game finishes on D, the offer is left unanswered (refresh/close), and answered on D+1 or later, the player gets a credit for a day with no finished game (Restore path: streak +1 with lastActiveDate = answer day; decline path: current=1 on the wrong date; lapse path likewise). The real play day is lost and later missed-day checks count from the wrong date."
    artifacts:
      - path: "src/logic/streaks.ts"
        issue: "withCredit/restore/decline/check/finishDay use the answer-day `today`; creditDeferred has no date"
      - path: "src/logic/streaks.test.ts"
        issue: "Deferred tests only answer on the same day; no D+1 / lapse-days-later case"
    missing:
      - "Store creditDate (string | null) in PendingRestore, credit that date, re-run check after crediting"
      - "Bump SAVE_VERSION to 3 with migration of creditDeferred; update validatePending"
      - "Tests: answer on D+1, lapse on D+5"
human_verification: []
---

# Phase 5: Stats, Streaks and Restore Verification Report

**Phase Goal:** As a player, I want to see accurate Win Streaks for each Board, one global Day Streak protected by up to 3 Restores a month, and full statistics for each mode and length, so that I can track my progress and have a reason to come back every day.
**Verified:** 2026-10-05
**Status:** gaps_found
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Win Streak +1 on win, reset on loss/Give Up/Forfeit; Day Streak +1 at most once per local day when any game finishes | VERIFIED with caveat | Per-Board counters in src/logic/stats.ts, creditDay in streaks.ts refuses when today <= lastActiveDate (once per day). Normal-path credit is correct. Caveat: deferred-credit path (CR-01) can credit a non-play day. |
| 2 | Missed days reset all Win Streaks; blocking Restore prompt when current>0, missed<=4, Restore left; reappears after refresh | VERIFIED | check() in streaks.ts (eligible logic, MAX_MISSED_FOR_RESTORE=4, resetWinStreaks on missed>0); pendingRestore persisted; RestorePrompt.tsx exists; e2e/restore.spec.ts. |
| 3 | Restore keeps number for one Restore; No resets; 3 refill on the 1st, no carry-over | PARTIAL | restore()/decline()/refill implemented and tested for same-day answer. When the offer is answered on a later day than the finishing game, lastActiveDate and credit are wrong (CR-01). |
| 4 | Stats dialog with 4/5/6/All tabs, per mode, played, win rate, streaks, distribution, avg, Day Streak, Restores N/3; zero games safe | VERIFIED | StatsModal.tsx, StatsButton.tsx, StreakChip.tsx, stats.ts exist; StatsModal.test.tsx, e2e/stats.spec.ts; zero-game handling covered by tests. |
| 5 | Missed-day check on open, focus and date change; repeatable; DST- and backwards-clock-safe | VERIFIED | streakWatch.ts wires visibilitychange, focus and midnight timer to checkStreaks; Date.UTC day math; missed===0 returns no-op; backwards clock clamps to 0. (WR-01 caveat below for forward clock.) |

**Score:** 3 fully verified, 2 verified with a partial caveat tied to one defect (CR-01).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit suite | `npx vitest run` | 538 passed (538) | PASS |
| E2E (250) | not re-run by verifier; owner reports green and manual checkpoint approved 2026-10-05 | n/a | accepted from owner |

### Requirements Coverage

All 13 IDs in the phase plans are present in REQUIREMENTS.md, marked Complete and mapped to Phase 5; no orphaned Phase 5 requirements.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| STRK-01 | SATISFIED | Win Streak counters, banner line, stats.ts |
| STRK-02 | PARTIAL | Once-per-day credit correct on the normal path; deferred-credit path credits the answer day (CR-01) |
| STRK-03 | SATISFIED | Date.UTC math, negative clamp, never moves lastActiveDate back (but see WR-01 for future-dated clock) |
| STRK-04 | SATISFIED | streakWatch.ts open/focus/midnight, idempotent check |
| STRK-05 | SATISFIED | resetWinStreaks on any missed day; Restore never revives |
| STRK-06 | SATISFIED | check() eligibility and blocking prompt |
| STRK-07 | PARTIAL | Same-day answer correct; later-day answer after a deferred finish wrong date/credit (CR-01) |
| STRK-08 | SATISFIED | refill() forward-only monthly, counted in month of use |
| STAT-01..04 | SATISFIED | StatsModal, stats.ts, tabs, global footer, zero-safe |
| QA-02 | SATISFIED | 538 unit tests incl. streak/Restore tables, storage round-trip/migration/corrupt |

### Anti-Patterns

No TBD/FIXME/XXX markers in src or e2e. Code review (05-REVIEW.md) findings assessed:

| Finding | Severity here | Impact on requirements |
|---------|---------------|------------------------|
| CR-01 deferred credit on answer day | BLOCKER (gap) | Breaks STRK-02/07 accuracy in a narrow but reproducible path (finish with offer, leave unanswered across midnight). Trigger needs refresh/close without answering the blocking prompt, so it is uncommon, but the phase goal is explicitly "accurate" streaks and the review reproduced a phantom credit. |
| WR-01 future clock freezes streak | Warning | Robustness edge; STRK-03 as written (backwards clock) is met. |
| WR-02 stale tab overwrites/resurrects streak slice | Warning | Multi-tab edge; not in a roadmap SC. |
| WR-03 simultaneous two-tab streak change loses one | Warning | Multi-tab edge. |
| WR-04 Day-streak toast lost on fast Play again | Warning | Cosmetic announcement loss; no data effect. |
| WR-05 Fresh start/Restore dialog can stack and lose focus | Warning | Keyboard/a11y edge; carry to Phase 7. |
| IN-01..07 | Info | Hygiene (IN-06 silent decline when no Restores left is a UX gap). |

### Human Verification

None outstanding; owner approved the manual play-through (05-08 Task 2) on 2026-10-05. Note that the play-through would not exercise CR-01 (requires answering a deferred offer on a later day).

### Gaps Summary

Phase 5 delivers every artifact and nearly all behavior: Win Streaks, Day Streak chip, Statistics (tabs, modes, zero-safe), the monthly Restore state machine with a blocking, refresh-persistent prompt, and the open/focus/midnight check. Unit tests pass (538). One real correctness defect remains: CR-01. The deferred Day Streak credit uses the answer day instead of the play day, which can award a phantom Day Streak day and shift lastActiveDate, undermining STRK-02/STRK-07 accuracy. The fix is small and local (store a credit date, v3 migration, two tests). Recommend closing CR-01 via `/gsd-plan-phase --gaps` before treating the phase as clean; WR-01..WR-05 can be scheduled as follow-ups (WR-05 fits Phase 7 accessibility). If the owner judges the edge acceptable, record an override in this file's frontmatter.

---

_Verified: 2026-10-05_
_Verifier: Claude (gsd-verifier)_
