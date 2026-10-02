# Phase 3: Wordubado Mode and Slang - Context

**Gathered:** 2026-10-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Players can switch between Normal and Wordubado at any length and play slang-heavy Wordubado games (about 75% slang answers, 25% common), and slang stays a valid guess (never an answer) in Normal. This phase includes the owner's review of `slang.json`, the header mode switch, the Wordubado (i) popup, and a confirm step before a switch would end a game in progress.

Not in this phase: saved Boards and persistence (Phase 4), stats (Phase 5), definitions on the result screen (Phase 6), help/themes (Phase 7).

</domain>

<decisions>
## Implementation Decisions

Already locked elsewhere and not re-decided here: SPEC.md R-MODE-1..3 and R-POOL-1..9 (75/25 split chosen per game, slang never a Normal answer, slang always a valid guess, no slurs or hate terms), the Phase 2 decisions in `02-CONTEXT.md` (D-14..D-18 slang entry shape `{ word, definition, crude, reviewed }`, review sheet, unreviewed words can never be Wordubado answers), and the Phase 2 visual system in `02-UI-SPEC.md`.

### Slang review (owner gate)
- **D-01:** The slang review is an **early, blocking checkpoint**. The first Phase 3 work regenerates `scripts/words/slang-review.md` and pauses for the owner. Wordubado is built and tested against the final reviewed list, not the draft.
- **D-02:** The owner reviews with a **cut list** (same as the Phase 2 Normal review): they reply with the words to cut. Every word not cut becomes `reviewed: true`. Cut words are removed from `slang.json`.
- **D-03:** **Every "blocklist hit" slang word is cut automatically** (anything the obscenity filter or `blocklist.txt` matches, e.g. ARSE) before the owner sees the sheet. The sheet lists these as already cut so the owner can see them. Crude words that are not blocklist hits stay in the sheet with their `crude` flag for the owner to keep or cut (mildly crude is allowed in Wordubado).
- **D-04:** Slang words that are **also common English words** (e.g. BARS, BAIT, SALTY) **count as slang**: they stay in `slang.json` and can be picked in Wordubado's 75% slang share. They stay out of Normal answers (existing rule).
- **D-05:** After the review, every length must still have a usable number of reviewed slang answers. The `slang.test.mjs` count rule (80-150 per length) may need loosening if the owner's cuts go below 80; flag this at the checkpoint, not silently.

### Wordubado answer picking
- **D-06:** Wordubado's 25% common-word share is drawn from the **Normal Answer Pool** for that length (the owner-reviewed 770/857/959 lists), so Phase 2 cuts apply in Wordubado too.
- **D-07:** The 75% slang share is drawn only from slang entries with `reviewed: true` for that length.

### Mode switching (before Phase 4 saved Boards)
- **D-08:** Default mode on first visit is **Normal**.
- **D-09:** Switching **mode or length** while a game is in progress **asks for confirmation first** ("this ends your current game"). "In progress" means **at least one guess submitted** and the game not yet won or lost. With no guesses yet (even if letters are half-typed), or after the game is over, the switch happens immediately with no prompt. Confirming starts a new game in the new mode/length; cancelling leaves everything as it was. Switching stays blocked while a row is revealing (existing rule).
- **D-10:** This confirm is a stopgap: Phase 4 makes switches non-forfeiting and removes it. Build it on a reusable dialog so Phase 4's Modal work can absorb it.
- **D-11:** Mode and length are **not** persisted in Phase 3. A reload goes back to Normal at the default length. Persistence waits for Phase 4's versioned storage.

### Header and mode switch
- **D-12:** The mode control is a **single switch** labelled **"Wordubado"** (off = Normal, on = Wordubado), exposed to assistive tech as a switch named "Wordubado". Layout per the owner's chosen preview: title row on top, then the "Wordubado" switch with its (i) button next to the length picker.
- **D-13:** Help, stats and settings buttons stay **hidden until their screens exist**. Keep the reserved `.header-actions` slot. Each button appears in the phase that builds its screen.
- **D-14:** **UI-05 is split.** Phase 3 delivers the mode switch and length picker part. Each header button counts toward UI-05 when its screen lands: settings in Phase 4, stats in Phase 5, help in Phase 7. ROADMAP Phase 3 success criterion 1 must be reworded to drop "header also has help/stats/settings buttons", and the UI-05 traceability row updated, as part of this phase's planning.
- **D-15:** Wordubado has a **subtle accent**: the same soft design, with a mode-specific accent (e.g. the title or switch tinted) so the player always knows which mode they are in. Tile and key result colours do not change.

### Wordubado (i) popup
- **D-16:** The popup opens **when the (i) button is tapped, and automatically the first time the player turns on Wordubado** in a page session, so everyone sees the crude-content note once. "Seen" is held in memory only until Phase 4 storage exists. If that first switch needs the D-09 confirm, the confirm comes first and the popup follows.
- **D-17:** The (i) button sits **next to the switch and is always visible**, so Normal players can learn about Wordubado before switching.
- **D-18:** The copy is **short and playful, 2-3 lines**: what Wordubado is (mostly slang, meme and Gen Z words, plus some normal ones) and a clear note that some words are mildly crude. Claude drafts it; the owner approves the wording through the UI spec.

### Claude's Discretion
- How slang reaches the browser: per-length data in the existing lazy word chunk (e.g. a `slang` field in `words-N.json`) vs a separate chunk, as long as pools stay out of the entry bundle (WORD-09 bundle check) and only reviewed slang can be picked. Definitions are not needed at runtime until Phase 6.
- Store shape for mode (e.g. `mode` alongside `length` in the Zustand store), keeping it easy to extend to six Boards keyed `${mode}-${len}` in Phase 4.
- How the 75/25 choice is made (e.g. one rng draw for the pool, one for the word) and the seeded 10,000-draw test (ROADMAP note).
- How the E2E test hook fixes a Wordubado answer. This is a natural point to address Phase 2 review warning WR-01 (test hook reachable in production) if it fits.
- The dialog implementation for D-09/D-16 (focus trap, Esc, focus return), sized so Phase 4 can reuse or replace it.
- Exact accent colour, switch styling and popup copy, set in the Phase 3 UI spec.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Game rules and terms
- `SPEC.md` §2 (R-MODE-1..3) and the pool rules (R-POOL-1..9): modes, 75/25 split, slang as guess not Normal answer, crude/slur rules
- `GLOSSARY.md`: Mode, Normal, Wordubado, Answer Pool, Guess Pool, Board
- `.planning/REQUIREMENTS.md`: WORD-01, WORD-03, WORD-04, WORD-06, WORD-08, UI-05
- `.planning/ROADMAP.md` Phase 3: success criteria (criterion 1 to be reworded per D-14) and the 10,000-draw note

### Prior phase decisions
- `.planning/phases/02-playable-normal-game/02-CONTEXT.md`: D-14..D-18 (slang shape, review sheet, `reviewed` flag), D-22 (test hook, no URL parameter)
- `.planning/phases/02-playable-normal-game/02-UI-SPEC.md`: tokens, header layout, length picker, toast, motion rules
- `.planning/phases/02-playable-normal-game/02-REVIEW.md`: WR-01 test hook in production, WR-04 reveal timer not token-guarded (relevant to new switch paths)

### Word data
- `scripts/words/slang.json`: drafted slang (98 / 110 / 95 for 4 / 5 / 6 letters, all `reviewed: false`)
- `scripts/words/slang-review.md`: generated review sheet with `crude`, `blocklist hit` and `common word` flags
- `scripts/words/slang.test.mjs`: slang validation (shape, counts 80-150 per length)
- `scripts/build-words.mjs` and `scripts/words/lib.mjs`: word build; slang merged into guesses
- `scripts/check-bundle.mjs`: asserts pools stay out of the entry chunk

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/LengthPicker.tsx`: segmented radio control; the mode switch sits beside it.
- `src/components/Header.tsx`: title, length picker and an empty reserved `.header-actions` slot.
- `src/components/Toast.tsx`: available for any switch feedback.
- `src/logic/pickAnswer.ts`: `pickAnswer(answers, rng)` with an injectable rng; Wordubado adds a pool choice before it.
- `src/data/wordData.ts`: `loadPools(length)` lazy per-length chunks; `Pools = { answers, guesses }` (slang already inside `guesses`).
- `src/styles/tokens.css`: `--color-accent` and other tokens; a Wordubado accent can be a token override.

### Established Patterns
- Zustand store (`src/state/gameStore.ts`) with injected deps (`loadPools`, `rng`, `setTimer`); answers are picked in store actions, not effects (StrictMode rule).
- `selectLength` is blocked while `status === 'revealing'` and restarts via `startGame(length)`; the D-09 confirm goes in front of this path and a new mode path.
- Test-first pure logic in `src/logic/`, E2E against the production build with the `__WORDLE_TEST__` hook (`src/state/testHook.ts`).
- Generated word JSON is committed; CI fails on drift (`npm run build:words && git diff --exit-code`).

### Integration Points
- `scripts/build-words.mjs`: emit reviewed slang per length into the generated data, and auto-cut blocklist hits (D-03).
- `src/state/gameStore.ts`: add `mode`, the 75/25 pick, a mode-select action and the in-progress check for D-09.
- `src/components/Header.tsx`: switch, (i) button, accent hook (e.g. a `data-mode` attribute).
- `e2e/`: Wordubado win/lose, switch confirm, (i) popup.

</code_context>

<specifics>
## Specific Ideas

- Owner's chosen header layout preview:
  ```
    Unlimited Wordle   (?) (stats) (gear)
    Wordubado ( o)    [ 4 | 5 | 6 ]
  ```
  The (?) (stats) (gear) icons stay hidden in Phase 3 (D-13); the (i) button sits right after the switch (D-17).
- The slang review should feel like the Phase 2 Normal review: one sheet, reply with a cut list.

</specifics>

<deferred>
## Deferred Ideas

- Phase 2 code-review warnings WR-02 (Enter on a focused on-screen key submits), WR-03 (reload-on-retry) and WR-04 (reveal timer guard): not discussed; still open in `02-REVIEW.md`. WR-03 must be fixed before Phase 4 adds saved progress. They can be fixed with `/gsd-code-review 2 --fix` or folded into a plan.
- Persisting mode/length and the "seen Wordubado popup" flag: Phase 4 (versioned storage).
- Showing slang definitions: Phase 6 (result screen "Show definition").

</deferred>

---

*Phase: 03-wordubado-mode-and-slang*
*Context gathered: 2026-10-02*
