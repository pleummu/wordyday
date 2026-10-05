# Phase 6: Result Screen, Share and Definitions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md. This log keeps the alternatives that were considered.

**Date:** 2026-10-05
**Phase:** 06-result-screen-share-and-definitions
**Areas discussed:** Result screen form, Definition display, Share text details, Share sheet vs clipboard

---

## Result screen form

| Option | Description | Selected |
|--------|-------------|----------|
| Modal + banner | Result modal after the reveal; closing leaves a slim banner with See result + Play again | ✓ |
| Inline banner only | Grow the existing banner in place; tight at 320x500 | |
| Modal replaces banner | No banner; bare grid + Play again | |

| Auto-open | | Selected |
|--------|-------------|----------|
| Only right after finishing | No auto-open on reload/switch | ✓ |
| Every time a finished Board shows | | |

| Stats shown | | Selected |
|--------|-------------|----------|
| This Board, compact | Played, Win %, Streak, Best + distribution | ✓ |
| Headline numbers only | | |
| Full Stats modal content | | |

| Streak lines | | Selected |
|--------|-------------|----------|
| Modal shows Win Streak; toast stays | Banner streak line removed | ✓ |
| Keep both as today | | |
| Day Streak in modal too | | |

---

## Definition display

| Option | Description | Selected |
|--------|-------------|----------|
| Top 1-2 senses + part of speech | | ✓ |
| First sense only | | |
| Everything, scrollable | | |

| Dual words (slang + common) | | Selected |
|--------|-------------|----------|
| Slang def only | | ✓ |
| Slang + dictionary | | |

| Timeout | | Selected |
|--------|-------------|----------|
| 5 seconds, with Try again | | ✓ |
| 5 seconds, no retry | | |
| 3 seconds | | |

| Crude flag | | Selected |
|--------|-------------|----------|
| No, show normally | | ✓ |
| Small 'crude' tag | | |

---

## Share text details

| Normal header | | Selected |
|--------|-------------|----------|
| "Unlimited Wordle - Normal 5 - 4/6" | | |
| "Unlimited Wordle - 5 letters - 4/6" | | |
| Other: "Wordle" | Clarified: `Wordle 5 - 4/6` (no "Unlimited", no mode name) | ✓ |

**Notes:** The first answer ("Wordle") was ambiguous. It was clarified over two follow-ups: the owner chose `Wordle 5 - 4/6`, and Wordubado keeps `Unlimited Wordle - Wordubado 5 - 4/6`.

| Give Up | | Selected |
|--------|-------------|----------|
| Yes, as X/n like a loss | | ✓ |
| Yes, marked as gave up | | |
| No Share after Give Up | | |

| URL | | Selected |
|--------|-------------|----------|
| Current site origin | | ✓ |
| Hard-coded production URL | | |

| 🟧🟦 before Phase 7 | | Selected |
|--------|-------------|----------|
| Build the switch-ready seam (default false) | | ✓ |
| Pull the colour-blind toggle into Phase 6 | | |

---

## Share sheet vs clipboard

| Sheet when | | Selected |
|--------|-------------|----------|
| Phones/tablets only | | ✓ |
| Whenever the browser supports it | | |

| Cancel | | Selected |
|--------|-------------|----------|
| Nothing | | ✓ |
| Copy as a fallback | | |

| Copy fails | | Selected |
|--------|-------------|----------|
| Show the text to copy by hand | | ✓ |
| Error toast only | | |

---

## Claude's Discretion

- How slang definitions are shipped (lazy chunk shape)
- dictionaryapi.dev fetch details (abort, shape guard, caching, E2E stub)
- Touch-device detection (incl. iPadOS)
- Modal ordering with the Restore prompt, the break modal and the toast
- Focus management, banner/modal copy, where the store state lives

## Deferred Ideas

- Colour-blind toggle and tile palette: Phase 7
