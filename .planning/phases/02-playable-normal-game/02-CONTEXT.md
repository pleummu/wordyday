# Phase 2: Playable Normal Game - Context

**Gathered:** 2026-10-01
**Status:** Ready for planning

<domain>
## Phase Boundary

One playable Normal game at 4, 5 or 6 letters (5/6/7 attempts) in the browser. It covers correct two-pass scoring, Guess Pool validation with shake and toast, on-screen and physical keyboards with best-state keys, pop/flip/shake animations with input blocked mid-reveal, the answer revealed on a loss, Play again, a 320 px dvh-safe layout and reduced-motion support. It also delivers the word-data pipeline that feeds the game: `scripts/build-words.mjs`, the blocklist, the committed per-length JSON, lazy loading per length, the CI drift check, and a first draft of `slang.json` (merged into guesses).

Not in scope: Mode toggle and Wordubado answers (Phase 3), persistence and six Boards (Phase 4), streaks and stats (Phase 5), the result modal, share and definitions (Phase 6), dark and colour-blind themes, How-to-play and the full a11y pass (Phase 7), and full CI with branch protection (Phase 8).

Requirements: PLAY-01..06, WORD-02, WORD-05, WORD-07, WORD-09, UI-01, UI-06, UI-09, QA-06.

</domain>

<decisions>
## Implementation Decisions

Already locked elsewhere and not re-decided here: the scoring algorithm and input rules (SPEC.md R-SCORE-*, R-GUESS-*), pool rules (R-POOL-1..9), and every visual, animation, copy, layout and loading/error decision in `02-UI-SPEC.md`.

### Answer pool (Normal)
- **D-01:** Normal answer candidates come from `wordlist-english` tiers **10 + 20** (english/10 and english/20, American list), filtered to the exact length.
  - *Owner confirmed 2026-10-01: union with english/american/10 and /20* (answer source = english/10 + english/20 + english/american/10 + english/american/20).
- **D-02:** Plurals and inflections (R-POOL-7) are detected with a **stem-in-list check**. A word is dropped only if stripping the suffix gives another real word in the source list. Rules to cover: `-s`, `-es`, `-ies→y`, `-ed`, `-ing`, doubled consonant (STOPPED→STOP), and silent-e (BAKED→BAKE). This means GLASS, BLESS, THING, BRING, KING, NEED and SEED stay. Dropped words remain valid guesses.
- **D-03:** Profanity filtering uses the **`obscenity` package's English preset plus a checked-in, commented `blocklist.txt`** for slurs, hate terms, sexual and violent words that obscenity misses. The blocklist applies to answers only (R-POOL-6).
- **D-04:** **Mildly crude but not profane words are allowed as Normal answers.** Only true profanity, slurs, hate terms and anything the owner cuts at review are removed. This deliberately relaxes PROJECT.md's "clean common words" wording; the owner's review checkpoint (D-07) is the safety net.
- **D-05:** British spellings are **not** filtered out of Normal answers. Abbreviations, acronyms and proper-noun leftovers **are** filtered out; plain lowercase a-z already handles most of this, and the script should catch any that remain.
- **D-06:** The build **fails if any length has fewer than a minimum number of answers** after filtering (Claude sets N from measured counts; around 300 is the floor in mind). This catches over-filtering.
- **D-07:** **Human checkpoint (blocking):** after the build script first produces the pools, the plan pauses so the owner can review the Normal answer lists (4-letter in full, 5 and 6 skimmed). Words to cut go into a checked-in, commented `exclude.txt`, which the build applies to answers. Then the build re-runs. Phase 2 is not done until this review happens.

### Guess pool
- **D-08:** The Guess Pool is the **full dictionary**: all `wordlist-english` tiers (10 through 95), **including British, Canadian and Australian variant lists**, plus all answers, plus all slang, plus `extra-guesses.txt`. It is filtered to plain a-z and the exact length.
- **D-09:** Words with apostrophes, hyphens, accents or other non a-z characters are **dropped**, not normalised.
- **D-10:** A checked-in, commented **`extra-guesses.txt`** lets a missing real word be added to guesses with a one-line PR and a rebuild.
- **D-11:** The build reports the gzipped size per length and **fails over a size budget** (Claude sets the ceiling from the measured size plus headroom).
- **D-12:** Loading is **one lazy chunk per length** containing both answers and guesses. The keyboard enables when the chunk arrives (the UI-SPEC loading state). No prefetching of other lengths.
- **D-13:** Build invariants are asserted in the script and/or tests: answers ⊆ guesses, all slang ⊆ guesses, no duplicates, lowercase a-z only, exact lengths, no blocklisted or `exclude.txt` word among answers, no slang in the Normal answers.

### Slang in Phase 2
- **D-14:** Claude **drafts `slang.json` in Phase 2** (about 80-150 words per length, with definitions). The build **merges it into the Guess Pool now**, so slang is typeable in Normal (R-POOL-2). It is never a Normal answer.
- **D-15:** Entry shape: `{ word, definition, crude: boolean, reviewed: boolean }`. `reviewed` starts `false`. Phase 3 must refuse unreviewed words as Wordubado answers.
- **D-16:** The build also writes a **generated `slang-review.md`** table (word, length, definition, crude, flags) for the owner to mark keep/cut. Claude applies the marks back to `slang.json`. The owner's review runs in parallel and must finish before Phase 3 ships Wordubado. It is **not** a Phase 2 blocker.
- **D-17:** A slang word that collides with obscenity or `blocklist.txt` is **not silently dropped**. It is flagged "blocklist hit" in `slang-review.md` for the owner to decide. Slurs and hate terms are always cut (R-POOL-8).
- **D-18:** A validation test for `slang.json` covers the shape, lengths 4-6, a-z only, no duplicates, and a non-empty definition.

### Testing depth
- **D-19:** **A small Playwright E2E suite lands in Phase 2.** Install `@playwright/test` with a Chromium project and a mobile (Pixel 7) project, running against `vite preview` (the production build). Tests: win a game, lose a game (answer revealed in the banner), an invalid/short word shakes without using an attempt, and **no vertical scroll for 6 letters at 320x500, 320x568 and 320x640** (from the UI-SPEC). Add an `e2e` CI job and upload `playwright-report`. Full E2E coverage still completes in Phase 8 (QA-03).
- **D-20:** **The CI word-drift check is added now:** `npm run build:words && git diff --exit-code` on the generated word files (WORD-07).
- **D-21:** Scoring and answer picking are pure modules in `src/logic/`, written **test-first** (per the ROADMAP note). The R-SCORE-2 and R-SCORE-3 worked examples are test cases.

### Test-only answer control
- **D-22:** `pickAnswer` takes an **injectable random function**. E2E fixes the answer through a **test hook set by Playwright's `addInitScript`** before page load (e.g. `window.__TEST_SEED__` or a direct answer override read at startup). There is **no URL parameter and no user-visible way** to choose the answer in production.

### Claude's Discretion
- State shape for the single Phase 2 game (Zustand store vs a reducer), as long as store actions, not effects, pick answers and score results (StrictMode pitfall), and the shape extends cleanly to six Boards in Phase 4.
- Generated file format and location (e.g. `src/data/words-{4,5,6}.json` with answers stored as a subset/flag rather than duplicated; newline-joined string vs array).
- Exact minimum pool size (D-06) and size budget (D-11), set from measured numbers.
- The exact name and shape of the E2E test hook (D-22).
- Where `blocklist.txt`, `exclude.txt`, `extra-guesses.txt`, `slang.json` and `slang-review.md` live (e.g. `scripts/words/` or `data/`), as long as they are checked in and commented.
- The `obscenity` API details: check its README at execution time; the research notes its API names are from memory.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Game rules
- `SPEC.md` §2 (R-LEN-1), §3 (R-POOL-1..9), §4 (R-GUESS-1..6, R-SCORE-1..3), §11 (R-UI-4, R-UI-8): the rules this phase implements, with stable IDs to cite in tests
- `GLOSSARY.md`: terms (Board, Answer Pool, Guess Pool, Normal, Wordubado)
- `.planning/REQUIREMENTS.md`: PLAY-01..06, WORD-02, WORD-05, WORD-07, WORD-09, UI-01, UI-06, UI-09, QA-06

### UI contract
- `.planning/phases/02-playable-normal-game/02-UI-SPEC.md`: approved visual and interaction contract (tokens, layout fit proof, animation timings, copy, loading/error states, reduced motion, focus rules)

### Research
- `.planning/research/ARCHITECTURE.md`: module boundaries (`src/logic`, build script, `wordData.ts` loader), build order
- `.planning/research/PITFALLS.md`: word-list quality, pool size/format, StrictMode double-invoke, injectable RNG
- `.planning/research/STACK.md` and `CLAUDE.md` §Technology Stack: pinned versions (Playwright 1.63, obscenity 0.4.6, wordlist-english 1.2.1, Zustand 5), the CI job layout
- `.planning/research/SUMMARY.md`: tier counts, owner decisions

### Prior phase
- `.planning/phases/01-foundation-spec-and-ci-skeleton/01-CONTEXT.md`: D-13 (branch + PR flow), folder skeleton
- `.github/workflows/ci.yml`: existing `check` job to extend with drift and e2e jobs
- `docs/PIPELINE.md`: learning guide; update its markers as the word build, E2E and CI jobs become real

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/logic/boards.ts`: `BOARD_CONFIG` (4→5, 5→6, 6→7 attempts) and the `WordLength` type, with a test in `src/logic/boards.test.ts`. Use it for grid sizing and attempts.
- `src/styles/tokens.css`: Phase 1 tokens (`--color-bg`, `--color-text`, `--color-muted`, `--color-accent`, `--space-1..4`, `--radius-*`, `--font-body`). The UI-SPEC extends these; don't replace them.
- `src/styles/global.css`, `src/App.tsx`, `src/App.test.tsx`: placeholder app and smoke test, to be replaced by the game shell.

### Established Patterns
- Logic tests are colocated (`*.test.ts` next to the module) and run in Vitest's node environment; component tests use jsdom.
- npm scripts: `lint`, `format:check`, `typecheck`, `test`, `build`. Add `build:words` and `test:e2e`.
- TypeScript is pinned at `~6.0.3`. Zustand is not installed yet. Playwright, obscenity and wordlist-english are not installed yet.

### Integration Points
- `src/main.tsx` mounts `App`. The game shell replaces the placeholder.
- CI: `.github/workflows/ci.yml` (Node from `.nvmrc` = 24). Vercel previews per PR already work.

</code_context>

<specifics>
## Specific Ideas

- Stem-check examples to test: BOATS→drop, STOPPED→drop, BAKED→drop, CITIES→drop; GLASS, BLESS, THING, BRING, NEED stay.
- Slang review is a readable markdown table, not raw JSON.
- E2E 320 px checks run at 320x500, 320x568 and 320x640 with 6 letters.

</specifics>

<deferred>
## Deferred Ideas

- "Prefetch other lengths" for instant length switching: not chosen; revisit if switching feels slow.
- Interactive artifact page for slang review: not chosen in favour of a markdown review sheet.

</deferred>

---

*Phase: 02-playable-normal-game*
*Context gathered: 2026-10-01*
