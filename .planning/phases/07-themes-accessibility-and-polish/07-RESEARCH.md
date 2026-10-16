# Phase 7: Themes, Accessibility and Polish - Research

**Researched:** 2026-10-13
**Domain:** CSS theming, pre-paint script, versioned-save migration, ARIA live regions, Playwright keyboard/axe E2E, static link-preview assets
**Confidence:** HIGH for codebase integration (read directly); MEDIUM for screen-reader behaviour (not testable here); hex values are starting points that must be tuned against axe.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
D-01 System/Light/Dark, default System, live-follows `prefers-color-scheme` while on System, no flash (theme applied before first paint).
D-02 Dark = soft charcoal (warm dark grey, not pure black), muted sage/butter/grey tiles, dark version of every token in `tokens.css`, must pass axe contrast.
D-03 Colour-blind palette changes colours only: correct = orange, present = blue, stronger contrast, on-screen keys use the same colours, no markers/symbols/patterns; works in light and dark.
D-04 New "Appearance" section at the TOP of Settings modal, above the browser-only note and "Reset my data". Both settings saved in the versioned doc; Reset restores defaults (System, colour-blind off).
D-05 How-to-play content: guess rules, three small example rows (correct/present/absent in the current palette), one line Normal vs Wordubado and 4/5/6 letters, one line Win Streak + Day Streak with Restores. About 20 seconds to read.
D-06 Help button = "?" icon button, FIRST in `.header-actions`, styled like Stats/Settings, must fit 320 px header.
D-07 First visit: How-to-play opens on load; first visit is always Normal 5; Wordubado popup keeps its own trigger.
D-08 "How-to-play seen" flag saved as soon as the modal opens; Reset clears it.
D-09 v2 -> v3 migration adds the flag unset, so existing players see it once. If Restore prompt or streak-break modal is pending on that load it wins; How-to-play opens after (or next load). Never stack on the blocking prompt.
D-10 Polite aria-live after each guess: word, each letter result, tries left. e.g. "CRANE: C absent, R present, A correct, N absent, E absent. 4 tries left."
D-11 Fires at `finishReveal`, not on submit.
D-12 On game end a short result line ("You won in 4" / "Out of tries. The word was CRANE"; Give Up matching) is announced in the live region before Result modal takes focus; no double-up with Result modal heading or its `role="status"`; each fact announced from one place.
D-13 Not announced: typed/deleted letters, Board/mode switches. Invalid-guess toasts keep `role="alert"`/`status`.
D-14 Keyboard audit with E2E proof: Playwright test plays a whole game and opens/closes How-to-play, Settings (theme controls), Stats, Result using only the keyboard; fix focus rings in every theme/palette, tab order, Esc; run `expectNoA11yViolations` in light, dark, colour-blind (light and dark). No skip link.
D-15 OG image 1200x630, soft cream background, one row of rounded tiles spelling a word (sage/butter/grey), "Unlimited Wordle", tagline "Endless Wordle in 4, 5 and 6 letters"; SVG source exported to PNG, committed to `public/`.
D-16 Favicon = single rounded sage tile with white "W" as SVG replacing Vite default `public/favicon.svg`; add `apple-touch-icon` PNG.
D-17 Hard-coded absolute URL `https://wordyday.vercel.app` in `index.html` for `og:url` and `og:image`.
D-18 `<noscript>`: "Unlimited Wordle needs JavaScript to play. Please turn it on and reload." Centred, softly styled inline.
D-19 Title, meta description, `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `twitter:card=summary_large_image`.
Also locked elsewhere: modals use shared `Modal`; header buttons in `.header-actions`; Restore prompt/streak-break win over other dialogs; 320 px two-row header and 320x500 no-scroll layout checks must keep passing; reduced motion (UI-09) already done.

### Claude's Discretion
No-flash mechanism (and whether to read main doc or a separate key); schema field names within the MIGRATIONS chain; two-tab sync for appearance; control style for System/Light/Dark and colour-blind switch; exact hex values; dark-theme share squares (keep ⬜); `theme-color` meta if cheap; how OG PNG is produced; whether How-to-play is a new `DialogName` ('help') and how it interacts with `isInputBlocked`.

### Deferred Ideas (OUT OF SCOPE)
None. (Skip link considered and declined.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-02 | Dark mode, follows system first visit, no flash | Inline pre-paint script, `[data-theme]` tokens, `startAppearance` live follow |
| UI-03 | Colour-blind palette | `[data-palette='colour-blind']` token overrides incl. dark combo |
| UI-04 | How-to-play auto on first visit, reopenable | `'help'` DialogName, `howToPlaySeen`, `maybeOpenHelp`, header "?" |
| UI-05 (help button part) | Help button in header | Reuse settings-button class pair; 320 px risk |
| UI-07 | aria-live guess result + labels | Persistent live region fed from `finishReveal`/`giveUp` |
| UI-08 | Keyboard-only play, focus trap, Esc, focus return | Existing Modal already does it; E2E proof + trap gotcha (buttons only) |
| UI-10 | Title/description/OG/favicon/noscript | index.html + `scripts/make-assets.mjs` using installed Chromium |
</phase_requirements>

## Summary

Almost everything needed already exists. Colours are already 100% token-driven (`game.css` has only one literal colour, the dialog backdrop `rgba(43,45,51,.32)`), so dark and colour-blind are token overrides plus one small tokenisation. The save layer has a clean MIGRATIONS chain, a lenient hand-written validator and a documented merge path in `applyExternal`; the new fields (`theme`, `colourBlind`, `howToPlaySeen`) mirror `wordubadoInfoSeen`. `Modal` already traps focus, handles Esc and returns focus, so UI-08 is mainly E2E proof plus focus-ring checks. No new dependencies are needed: the OG PNG and apple-touch-icon come from the Chromium already in the Playwright cache, driven by a one-off script. [VERIFIED: codebase read]

The two non-obvious hazards: (1) auto-opening How-to-play on a first visit will break nearly every existing E2E test (all start with empty storage), so a test-only skip is needed; (2) `Modal`'s Tab trap only collects `button, textarea`, so any new control inside a modal (theme picker, colour-blind switch) MUST be a `<button>` (role=radio / role=switch), never a native `<input>`.

**Primary recommendation:** single source of truth = the existing versioned doc `unlimited-wordle`; the inline head script reads `JSON.parse(localStorage).state.{theme,colourBlind}` inside try/catch and sets `data-theme` (resolved light|dark) and `data-palette`; the app re-applies from the store via a boot-time `startAppearance(store)` (outside React, like `startTabSync`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary | Rationale |
|------------|-------------|-----------|-----------|
| Pre-paint theme | Browser (inline script in static HTML) | CDN/static | Must run before CSS paints; static site, no SSR |
| Theme/palette tokens | Browser CSS | — | Custom property overrides on `<html>` attrs |
| Preference persistence | Browser localStorage (versioned doc) | — | Project constraint: localStorage only |
| Live region / labels | Browser (React) | — | State from store at `finishReveal` |
| Link preview assets | CDN/static (`public/`) | — | Served as-is by Vercel |
| Cross-tab appearance sync | Browser (`storage` event) | — | Existing `sync.ts` |

## Standard Stack

No new packages. Existing: React 19, Zustand 5 (`persist`), Vitest, Playwright 1.63 + `@axe-core/playwright` 4.13.0, jsdom. [VERIFIED: package.json, tree]

### Package Legitimacy Audit
No external packages are installed in this phase. slopcheck not run (nothing to check). Packages removed: none. Flagged: none.

**Rejected:** `sharp`/`@resvg/resvg-js` for PNG export (not installed, new dependency; Playwright Chromium does it with zero deps). [VERIFIED: `node_modules` has neither]

## Architecture Patterns

### Data flow
```
index.html <head>
  inline script: localStorage -> JSON -> state.theme/colourBlind (try/catch)
        |  sets <html data-theme=light|dark data-palette=... > + <meta theme-color>
        v
CSS (tokens.css) paints with correct tokens  <- no flash
        v
main.tsx boot: resume(); checkStreaks(); startStreakWatch; startTabSync;
               startAppearance(store)   <- subscribe theme/colourBlind -> apply
                                           + matchMedia('(prefers-color-scheme: dark)') listener while theme==='system'
               maybeOpenHelp()          <- after checkStreaks (sync) so pending prompt is known
Settings "Appearance" buttons -> store.setTheme / setColourBlind -> persist write -> other tabs' `storage` event -> applyExternal adopts -> startAppearance re-applies
Guess submit -> reveal -> finishReveal -> set({announcement:{id,text}}) -> <LiveRegion/> (persistent, visually-hidden, role=status)
```

### Recommended files
```
index.html                         meta, OG, noscript, icons, inline theme script
public/favicon.svg                 (replace) sage tile + white W
public/apple-touch-icon.png        180x180
public/og-image.png                1200x630
scripts/make-assets.mjs            one-off: playwright chromium screenshots of inline SVG/HTML -> PNG (commit output)
src/state/appearance.ts            applyAppearance(theme,cb,matchMedia), startAppearance(store)
src/logic/announce.ts              pure: guessAnnouncement(word,states,triesLeft), resultAnnouncement(...)
src/components/LiveRegion.tsx, HowToPlayModal.tsx, HelpButton.tsx, AppearanceSection (inside SettingsModal)
src/styles/tokens.css              + [data-theme='dark'], [data-palette='colour-blind'], combined selector
```

### Pattern 1: No-flash inline script (recommended)
Plain classic `<script>` (no `type="module"`) in `<head>`, BEFORE the app stylesheet. Vite leaves non-module inline scripts untouched in `index.html`. [ASSUMED: Vite behaviour for inline classic scripts; verify in `dist/index.html` after build]
```html
<script>
  (function () {
    var t = 'system', cb = false
    try {
      var s = JSON.parse(localStorage.getItem('unlimited-wordle')).state
      if (s.theme === 'light' || s.theme === 'dark') t = s.theme
      cb = s.colourBlind === true
    } catch (e) {}
    var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    var r = document.documentElement
    r.dataset.theme = dark ? 'dark' : 'light'
    if (cb) r.dataset.palette = 'colour-blind'
  })()
</script>
```
- The try/catch covers blocked storage (`localStorage` access throws), missing key (`JSON.parse(null)` -> `null.state` TypeError, caught), corrupt JSON, wrong shapes.
- Reads the main doc (not a second key): no duplicated source of truth, no extra migration/reset/sync paths. An unmigrated v2 doc has no `theme` -> System, which is correct. The validator on the React side remains the authority; the script is lenient and may disagree only transiently.
- CSP: the repo has no `vercel.json` and no CSP header, so inline scripts are fine. If a CSP is added later it needs a `script-src 'sha256-...'` hash for this exact script. Record this as a comment in index.html. [VERIFIED: no vercel.json in `git ls-files`]
- Add `<meta name="color-scheme" content="light dark">` and `:root[data-theme='dark'] { color-scheme: dark }` so native scrollbars/form chrome match.
- `theme-color`: set the meta's `content` in both the inline script and `applyAppearance` from the bg token value (cheap; do it).

### Pattern 2: Tokens
`tokens.css` already has `:root` + `[data-mode='wordubado']`. Add, in this order (later wins at equal specificity):
```css
:root[data-theme='dark'] { /* every colour token + shadows + --color-overlay */ }
:root[data-palette='colour-blind'] { --tile-correct: ...; --tile-present: ... }
:root[data-theme='dark'][data-palette='colour-blind'] { ... }
```
Tokenise the one literal: `dialog.modal::backdrop { background: var(--color-overlay) }` (light `rgba(43,45,51,.32)`; dark `rgba(0,0,0,.55)`). Shadows `--shadow-toast/--shadow-button` use a light-mode ink rgba; in dark use `rgba(0,0,0,.3)`.
`--color-mode: var(--color-wordubado)` is set on `.app`, so dark just needs a lighter `--color-wordubado`.
Also check `svg` icons using `fill="var(--color-bg)"` (SettingsButton) – works automatically.

Starting hex values (contrast measured with a WCAG script against the real token roles; TUNE against axe): 
| Token (dark) | Value | Check |
|---|---|---|
| bg | `#232220` | text `#ece9e2` 13.1:1 |
| text / muted | `#ece9e2` / `#a09d95` | muted on bg 5.9, on surface `#302e2b` 5.0 |
| surface / key-pressed | `#302e2b` / `#3b3935` | |
| accent (buttons, sage) | `#456350` | text-on-accent 5.9 (primary button uses `--color-text` on accent) |
| tile-correct / present / absent | `#4d6b57` / `#7d6319` (present `#8a6d1f` only gave 4.04 vs text; darken) / `#4a4843` | verify each >= 4.5 vs `--color-text` (key labels are small text) |
| focus | `#8fbf9c` | 7.7 on bg |
| danger / error | `#e08a8a` / `#d98a8a` | danger-filled button text is `--color-bg` -> 6.2 |
| wordubado | `#b9a2ea` | 7.1 |
| tile-empty-border / filled-border | `#4a4843` / `#7d7a72` | filled 3.7 (non-text >= 3) |
Colour-blind light: correct orange `#f0a05a`, present blue `#8dbdf0` (dark text 6.5 / 7.0). Caveat: these two have near-equal luminance (1.08:1 to each other); colour-blind users separate them by hue (that is the standard orange/blue design) but D-03 asks for "stronger contrast", so make orange noticeably more saturated/darker (e.g. `#e8913a`) and blue lighter (`#9cc9f5`) and keep absent grey clearly distinct. Colour-blind dark (starting point): orange `#a65a17` (text 4.2, needs ~`#9a5212` for 4.5+) and blue `#2f6fb0` (4.3, needs ~`#2b67a6`). Both must reach >= 4.5 vs light text; tune with the contrast script plus the existing `nonTextContrast` helper. Tile-vs-background non-text contrast for correct/present is already below 3:1 in the light theme (sage 2.x), so the project does not apply 3:1 to state fills (state is conveyed by the aria-label and the axe run does not flag it); do not newly require it. [ASSUMED: owner accepted this in earlier phases; confirm via existing axe passing]

### Pattern 3: Save v2 -> v3 (follow existing chain)
- `SAVE_VERSION = 3`; `SaveDoc` gets `theme: 'system'|'light'|'dark'`, `colourBlind: boolean`, `howToPlaySeen: boolean`.
- `MIGRATIONS[2] = s => isObject(s) ? {...s, theme:'system', colourBlind:false, howToPlaySeen:false} : s` (same non-object guard style as `[1]`).
- `emptySave()` gets the defaults. `validateSave`: do NOT reject on bad appearance fields; coerce (`theme` not one of three -> `'system'`; non-boolean -> `false`) like `streakRev` does. Keep `wordubadoInfoSeen` strict as is.
- Plumbing places that must all change (grep `wordubadoInfoSeen`): `docFromState`, `mergeDocIntoState`, store initial state (also holds a pre-existing `colourBlind: false` at gameStore.ts:471 that is currently not persisted), `resetAll`, the `raw === null` branch of `applyExternal`, and the merge section of `applyExternal`.
- Reset (D-04, D-08): `resetAll` and the external-reset branch set `theme:'system', colourBlind:false, howToPlaySeen:false`. Note: after a reset the in-memory theme flips to System, so `startAppearance` must re-apply (subscription handles it).
- Existing tests to update: `src/logic/save.test.ts`, `storage.test.ts`, `twoTabs.test.ts`, `gameStore.test.ts` fixtures that assert version 2/doc shape; `e2e/storage.spec.ts:90` uses `"version":3` as the "newer build" fixture and must become `4` once SAVE_VERSION is 3. [VERIFIED: grep]
- Round-trip risk: a tab running the old build that sees a v3 doc treats it as `'newer'` and goes read-only (existing CR-01 behaviour), acceptable.

### Pattern 4: Two-tab sync for appearance
`applyExternal` merge: `seen` for howToPlaySeen uses OR (same as wordubadoInfoSeen). For `theme`/`colourBlind` adopt the incoming doc's values (a `storage` event only fires for the OTHER tab's write, so it is the newer choice); set `changedForMe` when they differ so the existing "no change -> no set" ping-pong guard still holds, and include them in `base`. Do NOT set `behindThem` for them (otherwise tabs ping-pong on a difference). `startAppearance`'s store subscription then re-applies the DOM attributes, so no extra listener in `sync.ts` is needed. Because `applyExternal` is deferred during `revealing`, appearance change in the other tab is applied after the reveal; acceptable.

### Pattern 5: Help dialog and ordering
- Add `'help'` to `DialogName`. It then blocks input via `dialog !== null` automatically; `openSettings/openStats/openDialog` already refuse while a dialog is open. Add a header `openHelp()` (guard like `openSettings`: refuse while `pendingRestore`, other dialog, `infoOpen`, `resultPending`). `closeApplyExternal` `closeConfirms` can leave 'help' alone.
- `howToPlaySeen: true` is set inside `openHelp` (D-08), whether auto or manual.
- Auto-open: a store action `maybeOpenHelp()`: no-op if `howToPlaySeen`, `pendingRestore !== null`, `breakNotice`, `dialog !== null`, `infoOpen`, or status `revealing`; otherwise `openHelp()`. Call it (a) from `main.tsx` right after `checkStreaks()` (outside React, StrictMode-safe, matches the project rule), and (b) at the end of the actions that clear a blocker: `dismissBreak` and the Restore resolve/decline actions. Because `checkStreaks` sets `pendingRestore`/`breakNotice` synchronously (verify), the boot call sees them and defers; the (b) calls open it after. On a first visit nothing is pending so it opens at once; `resume()` is async but Help does not depend on it (a dialog open during load is fine; input is blocked by `dialog`).
- Keep the auto-open in `main.tsx`, NOT in store creation or `resume()`, so unit tests that create stores and `App.test.tsx` are unaffected.
- Wordubado first-switch popup uses `infoOpen` (separate field) and cannot collide on first visit (D-07) because the switch is blocked while a dialog is open (verify the switch is disabled/inert under the modal: it is, `showModal` makes the page inert).
- Example rows in the modal: reuse the `.tile` classes with `data-state` (so they follow palette automatically); give each example row an aria-label sentence ("C is in the word and in the right spot") and `role="img"` or plain text, not `role="grid"` (avoid nested live grids and axe `aria-required-children`).

### Pattern 6: aria-live
- One persistent `<LiveRegion/>` always mounted in `App` (`className="visually-hidden" role="status" aria-live="polite"`, `aria-atomic="true"`), text from `announcement: {id:number, text:string} | null` in the store (not persisted). Always-mounted is required: regions inserted with content are often not announced.
- Set `announcement` inside `finishReveal` in the same `set()` calls that set `won/lost/playing`; compose text with a pure `announce.ts` so it unit-tests without React. For the final guess, text = guess line + result line (e.g. "CRANE: ... . You won in 4." / "... Out of tries. The word was CRANE."); non-final = guess line with "N tries left" (use "1 try left"). Give Up: set in `giveUp()` ("You gave up. The word was CRANE.") and the forfeit path if separate.
- Inert hazard: when `Modal` calls `showModal()` everything outside the dialog becomes inert and some screen readers will not announce updates to a region outside it. The Result modal opens after `resultDelayMs` (a delay already exists, `scheduleResult`), so the announcement is issued before the modal takes focus; keep it that way and do not shorten that delay below ~1s under reduced motion without checking. [ASSUMED: SR behaviour, cannot be tested here; flag for a manual NVDA/VoiceOver pass]
- Double-announce audit (D-12): (1) praise toast (win) is `role="status"` via `Toast announce` and already says "Genius/Nice" etc.; that is a different fact (praise) than "You won in 4", but the owner may consider it noise: simplest compliant choice is keep the toast announced and have the live line carry only the result facts (no praise). (2) `ResultModal` has a hidden `role="status"` mirroring the toast while open; unchanged. (3) `App` already passes `announce={dialog !== 'result'}` to Toast. Do not add result text to the Result modal's status region.
- Do not announce on `typeLetter/backspace/switchBoard` (D-13).
- Tile/key labels already exist (`Tile.tsx` label `Row r, column c, letter X, state`). Verify key `aria-label`s in `Keyboard.tsx` exist and include state (CONTEXT says they do).

### Pattern 7: Control style (Appearance)
Theme = `role="radiogroup"` of three `<button role="radio" aria-checked>` with roving tabindex + Arrow keys, copying `LengthPicker` (same file already does ArrowLeft/Right) and its `.length-picker` visuals. Colour-blind = `<button role="switch" aria-checked>` like `ModeSwitch` with label "Colour-blind friendly colours" + one-line hint ("Orange and blue instead of green and yellow"). All copy goes in `src/state/copy.ts`. Buttons only (see pitfall 2). Set `data-initial-focus` unchanged (Close/Reset logic stays).

### Pattern 8: Assets
- `index.html` head: `<title>`, `<meta name="description">`, `og:title/description/image/url/type=website`, `og:image:width/height/alt`, `twitter:card=summary_large_image`, `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`, `<noscript>` inside `<body>` (inline style, centred, system-ui, colours literal since CSS may not load).
- Paths: `og:image` = `https://wordyday.vercel.app/og-image.png`; `og:url` = `https://wordyday.vercel.app/`. [per D-17]
- `scripts/make-assets.mjs` (one-off, not in CI): `import { chromium } from '@playwright/test'`, launch (uses the cached `chromium-1243`; do NOT call `npx playwright install`, it times out on this machine), `page.setViewportSize({width:1200,height:630})`, `page.setContent(<svg/html>)`, `page.screenshot({path:'public/og-image.png'})`; repeat 180x180 for the apple-touch-icon with `deviceScaleFactor:1`. Commit both PNGs and keep the SVG source in `scripts/assets/` so the export is reproducible. If the cached Chromium path fails, pass `executablePath` explicitly. Keep PNG under ~300 KB (plain flat colours; fine). Text uses the platform system font; the output is committed so it is deterministic once generated. Check by Read-ing the PNG visually.
- `public/` files copy verbatim into `dist/`, which Vercel serves at the root, so the absolute URLs resolve. The `check:bundle` script should not be affected (assets in `public/`); confirm it does not count `public/` PNGs.

### Anti-Patterns
- Setting the theme in a React effect or in `main.tsx` after render (flash). Only the head script avoids it.
- A second localStorage key for theme (two sources of truth, extra reset/sync/migration work).
- Native `<input type=radio|checkbox>` inside a modal (breaks the focus trap).
- Triggering the guess announcement on submit (runs ahead of the flip) or from an effect (StrictMode doubles).
- Putting the auto-open in an effect/store-creation (StrictMode double-run, and breaks unit tests).

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Focus trap / Esc / focus return | new trap for Help | existing `Modal` | Already tested; fallbackFocus = `.help-button` |
| Persisted settings | own storage code | `persist` + `SaveDoc` fields | migration/guard/reset/sync already solved |
| Radio/switch UI | new component family | copy `LengthPicker` / `ModeSwitch` | Arrow-key logic and styles exist |
| PNG export | new dependency | Playwright Chromium screenshot | Zero deps |
| Contrast checks | manual | `expectNoA11yViolations` + `nonTextContrast` | Existing helpers |

## Common Pitfalls

### 1. First-visit Help breaks every existing E2E test
Every spec starts with empty storage, so the Help dialog opens and blocks typing. Fix: extend `readTestAnswer`-style hook (`src/state/testHook.ts`, gated to `mode e2e|test`) with `skipHelp`, have `fixAnswers`/`fixAnswersWith` in `e2e/helpers.ts` set it by default, and let the Phase 7 help specs use a variant that does not. Alternative: seed a v3 doc via `addInitScript` (more brittle). `maybeOpenHelp` reads the hook. Also scan specs that do `page.keyboard.press` immediately after `goto` and `tabs.spec.ts`/`persistence.spec.ts` that assert on the raw saved JSON shape.

### 2. Modal Tab trap only knows `button, textarea`
New controls must be `<button>`. A native radio/checkbox would let Tab escape the dialog. Also any link inside Help (none planned) would escape.

### 3. 4th header button at 320 px
Header row is title (14 px at <400 px) + chip + Stats + Settings, each 36 px under 400 px. A fourth 36 px button + 4 px gap adds ~40 px. Add `.help-button` to the existing `.settings-button, .stats-button` selector lists (base, hover, focus-visible, svg, ≥400 px, and the short-viewport override block at game.css ~630) rather than a new rule set. If `e2e/layout.spec.ts` "header fits title and actions" / "Day Streak chip" tests fail at 320, fallback order: shrink `.header-actions` gap to 0, then buttons to 32 px below 340 px (still >= 24 px WCAG 2.2 target size; Phase 6 uses 36), then allow the title to `overflow: hidden; text-overflow: ellipsis`. Measure first, do not guess. [ASSUMED: current slack unmeasured]

### 4. Contrast regressions in dark
Run axe in dark with a dialog open and with each tile state present (win row), and on the toast and the Wordubado purple mode. Dialog fade-in is already handled in `expectNoA11yViolations`.

### 5. `prefers-color-scheme` live listener leaks
Register once in `startAppearance` (outside React), remove on stop; unit-test with an injected `matchMedia` double. Only act when `theme === 'system'`.

### 6. Reset changes theme under the player
By decision (D-04). Make sure the Reset confirm copy does not claim "your settings are kept"; check `ResetConfirm` text.

### 7. Share emoji in dark
Keep ⬜ for absent (discretion default). Colour-blind share already wired; just pass the persisted flag (store already provides `colourBlind`).

### 8. iOS
`html, body, #root` already use `100vh` then `100dvh`. WebKit is not installed (no `playwright install` possible here); add a documented manual iPhone-Safari check (dvh with address bar, safe-area, `theme-color`) in the phase verification rather than a WebKit CI project. Consider `viewport-fit=cover` only if notch cropping is seen; do not add speculatively. [ASSUMED]

## Code Examples

### applyAppearance / startAppearance
```ts
// src/state/appearance.ts
export function resolveTheme(t: Theme, mq: MediaQueryList | undefined): 'light' | 'dark' {
  return t === 'system' ? (mq?.matches ? 'dark' : 'light') : t
}
export function applyAppearance(root: HTMLElement, theme: Theme, colourBlind: boolean, mq?: MediaQueryList) {
  root.dataset.theme = resolveTheme(theme, mq)
  if (colourBlind) root.dataset.palette = 'colour-blind'
  else delete root.dataset.palette
}
export function startAppearance(store, root = document.documentElement, win = window): () => void {
  const mq = win.matchMedia?.('(prefers-color-scheme: dark)')
  const run = () => { const s = store.getState(); applyAppearance(root, s.theme, s.colourBlind, mq) }
  run()
  const unsub = store.subscribe(run)          // zustand subscribe; cheap, idempotent
  mq?.addEventListener('change', run)
  return () => { unsub(); mq?.removeEventListener('change', run) }
}
```

### Keyboard E2E skeleton (D-14)
```ts
test('whole game and every dialog by keyboard only', async ({ page }) => {
  await fixAnswers(page); await page.goto('/')
  await expect(page.getByRole('dialog', { name: /how to play/i })).toBeVisible()
  await page.keyboard.press('Escape')                       // closes, focus returns
  // play with page.keyboard.type('crane') + press('Enter'); no mouse calls anywhere
  // open Settings: Tab to button, press Enter; arrow keys in theme radiogroup; Esc; assert focus back on the opener
})
```
Add a lint-ish guard: the test must not call `.click()`. Test dark with `page.emulateMedia({ colorScheme: 'dark' })` (System follows it, also proves live follow and no flash: assert `data-theme` on `<html>` via `page.addInitScript`-free first `evaluate` right after `goto` with `waitUntil:'commit'`, or inspect computed `body` background before React mounts) and colour-blind by seeding `localStorage` through `addInitScript` or toggling the switch.

### Playwright no-flash assertion
`page.route` can delay `/assets/*.js` so the app never mounts, then assert `document.documentElement.dataset.theme === 'dark'` and computed `body` background is the dark token; that proves the inline script, not React, did it.

## State of the Art

| Old | Current | Impact |
|-----|---------|--------|
| class on body toggled by app JS | attribute on `<html>` set by blocking head script | no flash |
| `prefers-color-scheme` media query only | script + `data-theme` override with System option | needed for the user-selectable choice |
| `100vh` | `100dvh` (already in place) | iOS toolbar |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vite leaves a classic inline `<script>` in index.html untouched | Pattern 1 | Script moved/removed; verify `dist/index.html` in a task |
| A2 | Screen readers may not announce live updates outside an open modal dialog; existing result delay avoids it | Pattern 6 | Announcement lost; needs manual NVDA/VoiceOver pass |
| A3 | Owner accepts state-fill tile colours below 3:1 vs bg (existing behaviour) | Pattern 2 | Would need new tile borders |
| A4 | Header 320 px slack unmeasured; may need size tweaks | Pitfall 3 | Layout tests fail until adjusted |
| A5 | `checkStreaks` sets pendingRestore/breakNotice synchronously | Pattern 5 | Help could open under a late prompt; verify in code before wiring |
| A6 | Cached Chromium 1243 launches from a Node script without `executablePath` | Pattern 8 | Pass `executablePath` explicitly |
| A7 | iOS dvh behaviour fine as-is | Pitfall 8 | Needs a manual device check |

## Open Questions (RESOLVED)

1. Praise toast plus "You won in 4" both announced on a win — keep both, or silence the toast's role on wins? Recommendation: keep both (different facts); revisit after a manual SR pass.
   RESOLVED: keep both. On a win the praise toast (role=status) and the live-region line ending "You won in N." are both announced; the live line carries only the result facts, never the praise (07-05; NVDA pass in 07-08).
2. Should manual opening of Help while a game is mid-reveal be allowed? Recommendation: no (same guard as Settings: `resultPending`/`dialog`; reveal is covered by `isBusy`-style guard like Stats).
   RESOLVED: no. `openHelp` refuses while `isBusy(s)` (reveal or result pause), as well as while a dialog, the Wordubado popup, a pending Restore prompt or a break notice is active; the header "?" button is disabled under the same conditions (07-01 Task 3, 07-03).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, build | yes | (24 per .nvmrc) | — |
| Playwright Chromium | E2E, asset export | yes (`chromium-1243`, headless shell in `%LOCALAPPDATA%\ms-playwright`) | 1243 | — |
| Playwright WebKit | iOS check | no (install times out) | — | manual iPhone Safari check |
| sharp / resvg | PNG | no | — | Chromium screenshot |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5 (jsdom for components) + Playwright 1.63 (+ @axe-core/playwright 4.13.0) |
| Config | `vite.config.ts` (`test`), `playwright.config.ts` (projects chromium + mobile Pixel 7; webServer builds `--mode e2e`) |
| Quick run | `npx vitest run src/logic/save.test.ts src/state src/components` |
| Full suite | `npm run lint && npm run typecheck && npm test && npm run test:e2e` |

### Phase Requirements -> Test Map
| Req | Behavior | Type | Command | Exists |
|-----|----------|------|---------|--------|
| UI-02 | v2 doc migrates to v3 with defaults; bad theme coerced; reset restores defaults | unit | `npx vitest run src/logic/save.test.ts` | extend |
| UI-02 | applyAppearance/resolveTheme + live matchMedia follow, listener removed | unit | `npx vitest run src/state/appearance.test.ts` | Wave 0 |
| UI-02 | No flash: `data-theme=dark` set with JS app blocked; follows `emulateMedia`; corrupt storage does not throw | e2e | `npx playwright test e2e/theme.spec.ts` | Wave 0 |
| UI-02/03 | two-tab: theme/colourBlind adopted via storage event, no ping-pong | unit | `npx vitest run src/state/twoTabs.test.ts` | extend |
| UI-03 | toggle persists across reload; tiles/keys use orange/blue; axe clean in light+dark | e2e | `npx playwright test e2e/theme.spec.ts` | Wave 0 |
| UI-04 | opens on first visit, not again after reload, reopen from header, existing-v2 player sees once, Restore prompt wins then Help follows | unit+e2e | `npx vitest run src/state/gameStore.test.ts`; `npx playwright test e2e/help.spec.ts` | Wave 0 |
| UI-07 | `announce.ts` text for correct/present/absent, plural/singular tries, win/loss/give-up | unit | `npx vitest run src/logic/announce.test.ts` | Wave 0 |
| UI-07 | live region updates once per guess after reveal; not on typing; no duplicate with Result status | unit (App) + e2e | `npx vitest run src/components/LiveRegion.test.tsx` | Wave 0 |
| UI-08 | full game + every dialog keyboard-only; Esc closes; focus returns; trap; Restore prompt not Esc-dismissable | e2e | `npx playwright test e2e/keyboard.spec.ts` | Wave 0 |
| UI-08 | axe in light, dark, colour-blind light, colour-blind dark (settings open and game with won row) | e2e | `npx playwright test e2e/a11y-themes.spec.ts` | Wave 0 |
| UI-10 | head has title, description, og:*, absolute https image/url, twitter card, icons; assets exist at expected size; noscript text present | unit (parse `index.html` with fs) + e2e fetch `/og-image.png` 200 | `npx vitest run scripts/meta.test.mjs` (node env) | Wave 0 |
| UI-05 | help button present first in header and fits at 320 | e2e | `npx playwright test e2e/layout.spec.ts` | extend |
| all | Existing suite stays green with skipHelp default | e2e | `npm run test:e2e` | update helpers |

### Sampling Rate
- Per task commit: quick run for the touched module.
- Per wave merge: `npm test` + the new/changed Playwright specs.
- Phase gate: full suite green, plus manual: iPhone Safari (dvh/theme-color), one NVDA or VoiceOver pass of a win, a loss and Give Up, and a Slack/Discord/opengraph.xyz paste check after the first production deploy.

### Wave 0 Gaps
- [ ] `e2e/helpers.ts` + `src/state/testHook.ts`: `skipHelp` default (must land before Help auto-open).
- [ ] New spec files listed above; `src/state/appearance.test.ts`; `src/logic/announce.test.ts`; `src/components/LiveRegion.test.tsx`; meta test.
- [ ] Update existing fixtures asserting version 2 / `"version":3` newer-build fixture.

## Security Domain

| ASVS Category | Applies | Control |
|---------------|---------|---------|
| V5 Input validation | yes | Hand-written guard coerces `theme`/booleans; inline script validates against whitelist before touching DOM (only 'light'/'dark'/'colour-blind' strings from constants are written; the raw stored value is never inserted into DOM) |
| V2/V3/V4/V6 | no | No auth, sessions, crypto |

Threat notes: stored value is user-controlled (localStorage) — never interpolate it into `innerHTML`/CSS; only whitelist-mapped constants set the attributes. Inline script adds a CSP consideration (none today). The OG/URL are static. No secrets.

## Project Constraints (from CLAUDE.md)
- React + Vite + TS, Vitest, Playwright, plain CSS + custom properties (no CSS-in-JS/Tailwind); Zustand `persist` with `version`/`migrate` pattern (migrations live in `loadSave`; `persist.migrate` intentionally throws).
- localStorage only, versioned saves must survive updates; fall back to fresh state rather than white-screen on corrupt data.
- Do effects/one-shot actions in store actions or boot code, not React effects (StrictMode double-invoke).
- Respect `prefers-reduced-motion`; keyboard-only and screen-reader support are core requirements.
- Design: soft, airy, dark mode keeps the same softness; no NYT copy.
- Node 24, TS ~6.0.3, ESLint 10 flat config, Prettier separate; CI runs lint, format:check, typecheck, test, build, e2e.
- GSD workflow: edits go through GSD commands. Memory: do not `npx playwright install` (times out); save finished plans as plan.txt and don't code until told.

## Sources

### Primary (HIGH)
- Codebase read this session: `src/logic/save.ts`, `src/state/{gameStore,sync,storage,testHook}.ts`, `src/components/{Modal,Header,Toast,WordubadoInfo,SettingsModal,SettingsButton,StreakBreakModal,ResultModal,Tile,LengthPicker}.tsx`, `src/styles/{tokens,global,game}.css`, `e2e/{axe,helpers,layout.spec,storage.spec}.ts`, `index.html`, `playwright.config.ts`, `package.json`.
- WCAG contrast computed locally with a script (relative-luminance formula) for the proposed hex values.

### Secondary / Tertiary
- Vite/Chromium/screen-reader behaviours stated from general knowledge (tagged [ASSUMED] above); not re-fetched in this session.

## Metadata
**Confidence:** stack and integration HIGH (codebase-verified); palette values MEDIUM (starting points); screen-reader behaviour MEDIUM-LOW (needs manual pass).
**Research date:** 2026-10-13. **Valid until:** ~30 days (stable stack).
