---
phase: 07-themes-accessibility-and-polish
reviewed: 2026-10-14T17:23:51Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - index.html
  - scripts/make-assets.mjs
  - src/App.tsx
  - src/components/Header.tsx
  - src/components/HelpButton.tsx
  - src/components/HowToPlayModal.tsx
  - src/components/LiveRegion.tsx
  - src/components/Modal.tsx
  - src/components/SettingsModal.tsx
  - src/components/WordubadoInfo.tsx
  - src/components/usePhysicalKeyboard.ts
  - src/logic/announce.ts
  - src/logic/save.ts
  - src/main.tsx
  - src/state/appearance.ts
  - src/state/copy.ts
  - src/state/gameStore.ts
  - src/state/testHook.ts
  - src/styles/game.css
  - src/styles/tokens.css
  - src/test-hook.d.ts
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-10-14T17:23:51Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

I reviewed `git diff 09b674b..HEAD` for the listed files. The changes cover the themes, colour-blind palette, How-to-play modal, live region, v2->v3 save migration, pre-paint script and meta assets.

The core paths hold up when traced:
- Boot ordering: `resume()`/`startGame()` clear `dialog` synchronously before `maybeOpenHelp()` runs, so the first-visit Help is not wiped.
- The v2->v3 migration chain and validation are correct.
- `appearance.ts` subscribe/teardown is correct.
- The Modal focus trap handles roving tabindex.

I found no new JS selector collisions beyond the one fixed in ea99727. No e2e or src code queries `.length-option`, `.length-picker`, `.tile` or `.mode-switch` other than the patched fallback. The help tiles reuse `.tile` but e2e locates board tiles by `gridcell` role, so they do not collide. The shared classes do leak styling, though (IN-02).

I verified two findings by running a build in Chromium at 320x568:
- The Help modal opens scrolled to the bottom (WR-02).
- `:root` computes `color-scheme: light dark` under the Light theme (WR-03).

## Warnings

### WR-01: Reset confirmation copy no longer says that games are erased

**File:** `src/state/copy.ts:51-52`
**Issue:** The old copy said: "This clears every game, your stats, streaks and Restores." The new copy says only: "clears your stats and streaks and puts your settings back to the defaults". But `resetAll()` (`gameStore.ts` ~709-744) still sets `boards: {}`, which wipes every in-progress and finished game on all 6 Boards, and also resets Restores. So this destructive, irreversible action now hides part of what it deletes. Users can lose in-progress games they did not expect to lose.
**Fix:**
```ts
export const RESET_BODY =
  "This clears every game, your stats, streaks and Restores, and puts your settings back to the defaults. This can't be undone."
```

### WR-02: How-to-play opens scrolled to the bottom on phones, hiding the heading and rules

**File:** `src/components/HowToPlayModal.tsx:63`
**Issue:** `data-initial-focus` is on "Got it", which is the last element. `Modal` calls `.focus()` on it, and that scrolls the dialog to the button. At 320x568 the dialog is 705px of content in a 530px box, and after auto-open it ends up at `scrollTop = 175`. So a first-time phone user first sees the bottom half: Modes, Streaks and the button. The heading and rules are scrolled away. This is the onboarding screen, so the defect is visible to every new mobile player.
**Fix:** Focus without scrolling, or reset the scroll after focusing. In `Modal.tsx:49`:
```ts
dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus({ preventScroll: true })
dialog.scrollTop = 0
```
(Or put the initial focus on the dialog/heading for this modal.)

### WR-03: Light theme keeps `color-scheme: light dark`, so a dark OS gives dark UA chrome on a light page

**File:** `src/styles/tokens.css:40` (and `index.html` `<meta name="color-scheme">`)
**Issue:** `:root` declares `color-scheme: light dark`, and only `[data-theme='dark']` narrows it. When the OS is dark and the user picks **Light**, the used scheme is still dark. Scrollbars (including the scrolling Help/Settings dialogs), default form-control rendering and `Canvas` system colours then render dark on the light palette. I confirmed it: computed `color-scheme` is `"light dark"` with `data-theme="light"`.
**Fix:**
```css
:root[data-theme='light'] {
  color-scheme: light;
}
```

### WR-04: Last-writer-wins on theme/colour-blind can silently revert the user's choice in a two-tab race

**File:** `src/state/gameStore.ts:840-866`
**Issue:** `applyExternal` always adopts `doc.theme`/`doc.colourBlind` from any incoming document, and appearance never counts as "behind". Every persisted write carries the writer's whole appearance state, so an unrelated write from another tab overwrites a fresh appearance change. Example:
1. Tab B sets Dark and writes W1.
2. Tab A submits a guess and writes W2 (still `system`) before W1's storage event arrives.
3. B receives W2 and adopts `system`, which reverts the user's choice in the tab where they made it.
4. A receives W1 and adopts `dark`. Each adoption writes text identical to what it received, so the echo guard prevents further writes.

The tabs now disagree and storage holds `system`. The same thing happens, as a visible flicker, when B is mid-reveal: `pendingExternal` defers the merge, and `finishReveal`'s write sends the old theme back to A. The window is narrow, but the comment's "no ping-pong" claim hides a divergence.
**Fix:** Give appearance a revision, as `streakRev` does for the streak slice. Add `appearanceRev` to `SaveDoc`, bump it in `setTheme`/`setColourBlind`/reset, and in `applyExternal` adopt the doc's appearance only when `doc.appearanceRev > state.appearanceRev`. Count the opposite case in `behindThem`.

## Info

### IN-01: The `.mode-switch:not(.settings-switch)` fallback selector is still brittle

**File:** `src/components/WordubadoInfo.tsx:15-19`
**Issue:** The ea99727 fix excludes one known collider. Any future switch that reuses `.mode-switch` (the styling class) brings the bug back.
**Fix:** Give `ModeSwitch` its own hook, such as `data-mode-switch` or an id, and query that.

### IN-02: Reused classes carry Wordubado/length-picker semantics into Settings

**File:** `src/styles/game.css:254-257`, `src/components/SettingsModal.tsx:66,78,92`
**Issue:**
- The colour-blind switch reuses `.mode-switch`, so its "on" track is painted `--color-wordubado` (purple). That colour means "Wordubado mode" elsewhere.
- The theme radios reuse `.length-picker`/`.length-option`, so any later change to the header picker (media queries at 399.98px and 540px height, `.length-dot`) changes Settings too.

**Fix:** Scope the checked colour, for example `.settings-switch[aria-checked='true'] .mode-switch-track { background: var(--color-accent); border-color: var(--color-accent); }`. Or extract a neutral `.switch`/`.segmented` base class.

### IN-03: Duplicate screen-reader announcements at game end

**File:** `src/state/gameStore.ts` (giveUp ~930-937, finishReveal lost/won branches), `src/components/LiveRegion.tsx:7`
**Issue:** On give-up and loss, `announcement` says "The word was X". The Result modal then opens (immediately for give-up) and its own `role="status"` line plus `aria-describedby` say the outcome again. On a win, the PRAISE toast (polite) and the live region update in the same commit. `Toast` already suppresses itself when `dialog === 'result'` for this reason, but `LiveRegion` does not.
**Fix:** Skip the end-of-game tail in `announcement` when the result modal will open, or set `announcement` to the tile line only for finished games.

### IN-04: `announcement.id` is never read

**File:** `src/state/gameStore.ts:113`, `src/components/LiveRegion.tsx:7`
**Issue:** `LiveRegion` renders only `text`, so `id` (taken from `toastSeq`) is dead. If identical text is ever announced twice, it will not re-announce.
**Fix:** Drop `id`, or key the text node on it (`<span key={id}>{text}</span>`) so repeats re-announce.

### IN-05: The pre-paint script trusts unvalidated or newer saves

**File:** `index.html:10-27`
**Issue:** The script reads `.state.theme` without checking `version` or running validation. For a document that `loadSave` rejects (corrupt -> fresh state, or newer -> read-only defaults), the page paints the stored theme and then `startAppearance` switches it to `system`, which causes a flash. It is cosmetic only.
**Fix:** Also require `typeof v.version === 'number' && v.version <= 3` before trusting `state`.

### IN-06: `make-assets.mjs` paths depend on the working directory

**File:** `scripts/make-assets.mjs:18,20`
**Issue:** `scripts/assets/...` and `public/...` are relative to the working directory, so running it from `scripts/` fails or writes to the wrong place.
**Fix:** Resolve against `new URL('..', import.meta.url)`.

---

_Reviewed: 2026-10-14T17:23:51Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
