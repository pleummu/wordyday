# Phase 5: Stats, Streaks and Restore - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log keeps the alternatives that were considered.

**Date:** 2026-10-04
**Phase:** 05-stats-streaks-and-restore
**Areas discussed:** Stats screen layout, Streak visibility, Restore prompt & breaks, Existing saves & stats data

---

## Stats screen layout

| Option | Description | Selected |
|--------|-------------|----------|
| Mode toggle + length tabs | Normal/Wordubado segmented toggle, 4/5/6/All tabs below | ✓ |
| Eight flat tabs | N4 N5 N6 NAll W4 W5 W6 WAll | |
| Two columns side by side | Normal and Wordubado next to each other | |

| Default tab | | |
|---|---|---|
| The current Board | | ✓ |
| Last tab viewed | | |
| Always All | | |

| All-tab distribution | | |
|---|---|---|
| Rows 1-7 combined | | ✓ |
| No distribution on All | | |

| Highlight | | |
|---|---|---|
| Last game's row, if it was a win | | ✓ |
| No highlight | | |

| Empty state | | |
|---|---|---|
| Zeros + friendly line | | ✓ |
| Just zeros | | |

| Stats button | | |
|---|---|---|
| Header actions, left of Settings | | ✓ |
| Also in result banner | | |

---

## Streak visibility

| Option | Selected |
|--------|----------|
| Day Streak: small count in header | ✓ |
| Day Streak: Stats only | |
| Feedback: toast for Day Streak only | ✓ |
| Feedback: no toasts / toasts for both | |
| Banner: one small Win Streak line now | ✓ |
| Banner: leave to Phase 6 | |
| Chip tap: opens Stats | ✓ |
| Chip: display only | |
| At risk: dimmed until today's game | ✓ |
| At risk: always the same | |

---

## Restore prompt & breaks

| Question | Options | Selected |
|----------|---------|----------|
| Button labels | "Restore"/"Let it go", "Restore"/"No", "Use a Restore"/"Start over" | "Restore" / "No" |
| Win Streak note in prompt | Small second line / Locked text only | Locked text only |
| Silent break feedback | Gentle toast / Small dismissable modal / Nothing | Small dismissable modal |
| When break modal appears | Anything lost / Day Streak loss only | Day Streak loss only |
| Break modal copy | What + why with OK / Short, no reason | Short, no reason |
| Auto-decline (EC-12) | Same modal / Silent | Same modal |
| Behind the prompt | Game dimmed / Nothing loaded | Game dimmed |
| After Restore | Short toast / Nothing | Short toast |

---

## Existing saves & stats data

| Question | Options | Selected |
|----------|---------|----------|
| v1 → v2 migration | Start at zero / Count saved finished games | Start at zero |
| Give Up / Forfeit in stats | Plain losses / Losses + "Gave up" count | Losses + "Gave up" count |
| EC-40 default | Keep SPEC default / Change it | Keep SPEC default |
| Gave up includes Forfeits | Combined / Separate | Combined |
| Gave up shown on | All tabs incl. All / Only 4/5/6 | All tabs incl. All |

---

## Claude's Discretion

- v2 schema field names and placement, the "break shown" marker, and the migration function
- How the state machine is split (pure logic vs store), and how CHECK is wired (focus, visibility, midnight)
- Two-tab merge for streak/stats state; closing the prompt in other tabs
- How the prompt interacts with reveals and other dialogs
- Optional Phase 4 review items WR-03 / IN-01
- Icons, styling and copy (in the UI spec); the All-tab highlight rule
- The breakdown of QA-02 test coverage

## Deferred Ideas

None.
