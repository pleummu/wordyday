---
phase: 03-wordubado-mode-and-slang
reviewed: 2026-10-02T12:00:00Z
depth: standard
files_reviewed: 40
files_reviewed_list:
  - docs/PIPELINE.md
  - e2e/helpers.ts
  - e2e/layout.spec.ts
  - e2e/wordubado.spec.ts
  - package.json
  - playwright.config.ts
  - scripts/build-words.mjs
  - scripts/check-bundle.mjs
  - scripts/words/apply-slang-review.mjs
  - scripts/words/lib.mjs
  - scripts/words/lib.test.mjs
  - scripts/words/pools.test.mjs
  - scripts/words/profanity.mjs
  - scripts/words/slang.json
  - scripts/words/slang.test.mjs
  - scripts/words/slang-cuts.txt
  - src/App.test.tsx
  - src/App.tsx
  - src/components/Header.test.tsx
  - src/components/Header.tsx
  - src/components/InfoButton.tsx
  - src/components/Keyboard.test.tsx
  - src/components/Modal.test.tsx
  - src/components/Modal.tsx
  - src/components/ModeSwitch.tsx
  - src/components/SwitchConfirm.test.tsx
  - src/components/SwitchConfirm.tsx
  - src/components/usePhysicalKeyboard.ts
  - src/components/WordubadoInfo.tsx
  - src/data/wordData.test.ts
  - src/data/wordData.ts
  - src/logic/pickAnswer.test.ts
  - src/logic/pickAnswer.ts
  - src/state/copy.ts
  - src/state/gameStore.test.ts
  - src/state/gameStore.ts
  - src/state/testHook.ts
  - src/styles/game.css
  - src/styles/tokens.css
  - src/test/stubDialog.ts
findings:
  critical: 0
  warning: 5
  info: 7
  total: 12
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-10-02T12:00:00Z
**Depth:** standard
**Files Reviewed:** 40
**Status:** issues_found

## Summary

I reviewed the Wordubado mode in the store, the 75/25 answer picker, the header switch, the (i) popup, the confirm dialog, the shared Modal, the slang review tooling, the bundle check and the tests.

The main game logic holds up:
- `pickWordubadoAnswer` splits correctly at 0.75 and falls back to Normal answers when there is no slang.
- The `loadToken` guard still handles fast switching.
- The `requestSwitch` and `confirmSwitch` rules match D-09 and D-16.
- Slang never lands in the Normal answer pool. I checked the generated `words-{4,5,6}.json`: 95, 110 and 95 reviewed slang words, all valid guesses, none in the answers.
- I built a production bundle into a scratch folder. It does not contain `__WORDLE_TEST__`, so the WR-01 gate works.

No blockers. The warnings are about weak spots:
- The slang-cut tooling does not do what the review sheet promises. A typo in a cut is silently ignored, and a cut common word goes back into Normal answers.
- The Modal only listens for `cancel`. If the dialog closes any other way, the store still thinks it is open and the game stops taking input.
- The default animated close path is never tested.
- Enter on the (i) button submits a guess instead of opening the popup.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Cutting a common-word slang entry puts it back into Normal answers; the review sheet says this is automatic

**File:** `scripts/words/apply-slang-review.mjs:43-47`, `scripts/words/lib.mjs:194`
**Issue:** The review sheet that `renderSlangReview` generates says: "if you cut it, it is added to exclude.txt so it does not become a Normal answer unless you say so." Nothing does this. `apply-slang-review.mjs` only removes the word from `slang.json`. Then `buildPools` (lib.mjs:77) stops treating it as slang. So the next `build:words` quietly adds words like SALTY, CHAOS or DRAMA to the Normal answer pool (RESEARCH Pitfall 2, threat T-03-02). In Plan 03-01 this was a manual step, and it was harmless only because the owner made no cuts. The next review with cuts will hit it, and no invariant or test catches it: `pools.test.mjs` checks `slang.json` membership, not past cuts.
**Fix:** Do it in the script. Load the common sets (or the `commonByLength` sets that build-words.mjs builds). For every cut word that is common and not overridden, append it to `exclude.txt`. Or add an invariant to `assertInvariants`: no word in `slang-cuts.txt` may be a Normal answer unless it is listed in an explicit override file.

```js
// apply-slang-review.mjs (sketch)
const exclude = new Set(parseList(read('./exclude.txt')))
const toExclude = [...cutWords].filter((w) => common.has(w) && !exclude.has(w))
if (toExclude.length) appendFileSync(url('./exclude.txt'), toExclude.map((w) => `${w}\n`).join(''))
```

### WR-02: A misspelled or comma-separated cut is silently ignored, so the word stays a Wordubado answer

**File:** `scripts/words/apply-slang-review.mjs:25-26,43`, `scripts/words/lib.mjs:160-170`
**Issue:** The review sheet invites "one per line or comma-separated" replies. `parseCutList` treats a whole line as one word, so `rawdog, nudes` becomes the word `"rawdog, nudes"`. `removeCut` matches nothing and the script reports nothing. A typo (`rawdgo`) has the same effect. The word the owner wanted gone stays `reviewed: true` and can be picked as an answer. The plan asked for these to be reported ("Report back any word that is not in slang.json"), but that only happened by hand. The `contains no cut word` test passes too, because the bad entry is not in `slang.json`.
**Fix:** In `apply-slang-review.mjs`, fail on any cut that is not a valid word or is unknown:

```js
const known = new Set(entries.map((e) => e.word))
const bad = cuts.filter((c) => !/^[a-z]{4,6}$/.test(c.word) || (!known.has(c.word) && !c.reason.includes('blocklist')))
if (bad.length) { console.error(`unknown or malformed cuts: ${bad.map((c) => c.word).join(', ')}`); process.exit(1) }
```

Also either split on commas in `parseCutList`, or change the sheet text to "one word per line".

### WR-03: The Modal never handles the native `close` event, so a dialog closed by the browser can lock the game

**File:** `src/components/Modal.tsx:98-112`
**Issue:** The store learns about a close only through `onCancel` and the backdrop `onClick`. Chrome's close-watcher rules (Escape or the Android back gesture with no history-action user activation) close a modal `<dialog>` without firing `cancel`. Then `pendingSwitch` or `infoOpen` stays set:
- `typeLetter`, `backspace` and `submit` all return early.
- `usePhysicalKeyboard` returns early.
- The `open` prop never changes, so the Modal effect never runs again and cannot show the dialog again.

The player sees a normal board that ignores every key, and only a reload fixes it. The trigger is uncommon, but the result is a dead game.
**Fix:** Keep the store in sync from the native `close` event, and ignore it when the close came from the Modal's own effect:

```tsx
<dialog
  ...
  onClose={() => { if (openRef.current) onClose() }}
>
```

Set `openRef.current = open` in the effect. A closed dialog with `open === true` then always calls back into the store.

### WR-04: The default (animated) dialog close path is never tested

**File:** `src/components/Modal.tsx:70-78`; `src/components/Modal.test.tsx:7-10`; `src/components/SwitchConfirm.test.tsx:20-23`; `e2e/wordubado.spec.ts:13`
**Issue:** Every Modal unit test stubs `matchMedia` to `{ matches: true }`, and `wordubado.spec.ts` runs entirely with `reducedMotion: 'reduce'`. So the path most players get never runs in any test. That path sets `data-closing`, leaves the dialog in the top layer for 120 ms, then closes and returns focus from a timer. It is also the path with the trickiest ordering. After "Start new game", the confirm dialog is still open while the info dialog calls `showModal()` on top of it. Then the confirm's `finish()` runs later and has to decide whether to move focus. A regression in that ordering (for example, focus jumping out of the "Got it" dialog, or keys being swallowed while `dialog[open]` lingers) would not be caught.
**Fix:** Add a Modal unit test with `matchMedia` returning `{ matches: false }` and `vi.useFakeTimers()`. Assert that `data-closing` is set, the dialog is still open before 120 ms, and focus is restored after it. Also add one E2E test without `reducedMotion` for the confirm → "Start new game" → info flow, asserting that "Got it" keeps focus after 200 ms.

### WR-05: Enter on the focused (i) button submits a guess instead of opening the popup

**File:** `src/components/InfoButton.tsx:10-14` (same pattern in `src/components/ModeSwitch.tsx:18-22`)
**Issue:** `InfoButton` is a plain `button` with `aria-haspopup="dialog"`, and users expect Enter and Space to activate a button. Calling `preventDefault()` on Enter means a keyboard-only player who tabs to "About Wordubado" and presses Enter gets a "Not enough letters" shake, not the popup. Only Space works, and nothing tells them. CLAUDE.md requires keyboard-only play. This weakens the button's expected behaviour to work around a focus-return problem. The switch is less of a problem, because the ARIA switch pattern only requires Space.
**Fix:** Let Enter activate (i), and solve the root problem in a different way. When the info popup closes, return focus to the board or game area rather than to the (i) button (pass an explicit `returnFocus` target). Or keep focus on (i) and accept that Enter reopens the popup, which is standard button behaviour.

## Info

### IN-01: Opening the popup with (i) does not count as "seen"

**File:** `src/state/gameStore.ts:63-71,89-91`
**Issue:** `infoSeen` is set only in `autoOpenInfo`. A player who reads the popup through (i) in Normal and then turns on Wordubado gets the same popup again. D-16's aim ("everyone sees the crude-content note once") is already met at that point.
**Fix:** Set `infoSeen = true` in `openInfo()` as well.

### IN-02: `infoSeen` lives in a closure, so tests that share the store depend on test order

**File:** `src/state/gameStore.ts:63`; `src/App.test.tsx:29-34`; `src/components/Header.test.tsx:21-26`
**Issue:** These test files share the `useGameStore` singleton and reset it with `setState({ pendingSwitch: null, infoOpen: false })`, which cannot reset `infoSeen`. After the first test that turns on Wordubado, no later test in the file will see the popup open automatically. Tests that rely on the auto-open will pass or fail depending on their order. These files also use the real `setTimeout` reveal timer, which can fire after a test has ended.
**Fix:** Move `infoSeen` into store state (it moves to persisted storage in Phase 4 anyway). Or add a `resetForTests` helper, or make a fresh store per test with `createGameStore`.

### IN-03: The slang answer list has plurals, past forms and -ing forms that Normal mode deliberately removes

**File:** `scripts/words/slang.json`
**Issue:** The list has pairs and families such as doggo/doggos, emoji/emojis, noob/noobs/noobie, vibe/vibes/vibey/vibing and simp/simped. It also has many -s, -ed and -ing forms (bffs, ratios, yoinks, flexed, rizzed, hyping, meming, oofing). D-02 removes inflections from Normal answers, but the slang pool never applies `isInflection`. So Wordubado answers are often plurals of other answers. The owner approved the list, so this is a quality note for the next review, not a defect.
**Fix:** Mark inflected forms in `renderSlangReview` (run `isInflection(word, slangSet ∪ all)`) so the owner can decide at the next review.

### IN-04: Some `crude` flags and definitions look wrong for Phase 6, which will show them

**File:** `scripts/words/slang.json` (entries `edging`, `nsfw`, `doxing`)
**Issue:** `edging` has `crude: false` with the definition "Pushing something to the limit of acceptable." Its main slang meaning today is sexual. `nsfw` is also `crude: false`. `doxing` is standard vocabulary, not slang. Definitions appear on screen in Phase 6, so wrong ones become player-facing.
**Fix:** Look at these again at the Phase 6 definitions checkpoint. Consider flagging `edging` and `nsfw` as crude.

### IN-05: The E2E build writes over the production `dist/`

**File:** `playwright.config.ts:15`, `package.json:9`
**Issue:** `build:e2e` writes the build with the test hook into the same `dist/` folder as the production build. PIPELINE.md documents this ("run npm run build again before check:bundle"). But a manual `vite preview` or deploy of `dist/` after an E2E run would serve the answer-fixing hook. With `reuseExistingServer` locally, a running production preview makes E2E fail in confusing ways.
**Fix:** Use `vite build --mode e2e --outDir dist-e2e` and `vite preview --outDir dist-e2e`, and add `dist-e2e` to `.gitignore`.

### IN-06: Reviewed slang is stored twice in each word chunk

**File:** `scripts/words/lib.mjs:90,93`; `scripts/build-words.mjs:90`
**Issue:** Each reviewed slang word appears in both the `guesses` string and the `slang` string of `words-N.json`. I checked: all 95, 110 and 95 slang words are also in `guesses`. `toPools` merges them back into one Set anyway, so the duplicates only add bytes to the lazy chunk.
**Fix:** Leave reviewed slang out of `guesses` in `buildPools`/`serialisePools`, and update the `assertInvariants` "seen" check to count `slangAnswers`.

### IN-07: Dragging a text selection out of the dialog closes it

**File:** `src/components/Modal.tsx:108-110`
**Issue:** If a press starts inside `.modal-card` and the release happens over the backdrop, the browser fires `click` on the `<dialog>`, their common ancestor. Then `e.target === e.currentTarget` is true and the dialog closes, which cancels the switch.
**Fix:** Record the `pointerdown` target and close only when both the press and the release happened on the dialog itself.

---

_Reviewed: 2026-10-02T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
