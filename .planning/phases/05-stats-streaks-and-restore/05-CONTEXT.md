# Phase 5: Stats, Streaks and Restore - Context

**Gathered:** 2026-10-04
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase covers:
- Per-Board Win Streaks.
- One global Day Streak, with the monthly Restore state machine and its blocking prompt.
- The missed-day check on open, on focus and on date change.
- A Stats modal with Normal/Wordubado and 4/5/6/All views.
- A Stats button and a small Day Streak chip in the header.
- A v1 → v2 save migration that adds the streak, Restore and stats fields.
- The unit tests that complete QA-02.

The full result screen, definitions and Share are not in this phase; they belong to Phase 6. Themes and the how-to-play modal belong to Phase 7.

</domain>

<decisions>
## Implementation Decisions

Already locked elsewhere and not re-decided here:
- **SPEC.md §7 (R-WIN-1..3, R-DAY-1..4):**
  - Win Streak is per Board.
  - Day Streak goes up at most once per local day, on any finish: win, loss, Give Up or Forfeit.
  - The missed-day formula is `missed = max(0, days(today) - days(lastActiveDate) - 1)`, with days taken from UTC parts.
- **SPEC.md §8:**
  - The Restore state machine: `(state, event, today) -> state`, events E1-E5, and R-RESTORE-1..13.
  - The persisted names: `dayStreak { current, longest, lastActiveDate }`, `restores { month, used }`, `pendingRestore`, and per-Board `winStreak`.
  - The edge-case table EC-01..EC-44. Unit tests cite these IDs in their titles.
  - The prompt text in R-RESTORE-13 is locked: `Your {streak}-day streak broke. Restore it? ({restoresLeft} left this month)`.
- **SPEC.md §8 open questions 1-3 keep their stated defaults.** The owner confirmed open question 1 (EC-40): record the Board result now, defer the Day Streak credit until the prompt is answered, then apply +1.
- **SPEC.md §9 (R-STAT-1..5):** the stats fields, separate stats per Mode, the All tab without Win Streaks, global Day Streak and Restores, and no NaN.
- **Phase 4 decisions:**
  - D-06: dialogs use the shared `Modal`, and header buttons go in `.header-actions`.
  - Phase 3 D-14: the stats button counts toward UI-05.
  - Phase 4 D-09: a reset behaves like a first visit. It now also clears streaks, Restores and stats (R-RESTORE-11).

### Stats screen
- **D-01:** The Stats modal has a **Normal | Wordubado segmented toggle** on top and **4 / 5 / 6 / All tabs** below it. One mode is shown at a time; the two modes are never mixed. The headline row shows Played, Win %, Current Win Streak and Best Win Streak; the All tab leaves out the streak cells. Below it: a guess distribution chart and "Avg guesses". At the bottom, a global footer shows "Day streak N · Best M" and "Restores left: N/3".
- **D-02:** Stats **opens on the current Board** (the active mode and length tab).
- **D-03:** The All tab's guess distribution is **one combined chart with rows 1-7**: wins from all lengths added together. Only 6-letter games can fill row 7.
- **D-04:** The distribution **highlights the bar for the most recent finished game on that Board when it was a win**. Nothing is highlighted after a loss. On the All tab, highlight the row of the latest win in that mode, or nothing (Claude's discretion).
- **D-05:** **Empty state:** numbers show 0, Win % and Avg guesses show "—" (never 0%, NaN or Infinity), and the chart area shows a short friendly line such as "No wins yet. Go play one!" instead of empty bars. Final copy goes in the UI spec.
- **D-06:** **The Stats button** is a bar-chart icon button in `.header-actions`, **left of the Settings gear**, styled like `SettingsButton`.
- **D-07:** **The "Gave up" count:**
  - Each tab, including All, shows one small extra number: **"Gave up: N"**.
  - It **combines Give Ups and Forfeits** (a Forfeit is already saved as a gave-up snapshot).
  - Both still count as played games and losses.
  - The guess distribution and the average include wins only.

### Streak visibility
- **D-08:** A **Day Streak chip in the header** (a small sun/flame icon with the count) appears **only when the Day Streak is above 0**. It must fit the 320 px two-row header (the `e2e/layout.spec.ts` checks).
- **D-09:** The chip is a **button that opens Stats**. Its accessible name is like "Day streak 5, open statistics".
- **D-10:** The chip looks **dimmed or muted until a game has been finished today** (`lastActiveDate !== today`), then shows at full strength. It is a gentle nudge, not an alarm.
- **D-11:** A **toast when the Day Streak goes up** (first finished game of the day), e.g. "Day streak: 6". Win Streak changes get no toast.
- **D-12:** The existing result **banner gets one small Win Streak line**: e.g. "Win streak: 4" after a win, and a short reset line after a loss, Give Up or Forfeit. Phase 6's result screen may absorb this later.

### Restore prompt and breaks
- **D-13:** The blocking Restore prompt uses the locked R-RESTORE-13 text **only** (no extra Win Streak note), with buttons **"Restore"** (primary) and **"No"**.
- **D-14:** Per R-RESTORE-12, the prompt cannot be dismissed: Esc and backdrop clicks do nothing. The current `Modal` always closes on Esc and backdrop clicks, so it needs a non-dismissable option. **The game loads normally behind the dimmed backdrop**, with input blocked, so answering returns the player straight to play.
- **D-15:** After choosing **Restore**, show a short toast: "Streak restored. N left this month." (N is the count after use.)
- **D-16:** A **"streak ended" modal** appears **only when a Day Streak above 0 is lost without the player choosing it**. This covers:
  - more than 4 missed days
  - no Restores left
  - the auto-decline when the gap grew while the prompt was pending (EC-12)

  Details:
  - The copy is **short, with no reason given**, e.g. "Your streak ended. Start a new one today!", with one OK button.
  - It can be dismissed (OK, Esc, backdrop).
  - It shows **once per break**, not again after a refresh. This needs a small persisted "shown" marker or an equivalent.
  - Choosing "No" in the prompt does **not** show this modal.
- **D-17:** **Losing only Win Streaks** (a missed day with Day Streak 0, or Win Streaks reset alongside a Restore prompt) is **silent**. The numbers just show 0 in Stats and the banner.

### Saved data and stats
- **D-18:** **v1 → v2 migration starts all streaks and stats at zero.** Existing Boards (in-progress and finished games, `last`, `wordubadoInfoSeen`) are kept unchanged. The finished games already saved are not backfilled into stats, because v1 holds only the latest game per Board.
- **D-19:** Stats are stored as **running counters per Board**, not a game history. A Board's stats are: played, wins, gave-up count, distribution, current/best Win Streak, and the last result for the D-04 highlight. The All tab is summed from the three Boards of a mode.

### Carried-over fix (must land in this phase)
- **D-20:** **Phase 4 WR-02** (`04-REVIEW.md`): `onGameFinished` can fire twice for one game when two tabs finish it at the same time. Streaks and stats hang off this seam, so it **must be made idempotent by `(boardKey, gameId)`** before stats and streaks are wired to it. Add a two-tab test where both tabs finish the same game before the sync arrives. Streak and stats fields also need a sane two-tab merge rule (Claude's discretion; it must never double-count).

### Claude's Discretion
- Exact v2 schema field names and placement (per-Board `stats` vs a top-level `stats` map), the shape of the "break modal shown" marker, and the migration function. These follow SPEC §8 names and the existing `MIGRATIONS` chain in `src/logic/save.ts`.
- How the Restore state machine is split: pure `logic/streaks.ts` with an injected `today`, plus store actions. Wiring the CHECK on open, `visibilitychange`/focus and date change uses a StrictMode-safe effect with cleanup. Date-change detection could be a check on focus plus a timer to the next local midnight.
- Two-tab merge for streak/Restore/stats state, including closing the prompt in other tabs when it is answered in one.
- How the pending prompt interacts with an in-progress reveal or the other dialogs (the prompt wins; other dialogs close or wait).
- Whether to also address the related Phase 4 review items that touch this area (WR-03 skip invalid Boards, IN-01 dead `migrate`) while adding the v2 migration. Do so only if cheap.
- The icon choice (sun vs flame), dimmed styling, the bar-chart icon, and the exact copy for toasts, the empty state and the break modal. These go in the Phase 5 UI spec.
- The All-tab highlight rule (D-04).
- Coverage of QA-02 needs:
  - table-driven EC-01..EC-44 tests, including the TZ matrix via `process.env.TZ` or injected date parts
  - stats maths with zero games
  - checks that the existing scoring, 75/25, forfeit and storage tests are complete
  - the migration v1 → v2

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Game rules and terms
- `SPEC.md` §7 "Streaks": R-WIN-1..3, R-DAY-1..4.
- `SPEC.md` §8 "Restore state machine": persisted state, derived values, states, events, R-RESTORE-1..13, worked example, transition diagram, **edge-case table EC-01..EC-44** (the test table), and open questions 1-3 (defaults kept).
- `SPEC.md` §9 "Statistics": R-STAT-1..5.
- `SPEC.md` §6: R-FORFEIT rules (a Forfeit counts as a loss).
- `SPEC.md` R-DATE-1..3 (date handling, injected `today`). Find these with a grep in SPEC.md.
- `GLOSSARY.md`: Win Streak, Day Streak, Missed Day, Restore, Forfeit, Give Up. Use these terms exactly.
- `.planning/REQUIREMENTS.md`: STRK-01..08, STAT-01..04, QA-02.

### Prior phase decisions and design
- `.planning/phases/04-six-boards-and-persistence/04-CONTEXT.md`: D-06 (modal pattern, header actions), D-09 (reset as a first visit), and the schema notes on what Phase 5 adds.
- `.planning/phases/04-six-boards-and-persistence/04-UI-SPEC.md`: Settings modal, banner and toast visuals to extend.
- `.planning/phases/03-wordubado-mode-and-slang/03-UI-SPEC.md`: header two-row layout, Modal visuals, Wordubado accent.
- `.planning/phases/02-playable-normal-game/02-UI-SPEC.md`: base tokens, banner and toast.

### Open review findings
- `.planning/phases/04-six-boards-and-persistence/04-REVIEW.md`: **WR-02 (must fix, D-20)**. Related, optional: WR-03 (one bad Board discards the document) and IN-01 (`persist` migrate dead/unvalidated).

### Project constraints
- `CLAUDE.md` "Pitfalls": the date handling rules (`YYYY-MM-DD` local strings, `Date.UTC` part differences, `new Date()` only at the edge, tests for DST and month boundaries), the `visibilitychange` listener wired once with cleanup, StrictMode double effects (do finishes in store actions, not effects), and `vi.useFakeTimers()` + `vi.setSystemTime()`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/Modal.tsx`: shared native `<dialog>`. Props: `open`, `onClose`, `titleId`, `bodyId`, `fallbackFocus`. It has **no non-dismissable mode yet**; add one for the Restore prompt (D-14).
- `src/components/SettingsButton.tsx` / `SettingsModal.tsx`: the pattern for the Stats button and the Stats modal.
- `src/components/Header.tsx`: `.header-actions` slot (currently only `SettingsButton`); this is where the Stats button and Day Streak chip go.
- `src/components/Banner.tsx` + `src/state/copy.ts`: banner and copy constants; add the Win Streak line (D-12) and the new copy.
- `src/components/Toast.tsx` and the store's `toast` field (`{ id, text, kind }`): for the Day Streak, Restore and break messages.
- `src/test/stubDialog.ts`, `src/test/storageDoubles.ts`: test helpers for dialogs and storage.

### Established Patterns
- **Saved data:** `src/logic/save.ts` holds `SAVE_VERSION = 1`, `SaveDoc`, `emptySave()`, `validateSave`, the `MIGRATIONS` map and `migrateSave(state, from, to, steps)`. Phase 5 bumps it to v2 with a migration step. A comment there already reserves `dayStreak`, `restores`, `pendingRestore` and `winStreak`.
- **Store:** `createGameStore(deps)` in `src/state/gameStore.ts` with injected deps (rng, timers, pools, storage). Add an injected clock/`today` dep for streak logic. Dialogs use a single `dialog: DialogName | null` field. `isInputBlocked = dialog !== null || infoOpen` and the keyboard guards respect it, so the Restore prompt can be a new `DialogName`.
- **Finish seam:** an `onGameFinished(boardKey, outcome)` dependency fires once per finish (outcomes `won` / `lost` / `gave-up`; a Forfeit is stored as `gave-up`). This is where FINISH (E4) hooks in, after the WR-02 idempotency fix.
- **Two-tab sync:** `src/state/sync.ts` uses one `storage` listener. Merging is per Board by game id (`pickGame`), and `resetFloor` handles resets.
- **Copy:** all UI strings live in `src/state/copy.ts`.

### Integration Points
- New pure module, e.g. `src/logic/streaks.ts` (state machine + missed-day maths), and `src/logic/stats.ts` (derive the tab view, zero-safe).
- The store gets new actions: `checkStreaks(today)`, `restore()`, `declineRestore()`, `openStats()`, `dismissBreak()`. `resetAll` is extended per R-RESTORE-11.
- `App.tsx` mounts the Stats modal, the Restore prompt and the break modal, and wires the CHECK listeners once.
- The `e2e/layout.spec.ts` 320x500 checks constrain the new header items.

</code_context>

<specifics>
## Specific Ideas

- The Stats modal follows the owner-selected preview: the segmented mode toggle, the length tabs with the current tab marked, a stat row, horizontal bars with counts, "Avg guesses", then a divider and the global Day Streak and Restores footer.
- The header preview: `Unlimited Wordle   ☀ 5  ▁▃▅  ⚙`. The chip sits before the stats and settings icons.
- The tone stays soft and minimal, per the project design constraint. The break modal is short and upbeat, not punitive.

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within the phase scope. The full result screen, with stats on it, stays in Phase 6.

</deferred>

---

*Phase: 05-stats-streaks-and-restore*
*Context gathered: 2026-10-04*
