# Phase 7: Themes, Accessibility and Polish - Context

**Gathered:** 2026-10-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes the game look soft and polished in every theme, makes it work for screen-reader and keyboard-only players, and gets it ready to link publicly. It covers UI-02, UI-03, UI-04, UI-07, UI-08 and UI-10, and finishes UI-05 by adding the help button. In scope:
- a dark theme with no flash on load
- a colour-blind (high-contrast) palette
- a How-to-play modal and the header help button
- an aria-live announcement after each guess
- a keyboard-only audit with E2E proof
- page metadata: title, description, Open Graph, favicon and `<noscript>`

Reduced motion (UI-09) is already done.

</domain>

<decisions>
## Implementation Decisions

Already locked elsewhere and not re-decided here:
- **SPEC.md §11:**
  - R-UI-1: How-to-play auto-opens on the first visit and can be reopened from the header.
  - R-UI-2: dark mode follows the system on the first visit, with no flash.
  - R-UI-3: there is a colour-blind palette.
  - R-UI-5: aria-live announcements, and labels on tiles and keys.
  - R-UI-7: modals trap focus, close on Esc and return focus. The only exception is the Restore prompt, which can't be dismissed.
- **R-SHARE-2 and Phase 6 D-16:** colour-blind mode uses 🟧🟦. `colourBlind` already exists in the store, defaulting to false, and the share builder already takes the flag. This phase adds the toggle and saves the setting.
- **Phase 4 D-06/D-07:** dialogs use the shared `Modal`, and header buttons go in `.header-actions`. Theme and colour-blind options were reserved for Settings in this phase.
- **Phase 4 D-09:** a reset behaves like a first visit.
- **Phase 5 D-14 and Phase 6 D-03:** the Restore prompt and the streak-break modal win over other dialogs.
- **Layout:** the 320 px two-row header and the 320x500 no-scroll layout checks (`e2e/layout.spec.ts`) must keep passing.

### Themes: dark and colour-blind
- **D-01:** The player chooses **System / Light / Dark**, and the default is **System**.
  - While on System, the page follows `prefers-color-scheme` and updates live when the OS theme changes.
  - Choosing Light or Dark pins that theme.
  - There is no flash of the wrong theme on load (R-UI-2). The theme must be applied before the first paint.
- **D-02:** **The dark theme is soft charcoal:**
  - a warm dark grey background, not pure black
  - muted versions of the sage, butter and grey tiles
  - the same rounded, airy feel as light mode

  Dark versions of every token in `src/styles/tokens.css` (mode accent, danger, focus ring, toasts and modals) are needed, and they must pass axe contrast checks.
- **D-03:** **The colour-blind palette changes colours only:**
  - correct is **orange** and present is **blue**
  - contrast is stronger
  - on-screen keys use the same colours
  - there are no added markers, symbols or patterns

  It must work in both light and dark. Screen readers already get each state from the tile and key labels.
- **D-04:** Both settings go in a new **"Appearance" section at the top of the Settings modal**, above the browser-only note and "Reset my data".
  - Both are saved in the versioned save document and survive a reload.
  - **Reset puts them back to the defaults** (System, colour-blind off), consistent with "reset = first visit".

### How-to-play
- **D-05:** **Content is the basics plus modes plus streaks**, short enough to read in about 20 seconds:
  - the guess rules
  - three small example rows showing correct, present and absent, drawn in the current palette
  - one line on Normal vs Wordubado and on 4/5/6 letters
  - one line on Win Streak and Day Streak with Restores
- **D-06:** **The help button is a "?" icon button placed first in `.header-actions`**, left of Stats and Settings, and styled like them. It finishes UI-05, and it must fit the 320 px header.
- **D-07:** **First visit:** How-to-play opens on load, and the first visit is always Normal 5. The Wordubado popup keeps its own trigger, the first switch to Wordubado, so the two never collide. The Restore prompt can't happen on a first visit.
- **D-08:** **The "How-to-play seen" flag is saved as soon as the modal opens,** like the Wordubado popup flag. Reset clears it.
- **D-09:** **Existing players see it once after the update.** The save migration (v2 → v3) adds the flag as unset, so every current player gets How-to-play auto-opened once.
  - If a Restore prompt or streak-break modal is pending on that load, it wins, and How-to-play opens after it (or on the next load).
  - The exact ordering is Claude's discretion, but it must never stack on top of the blocking prompt.

### Screen-reader announcements
- **D-10:** **After each guess is revealed,** a polite aria-live region reads the word, each letter's result and the tries left. For example: "CRANE: C absent, R present, A correct, N absent, E absent. 4 tries left."
- **D-11:** **The announcement fires when the reveal ends (`finishReveal`), not on submit,** so it never gets ahead of the visual flip. Under reduced motion it is almost immediate anyway.
- **D-12:** **When the game ends,** a short result line is also announced in the live region before the Result modal takes focus, e.g. "You won in 4" or "Out of tries. The word was CRANE". Give Up gets the matching line.
  - It must not double up with the Result modal's own heading or its existing `role="status"`. Each fact is announced from one place, the same rule as Phase 6 D-28.
- **D-13:** **Not announced:** typed or deleted letters, which screen readers often echo already, and Board or mode switches. Invalid-guess toasts keep their existing `role="alert"`/`status` behaviour.

### Keyboard-only play
- **D-14:** **This is an audit with E2E proof, not new features.** Steps:
  - Add a Playwright test that plays a whole game and opens and closes every dialog using only the keyboard: How-to-play, Settings with the theme controls, Stats and Result.
  - Fix whatever it finds: visible focus rings in every theme and palette, tab order and Esc.
  - Run `expectNoA11yViolations` (axe) in light, dark and colour-blind (light and dark).
  - There is no skip link.

### Link preview and metadata
- **D-15:** **The OG image is 1200x630 on the soft cream background:**
  - one row of rounded tiles spelling a word in sage, butter and grey
  - "Unlimited Wordle"
  - the tagline "Endless Wordle in 4, 5 and 6 letters"

  It is made once as an SVG, exported to PNG and committed to `public/`.
- **D-16:** **The favicon is a single rounded sage tile with a white "W"** as an SVG, replacing Vite's default `public/favicon.svg`. Add an `apple-touch-icon` PNG.
- **D-17:** **The absolute URL is hard-coded as `https://wordyday.vercel.app`** in `index.html`, for `og:url` and `og:image`. Preview deploys also point at production, which is fine. If a custom domain arrives, swap the URL then.
- **D-18:** **The `<noscript>` message is short and friendly:** "Unlimited Wordle needs JavaScript to play. Please turn it on and reload." It is centred and styled softly inline, because the CSS bundle may not load without JS.
- **D-19:** The page needs a title, a meta description, the Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`), and `twitter:card` set to `summary_large_image`.

### Claude's Discretion
- **The no-flash mechanism.** One likely approach is a tiny inline script in `index.html`, run before the app loads. It reads the saved theme preference and sets `data-theme` and `data-palette` on `<html>`. It must not throw on missing or corrupt storage.
  - Whether the preference is read from the main versioned save doc or from a small separate key is up to research and the planner.
  - Either way the versioned doc stays the source of truth, and migration rules still apply.
- **Schema.** A v2 → v3 migration adds `theme`, `colourBlind` and `howToPlaySeen`. The field names follow the existing `MIGRATIONS` chain in `src/logic/save.ts` and the hand-written guard style.
- **Two-tab sync for the appearance settings.** For example, a change in one tab applies in the other through the existing `storage` event sync.
- **The control style** for System/Light/Dark (segmented control or radio group) and for the colour-blind switch, with copy in the UI spec.
- **Exact hex values** for the dark and colour-blind palettes, within the soft look and axe contrast.
- **Dark-theme emoji squares in Share** (Phase 6 D-14 left this open). The simplest choice is fine: keep ⬜ for absent.
- **A `theme-color` meta tag** that matches the active theme. Add it if it's cheap.
- **How the OG PNG is produced:** a one-off script, or a hand export. Commit the result.
- **Whether How-to-play is a new `DialogName` (`'help'`)** in the store, and how it interacts with `isInputBlocked`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Rules and requirements
- `SPEC.md` §11 (R-UI-1..7): How-to-play, dark mode with no flash, colour-blind palette, aria-live, modal focus rules
- `SPEC.md` §10 (R-SHARE-2): colour-blind share squares
- `SPEC.md` §8 (R-RESTORE-12): the Restore prompt can't be dismissed
- `.planning/REQUIREMENTS.md`: UI-02, UI-03, UI-04, UI-05 (help-button part), UI-07, UI-08, UI-10
- `.planning/ROADMAP.md`: Phase 7 success criteria 1-5
- `GLOSSARY.md`: terms used in How-to-play copy (Board, Mode, Win Streak, Day Streak, Restore)

### Prior phase decisions
- `.planning/phases/04-six-boards-and-persistence/04-CONTEXT.md`: D-06/D-07 (Settings modal, appearance options reserved for this phase), D-09 (reset = first visit), D-11 (saved popup-seen flag pattern)
- `.planning/phases/05-stats-streaks-and-restore/05-CONTEXT.md`: D-14 (non-dismissable Restore prompt wins)
- `.planning/phases/06-result-screen-share-and-definitions/06-CONTEXT.md`: D-03 (dialog priority), D-14/D-16 (colour-blind share seam), D-28 (announce from one place), D-30 (Result modal focus)
- `.planning/phases/02-playable-normal-game/02-UI-SPEC.md` and the later `*-UI-SPEC.md` files: the existing soft visual language and tokens

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/Modal.tsx`: native `<dialog>` with a focus trap, Esc handling, `data-initial-focus`, `fallbackFocus` and a non-dismissable option. How-to-play builds on it.
- `src/components/SettingsModal.tsx`: the Appearance section goes here.
- `src/components/SettingsButton.tsx` and `StatsButton.tsx`: the icon-button pattern for the "?" help button.
- `src/components/WordubadoInfo.tsx` and `InfoButton.tsx`: an example of an auto-open-once popup with a saved seen flag.
- `src/components/Tile.tsx` and `Keyboard.tsx`: tiles and keys already carry `aria-label`s with their state.
- `src/components/Toast.tsx`: already has `role="status"`/`alert` and an `announce` switch. Reuse the pattern for the guess-result live region.
- `src/logic/share.ts`: already takes `colourBlind`.
- `e2e/axe.ts` `expectNoA11yViolations` and `nonTextContrast`: the axe checks to run in each theme and palette.
- `src/state/copy.ts`: all UI copy lives here.

### Established Patterns
- All colours are CSS custom properties in `src/styles/tokens.css` (`:root`) with a `[data-mode='wordubado']` override. Themes and palettes should follow the same pattern: `[data-theme='dark']` and `[data-palette='colour-blind']` overrides.
- `src/logic/save.ts` has `SAVE_VERSION = 2`, a `MIGRATIONS` chain and a hand-written guard. Every new saved field needs a migration and a guard update.
- `gameStore.ts` has a `DialogName` union (`giveUp | newGame | settings | reset | stats | result`) and `dialog` state. Input is blocked while a dialog is open.
- UI effects fire at `finishReveal` (Phase 5 D-21); the guess announcement hooks in there.
- `prefers-reduced-motion` is already handled in `game.css` and the timing source.

### Integration Points
- `index.html`: meta and OG tags, `<noscript>`, the favicon links, and the pre-paint theme script.
- `public/`: the new `favicon.svg`, the apple-touch-icon and `og-image.png`.
- `src/components/Header.tsx`: the help button in `.header-actions`.
- `src/App.tsx`: mount the How-to-play modal and the live region.
- `src/state/sync.ts`: two-tab sync of the appearance settings.

</code_context>

<specifics>
## Specific Ideas

- Example announcement: "CRANE: C absent, R present, A correct, N absent, E absent. 4 tries left."
- The noscript copy: "Unlimited Wordle needs JavaScript to play. Please turn it on and reload."
- The OG tagline: "Endless Wordle in 4, 5 and 6 letters".
- The production URL is `https://wordyday.vercel.app`. The site name stays "Unlimited Wordle" (never "wordyday" in visible UI, Phase 1 D-16).

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within the phase scope. A skip link was considered and declined, not deferred.

</deferred>

---

*Phase: 07-themes-accessibility-and-polish*
*Context gathered: 2026-10-13*
