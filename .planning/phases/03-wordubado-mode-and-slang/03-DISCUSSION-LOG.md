# Phase 3: Wordubado Mode and Slang - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log preserves the alternatives considered.

**Date:** 2026-10-02
**Phase:** 03-wordubado-mode-and-slang
**Areas discussed:** Slang review process, Mode switching mid-game, Header and mode toggle, Wordubado (i) popup

---

## Slang review process

| Option | Description | Selected |
|--------|-------------|----------|
| Cut list | Reply with only the words to cut; the rest become reviewed | ✓ |
| Mark keep/cut in sheet | Owner fills the keep/cut column | |
| Claude pre-cuts first | Claude trims and tightens before owner review | |

| Option | Description | Selected |
|--------|-------------|----------|
| Count as slang | Slang words that are also common words stay slang | ✓ |
| Drop from slang | Keep slang.json to slang-only words | |

| Option | Description | Selected |
|--------|-------------|----------|
| Decide one by one | Blocklist hits and crude words reviewed individually | |
| Cut all blocklist hits | Auto-cut filter matches; owner reviews other crude words | ✓ |
| Cut all crude + hits | No crude words at all | |

| Option | Description | Selected |
|--------|-------------|----------|
| Early, blocking | First plan pauses for the cut list | ✓ |
| At the end | Review just before shipping | |

| Option | Description | Selected |
|--------|-------------|----------|
| Normal answer pool | 25% common share uses the reviewed Normal list | ✓ |
| Easier subset | english/10 only | |

---

## Mode switching mid-game

| Option | Description | Selected |
|--------|-------------|----------|
| Start new game silently | Same as length switching today | |
| Ask to confirm first | Confirm before ending the game | ✓ |
| Lock toggle mid-game | Disabled until game over | |

| Option | Description | Selected |
|--------|-------------|----------|
| Normal | Default mode on first visit | ✓ |
| Wordubado | Lead with the twist | |

| Option | Description | Selected |
|--------|-------------|----------|
| Wait for Phase 4 | No persistence of mode/length yet | ✓ |
| Remember now | Unversioned localStorage key now | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, both | Confirm also applies to length switches | ✓ |
| Mode only | Length keeps current behaviour | |

| Option | Description | Selected |
|--------|-------------|----------|
| After 1+ guess | Prompt only when a guess has been submitted | ✓ |
| Any typing | Even half-typed rows prompt | |

---

## Header and mode toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented pill | [ Normal \| Wordubado ] | |
| Single switch | "Wordubado ( o)" beside the length picker | ✓ |
| Title acts as toggle | Tap title to flip | |

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden until built | No dead buttons | ✓ |
| Visible, disabled | Greyed icons | |
| Visible, 'coming soon' | Toast on tap | |

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle accent | Mode-specific accent, same tiles | ✓ |
| Identical | Only the switch shows mode | |
| Distinct theme | Different palette | |

| Option | Description | Selected |
|--------|-------------|----------|
| Split UI-05 | Buttons count when their screens land; reword criterion 1 | ✓ |
| Show them disabled | Meet UI-05 fully now | |

| Option | Description | Selected |
|--------|-------------|----------|
| 'Wordubado' + switch | Off = Normal, on = Wordubado | ✓ |
| Current mode name | Label changes with state | |

**Notes:** The owner chose "hidden until built" for the header icons, which conflicts with UI-05 / ROADMAP criterion 1. Resolved by splitting UI-05 across phases.

---

## Wordubado (i) popup

| Option | Description | Selected |
|--------|-------------|----------|
| Tap + first switch | Auto-open on first switch, plus (i) | ✓ |
| Only when tapped | Never auto-opens | |

| Option | Description | Selected |
|--------|-------------|----------|
| Next to the switch | Always visible | ✓ |
| Only in Wordubado | Appears when the mode is on | |

| Option | Description | Selected |
|--------|-------------|----------|
| Short and playful | 2-3 lines plus the crude note | ✓ |
| Detailed | Also explains 75/25 and Normal guesses | |

---

## Claude's Discretion

- Slang data delivery (field in the per-length word chunk vs a separate chunk)
- Store shape for mode
- 75/25 draw mechanics and the 10,000-draw seeded test
- E2E hook for Wordubado answers (possible WR-01 fix)
- Dialog implementation for the confirm and popup
- Accent colour, switch styling and popup copy (via UI spec)

## Deferred Ideas

- Phase 2 review warnings WR-02, WR-03, WR-04 (WR-03 before Phase 4)
- Persisting mode/length and the popup-seen flag (Phase 4)
- Slang definitions on screen (Phase 6)
