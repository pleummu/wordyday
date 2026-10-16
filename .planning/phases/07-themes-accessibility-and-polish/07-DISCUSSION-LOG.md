# Phase 7: Themes, Accessibility and Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-13
**Phase:** 07-themes-accessibility-and-polish
**Areas discussed:** Themes (dark + colour-blind), How-to-play modal, Screen-reader announcements, Link preview & favicon

---

## Themes: dark + colour-blind

| Question | Options | Selected |
|----------|---------|----------|
| Theme pick | System/Light/Dark; Simple Dark toggle; Header icon button | System / Light / Dark |
| Dark look | Soft charcoal; Deep navy; You decide | Soft charcoal |
| Colour-blind | Orange/blue colours only; Colours + small markers | Orange/blue colours only |
| Placement | Top of Settings (Reset restores defaults); Settings but Reset keeps them | Top of Settings |

## How-to-play modal

| Question | Options | Selected |
|----------|---------|----------|
| Content | Basics + modes + streaks; Basics only; Full guide | Basics + modes + streaks |
| Help button | First in header-actions; Left side of header | First in header-actions |
| First visit | How-to-play first; You decide | How-to-play first |
| Seen flag | Once shown, saved; Only when closed | Once shown, saved |
| Existing players | No, new players only; Yes, once for everyone | **Yes, once for everyone** (not the recommended option) |

## Screen-reader announcements

| Question | Options | Selected |
|----------|---------|----------|
| Guess | Word + per-letter result; Compact summary; Per-letter, no tries count | Word + per-letter result |
| Timing | After the reveal ends; Right on submit | After the reveal ends |
| Extras (multi) | Typed letters; Win/loss line; Board switch | Win/loss line only |
| Keyboard scope | Audit + E2E proof; Add a skip link too | Audit + E2E proof |

## Link preview & favicon

| Question | Options | Selected |
|----------|---------|----------|
| OG image | Tile row + title; Title text only; You decide | Tile row + title |
| Favicon | Single sage tile with W; 2x2 mini grid | Single sage tile with W |
| URL | Hard-coded https://wordyday.vercel.app; Build-time env var | Hard-coded |
| Noscript | Short, friendly; You decide | Short, friendly |

## Claude's Discretion

- No-flash mechanism and where the pre-paint script reads the theme from
- v2 → v3 schema field names, two-tab sync of appearance settings
- Control styles, exact palette hex values, dark-theme share squares, theme-color meta
- OG PNG production method; whether How-to-play is a new DialogName

## Deferred Ideas

None.
