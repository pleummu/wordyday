---
phase: 07-themes-accessibility-and-polish
verified: 2026-10-15T00:30:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 7: Themes, Accessibility and Polish Verification Report

**Phase Goal:** The game looks soft and polished in every theme, works for screen-reader and keyboard-only players, and is ready to be linked publicly
**Status:** passed (all roadmap success criteria met; four advisory review warnings noted, none breaks a must-have)
**Re-verification:** No, initial verification

## Observable Truths

| # | Truth (ROADMAP SC) | Status | Evidence |
|---|---|---|---|
| 1 | Dark mode, first visit follows system, no flash; colour-blind palette | VERIFIED | `index.html` pre-paint script sets `data-theme`/`data-palette` from the save or `matchMedia` before paint. `setTheme`/`setColourBlind` exist in the store. Appearance section in `SettingsModal.tsx`. `e2e/theme.spec.ts` and `e2e/a11y-themes.spec.ts` (axe in 4 theme/palette combos) green at the 07-08 gate. |
| 2 | How-to-play auto-opens on first visit, reopenable from header | VERIFIED | `HowToPlayModal.tsx`, `HelpButton.tsx` and `maybeOpenHelp` in the store; `e2e/help.spec.ts` green. |
| 3 | aria-live result announcements; tiles and keys labelled | VERIFIED | `LiveRegion.tsx` is a polite, atomic `role="status"` region fed by `announcement` (`logic/announce.ts`). `Tile.tsx:40` and `Keyboard.tsx:35,57,68` have `aria-label`. Unit tests and `e2e/announce.spec.ts` green. Owner approved the real-screen-reader check on 2026-10-15. |
| 4 | Keyboard-only play; modals trap focus, close on Esc, return focus | VERIFIED | `Modal.tsx` (focus trap, `aria-labelledby`), `usePhysicalKeyboard.ts`. `e2e/keyboard.spec.ts` presses Escape and checks focus return; green. |
| 5 | Share metadata (title, description, OG with absolute image URL, favicon) and noscript | VERIFIED | `index.html` has title, description, og:* tags, an absolute `https://wordyday.vercel.app/og-image.png`, favicon and apple-touch-icon, and a `<noscript>`. `public/` holds `favicon.svg`, `og-image.png` and `apple-touch-icon.png`. `scripts/meta.test.mjs` and `e2e/meta.spec.ts` green. Owner approved the link preview. |

**Score:** 5/5

## Behavioral Spot-Checks

| Check | Command | Result | Status |
|---|---|---|---|
| Unit and component suite | `npx vitest run` | 678 passed | PASS |
| Full gate (lint, format, typecheck, build, check:bundle, Playwright 437 passed / 15 skipped) | not re-run; taken from the 07-08 record | n/a | NOT RE-RUN |

## Requirements Coverage

All six IDs appear in the PLAN frontmatter and in REQUIREMENTS.md (marked Complete, mapped to Phase 7). No orphaned requirements.

| Req | Plans | Status | Evidence |
|---|---|---|---|
| UI-02 | 07-01, 04, 06 (5 mentions) | SATISFIED | Dark theme, system-follow, pre-paint script, save v3 migration |
| UI-03 | 07-06 (4 mentions) | SATISFIED | Colour-blind switch, `data-palette`, axe in the colour-blind combos |
| UI-04 | 07-01, 03 | SATISFIED | How-to-play auto-open and header button |
| UI-07 | 07-05 | SATISFIED | Live region and labels |
| UI-08 | 07-07 | SATISFIED | Keyboard and focus E2E, axe |
| UI-10 | 07-02 | SATISFIED | Metadata, assets and noscript |

## Anti-Patterns

No TBD, FIXME or XXX in `src`, `index.html` or `scripts/make-assets.mjs`.

## Review Warnings Judged Against Must-Haves

None of these breaks a roadmap success criterion, so none is a gap.

- **WR-01 (reset copy omits that games and Restores are erased):** This is a real UX defect. Reset is destructive and the copy under-describes it. The copy follows the 07-06 plan and UI-SPEC, and no success criterion covers it. Recommend a follow-up fix to `src/state/copy.ts` RESET_BODY and the matching `e2e/settings.spec.ts` assertion. Treat it as WARNING for polish, and fix it before heavily promoting the link.
- **WR-02 (How-to-play opens scrolled to the bottom at 320x568):** The modal still opens automatically (SC2 is met), but the first view on small phones hides the heading. It is an onboarding polish issue. Recommend `focus({ preventScroll: true })` in `Modal.tsx`. Not a gap.
- **WR-03 (`color-scheme` stays `light dark` under pinned Light):** Only the UA chrome (scrollbars, form controls) is affected, and the palette tokens are unaffected. SC1 is met. Recommend adding `:root[data-theme='light'] { color-scheme: light }`.
- **WR-04 (appearance two-tab race):** Needs a narrow race between tabs. Appearance is not a must-have. Cosmetic divergence only.

## Human Verification

None outstanding. The owner approved the manual checks on 2026-10-15 (screen reader, iPhone Safari, appearance, assets, noscript, link preview). The link-preview approval is recorded as approved but depends on the production deploy, so confirm the card renders from the live URL once.

## Gaps Summary

No gaps. The phase goal is achieved. Suggested quick-fix follow-ups: WR-01, WR-02, WR-03.

_Verified: 2026-10-15_
_Verifier: Claude (gsd-verifier)_
