# Phase 4: Six Boards and Persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-02
**Phase:** 04-six-boards-and-persistence
**Areas discussed:** Give Up & New game buttons, Settings screen, Board memory & hints

---

## Give Up & New game buttons

| Option | Description | Selected |
|--------|-------------|----------|
| Small row under the grid | Two quiet text buttons between grid and keyboard; must fit 320x500 | ✓ |
| In the header | Icon buttons next to the switch; header already tight | |
| Behind a ⋯ menu | Tidiest, harder to discover | |

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden until allowed | Appear only with exactly 2 tries left | ✓ |
| Greyed out with a hint | Always visible, disabled, "Available with 2 tries left" | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same as a normal loss | Answer in result banner with Play again; banner says "You gave up" | ✓ |
| Fill the answer into the grid | Flip answer into next row, then banner | |

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror New game | "This counts as a loss. Reveal the answer?" Keep playing / Give up | ✓ |
| You decide | Claude drafts in UI spec | |

**User's choice:** All recommended options.

---

## Settings screen

| Option | Description | Selected |
|--------|-------------|----------|
| Modal dialog | Reuses Phase 3 Modal; same pattern for stats/help later | ✓ |
| Full-screen panel | More room, new pattern | |

| Option | Description | Selected |
|--------|-------------|----------|
| One confirm dialog | Destructive-styled Reset, Cancel / Reset | ✓ |
| Type RESET to confirm | Harder to trigger by accident, heavier | |

| Option | Description | Selected |
|--------|-------------|----------|
| Just those two | Reset + browser-only note | ✓ |
| Also a version/credits line | App version + SCOWL attribution | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh start on Normal 5 | Close Settings, new Normal 5 game, toast "All data reset", like a first visit | ✓ |
| Stay on the current Board | Fresh game on current mode/length | |

**User's choice:** All recommended options.

---

## Board memory & hints

| Option | Description | Selected |
|--------|-------------|----------|
| The last Board they played | Remember last mode + length; first visit Normal 5 | ✓ |
| Always Normal 5 | Predictable, must switch back each visit | |

| Option | Description | Selected |
|--------|-------------|----------|
| Save it | Popup auto-opens once ever; reset clears it | ✓ |
| Keep per session | Shows again each visit | |

| Option | Description | Selected |
|--------|-------------|----------|
| Small dot on in-progress Boards | Dot on 4/5/6 with unfinished game in current mode, SR label | ✓ |
| No hints | Clean header | |

| Option | Description | Selected |
|--------|-------------|----------|
| Start a new game right away | Same as today | ✓ |
| A 'Start' button first | Extra click | |

**User's choice:** All recommended options.

---

## Claude's Discretion

- Storage-trouble feedback (corrupt data, blocked/full storage, another tab changing the Board): offered as a gray area, not selected by the owner.
- Two-tab conflict rule, schema shape, saved finished-game contents, forfeit banner wording, exact placement/spacing.

## Deferred Ideas

- Version/credits line with SCOWL attribution in Settings (Phase 7).
