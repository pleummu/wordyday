# Phase 6: Result Screen, Share and Definitions - Context

**Gathered:** 2026-10-05
**Status:** Ready for planning

<domain>
## Phase Boundary

When a game finishes, the player gets a satisfying result screen. It shows won or lost, the answer, the attempts used, this Board's stats and Play again. From it the player can:
- reveal a definition of the answer (curated slang meaning, or a dictionaryapi.dev lookup)
- share an emoji grid through the phone share sheet, or by copying it to the clipboard

Requirements: RSLT-01..04. Themes, the colour-blind toggle itself, and wider a11y polish are Phase 7.

</domain>

<decisions>
## Implementation Decisions

Already locked elsewhere and not re-decided here:
- **SPEC.md §10:**
  - R-RESULT-1: won/lost, answer, attempts, stats, Play again.
  - R-RESULT-2: "Show definition" is hidden until clicked, in both Modes. Slang uses the bundled curated definition, common words use dictionaryapi.dev, and failures show "Definition unavailable".
  - R-SHARE-1: header, emoji grid, then site URL; a loss shows `X/n` using that Board's attempts.
  - R-SHARE-2: 🟧🟦 in colour-blind mode.
  - R-SHARE-3: share sheet on phones, otherwise clipboard plus a "Copied" toast.
- **R-BOARD-4:** a finished Board shows its grid, a result banner and Play again. A new game starts only on Play again.
- **Phase 4 D-03:** Give Up shows the same finished state as a loss, with "You gave up" wording.
- **Phase 4 D-06:** dialogs use the shared `Modal`.
- **Phase 5 D-04:** the distribution highlights the just-won row.
- **Phase 5 D-11:** the Day Streak toast.
- **Phase 5 D-12:** the banner Win Streak line, which this phase absorbs (see D-05).
- **Phase 5 D-14:** the non-dismissable Restore prompt wins over other dialogs.
- **Phase 5 D-21:** a finished game is recorded at submit; UI effects fire at `finishReveal`.

### Result screen form
- **D-01:** The result screen is a **Result modal plus a slim banner**.
  - When a game finishes, a Result modal (shared `Modal`) opens.
  - It holds:
    - the won/lost/gave-up heading
    - the answer
    - attempts used
    - this Board's stats
    - a "Show definition" button
    - Share
    - Play again
  - Closing the modal (close button, Esc, backdrop) leaves the existing inline banner under the grid. The banner is slimmed down and has a **"See result"** button that reopens the modal, plus Play again.
  - The layout must still pass the 320x500 no-scroll checks in `e2e/layout.spec.ts`.
- **D-02:** The modal **auto-opens only right after finishing** in this session:
  - when the reveal ends (`finishReveal`) for a win or loss
  - right after a confirmed Give Up

  Returning to an already-finished Board later (Board switch, reload, other tab) shows only the banner, and "See result" opens the modal on demand.
- **D-03:** The **Restore prompt and the streak-break modal win** over the Result modal (Phase 5 D-14). If either is pending when the game finishes, the Result modal waits or is skipped; the banner's "See result" still reaches it. The exact ordering is Claude's discretion.
- **D-04:** The **stats in the modal are this Board only, compact**:
  - Played, Win %, current Win Streak and Best Win Streak
  - this Board's guess distribution, with the just-finished winning row highlighted (Phase 5 D-04)

  There are no mode toggle, no 4/5/6/All tabs and no Day Streak footer; the full view stays in the Stats modal. Reuse the StatsModal pieces and the same empty-state and "—" rules (Phase 5 D-05).
- **D-05:** **The Win Streak moves into the modal.**
  - The banner's separate Win Streak line (`winStreakLine`, Phase 5 D-12) is removed, since the modal's stats row carries it.
  - The reset after a loss, Give Up or Forfeit shows as the Win Streak number going to 0 in the modal. Whether to also show a reset word is up to the UI spec.
  - The **Day Streak toast stays** and fires at reveal end as today, visible over the modal.
- **D-06:** **Play again in the modal** starts the next game on that Board and closes the modal. It behaves exactly like the banner's Play again.

### Definition display
- **D-07:** "Show definition" is a button in the modal. The definition stays hidden until it is clicked (R-RESULT-2). Clicking it reveals the definition area in place.
- **D-08:** **Choosing the source:**
  - If the Mode is Wordubado and the answer is in that length's reviewed slang list, show the **curated slang definition only**, with no network call. This includes words that are both slang and common, such as BARS and SALTY (Phase 3 D-04).
  - Everything else (all Normal answers, and Wordubado's 25% common share) uses **dictionaryapi.dev**.
- **D-09:** **A dictionaryapi.dev result shows the top 1-2 senses with their part of speech**, for example "noun — A large, tall bird…" and "verb — Stretch out one's neck…". It also shows a small "Source: dictionaryapi.dev" credit. It must be short enough to fit the modal on a phone.
- **D-10:** **When the lookup fails:**
  - While waiting, show a loading state.
  - Give up after **5 seconds**, and also on offline, a 404 (word not found), a network error or an unexpected response shape.
  - Then show **"Definition unavailable"** with a small **"Try again"** control that retries the lookup.
- **D-11:** The slang `crude` flag **changes nothing** in the definition display.

### Share text
- **D-12:** **Header format:**
  - Wordubado: `Unlimited Wordle - Wordubado 5 - 4/6`, as in SPEC.
  - **Normal: `Wordle 5 - 4/6`.** Normal drops both "Unlimited" and the mode name. This is an owner decision that refines R-SHARE-1's example; update SPEC.md §10 to record it.
  - The numbers are the length, then attempts used out of that Board's max (5/6/7).
- **D-13:** A loss and a **Give Up both share as `X/n`**, with the rows actually played. There is no "gave up" marker. Share is available for every finished result.
- **D-14:** The emoji grid uses only the submitted rows: 🟩🟨⬜ normally, and 🟧🟦⬜ in colour-blind mode (dark-theme square variants are Claude's discretion). Letters never appear.
- **D-15:** **The URL is the current site origin** (`window.location.origin`). It is the production URL in production and the preview URL in previews, and it follows a future custom domain automatically.
- **D-16:** **Colour-blind seam:**
  - The share builder takes a `colourBlind` flag, and both variants are unit-tested.
  - For now the flag reads a settings value that **defaults to false**.
  - Phase 7 adds the toggle and the persisted setting.
  - No colour-blind UI is built in this phase.

### Share sheet vs clipboard
- **D-17:** **The share sheet is for phones and tablets only.**
  - Use `navigator.share` only when it exists and the device is touch-first (e.g. `(pointer: coarse)`).
  - Desktop always copies to the clipboard and shows a "Copied" toast, even where desktop browsers have a share dialog.
- **D-18:** **When the player cancels the share sheet** (`AbortError`), nothing happens: no toast and no copy. Any other share-sheet error falls back to the clipboard.
- **D-19:** **When the clipboard copy fails** (no API, permission blocked):
  - Show the share text in a selectable read-only box (e.g. a textarea in the modal, pre-selected).
  - Add a short note such as "Couldn't copy. Select the text and copy it."

  Sharing must always be possible.

### Claude's Discretion
- **How curated slang definitions reach the browser.** For example, add definitions to the existing lazy `words-N.json` chunk, or ship a separate lazy slang-definitions chunk.
  - They must stay out of the entry bundle (WORD-09 / `scripts/check-bundle.mjs`).
  - They must not loosen the reviewed-only rule.
  - The definitions are short (300 words, at most 69 characters each).
- **dictionaryapi.dev fetch details:**
  - `AbortController` for the timeout.
  - A response-shape guard.
  - In-memory caching of a successful lookup per word for the session.
  - An E2E stub via Playwright route interception.
  - Research must confirm the CORS behaviour and the response shape (ROADMAP research flag).
- **The touch-device check.** How to detect "phone or tablet" robustly, including iPadOS reporting as desktop. Research the iOS Web Share and clipboard behaviour, including the user-activation requirement: share and copy must run directly in the click handler.
- **Modal ordering with the Restore prompt, the break modal and the Day Streak toast (D-03).**
- **Focus:**
  - Opening the modal focuses its primary action.
  - Closing it returns focus to the banner's "See result" button or a sensible target.
  - The existing banner `autoFocus` logic adapts.
- **Banner text.** The exact slimmed banner wording (e.g. "Solved in 4" / "The word was CRANE"), plus all modal copy and layout, go in the Phase 6 UI spec.
- **Where the modal state lives.** Whether the Result modal is a new `DialogName` (`'result'`) in the store or separate state, and how it interacts with `isInputBlocked`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Rules and requirements
- `SPEC.md` §10 (R-RESULT-1, R-RESULT-2, R-SHARE-1..3): the locked result, definition and share rules. Update R-SHARE-1 per D-12 (Normal header `Wordle 5 - 4/6`).
- `SPEC.md` §5 R-BOARD-4: a finished Board shows the grid, the banner and Play again.
- `SPEC.md` §8 R-RESTORE-12/13: the prompt is non-dismissable and wins over other dialogs.
- `.planning/REQUIREMENTS.md`: RSLT-01..04.
- `.planning/ROADMAP.md` Phase 6: the success criteria and the research flag (dictionaryapi.dev, iOS share/clipboard).
- `GLOSSARY.md`: Board, Mode, Give Up, Forfeit, Win Streak, Day Streak.

### Prior phase decisions
- `.planning/phases/04-six-boards-and-persistence/04-CONTEXT.md`: D-03 (Give Up finished state), D-06 (Modal pattern).
- `.planning/phases/05-stats-streaks-and-restore/05-CONTEXT.md`: D-04, D-05, D-11, D-12, D-14, D-21.
- `.planning/phases/05-stats-streaks-and-restore/05-UI-SPEC.md`: the Stats modal visuals to reuse.
- `.planning/phases/02-playable-normal-game/02-UI-SPEC.md`: the base visual system (soft, airy, rounded).

### Word data
- `scripts/words/slang.json`: the curated `{ word, definition, crude, reviewed }` entries.
- `scripts/build-words.mjs`: produces `src/data/words-N.json`. Today slang ships as a bare word list, with no definitions.
- `scripts/check-bundle.mjs`: the entry-bundle guard.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/Modal.tsx`: native `<dialog>` with focus handling, a non-dismissable option and native `close` handling. This is the Result modal's base.
- `src/components/StatsModal.tsx` and `src/logic/stats.ts`: stats maths, the distribution chart, the highlight and the empty-state rules. Reuse them for D-04.
- `src/components/Banner.tsx`: the existing finished-state banner (heading, body, streak line, Play again, autoFocus). Slim it down and add "See result".
- `src/components/Toast.tsx`: for "Copied".
- `src/state/copy.ts`: all UI strings, including `winHeading`, `lossHeading`, `GAVE_UP_BODY` and `winStreakLine` (to be retired per D-05).
- `src/logic/score.ts`: tile states for building the emoji grid.
- `src/data/wordData.ts`: lazy per-length pools (`answers`, `slang`, `guesses`).

### Established Patterns
- Every user-facing string lives in `src/state/copy.ts`.
- Dialogs are a single `dialog: DialogName | null` field in `gameStore`. `isInputBlocked` covers dialogs, `infoOpen` and `pendingRestore`.
- Effects fire at `finishReveal`, and recording happens at submit (D-21). The modal auto-open hangs off `finishReveal` and the Give Up confirm.
- Pure logic lives in `src/logic/**` with node-env Vitest tests. The share-text builder should be a pure function there (inputs: mode, length, rows/states, max attempts, outcome, colourBlind, origin).
- The E2E layout checks (`e2e/layout.spec.ts`) cover 320x500 with no scroll.

### Integration Points
- `src/App.tsx` (the `.controls` area) renders the banner today, and the Result modal mounts alongside the other modals.
- `src/state/gameStore.ts`: `finishReveal`, `giveUp`, `playAgain`, the `dialog` state.
- The settings shape (for D-16's `colourBlind` default) goes in the saved doc or the store, ready for Phase 7.

</code_context>

<specifics>
## Specific Ideas

- The modal layout the owner picked, top to bottom:
  - the heading ("You got it in 4/6!")
  - the answer
  - [Show definition]
  - the compact stats row
  - a small distribution chart
  - [Share] [Play again]
- The closed state shows the banner "Solved in 4" with [See result] [Play again].
- The dictionary preview the owner picked shows the part of speech aligned left, with the sense text beside it, and a small source credit at the bottom right.

</specifics>

<deferred>
## Deferred Ideas

- The colour-blind toggle in Settings, and colour-blind tile colours: Phase 7 (only the share seam is built here, per D-16).

</deferred>

---

*Phase: 06-result-screen-share-and-definitions*
*Context gathered: 2026-10-05*
