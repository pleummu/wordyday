# Domain Pitfalls

**Domain:** Browser Wordle clone (unlimited play, 6 Boards, Day Streak + Restores, slang pools, static Vercel deploy, Playwright CI)
**Researched:** 2026-10-01
**Confidence:** MEDIUM overall. Based on well-known Wordle-clone failure modes and the settled rules in plan.txt. Findings come from domain knowledge, not fresh web verification. Browser-quirk items (iOS, Web Share, Playwright) are flagged where they should be re-checked against current docs during the relevant phase.

Phase names below are suggested labels, not final roadmap numbering:
P1 Spec/Data pipeline, P2 Core logic (scoring, picking, streaks, storage), P3 UI/Board/animation, P4 Result/Stats/Share/Definitions, P5 Polish/a11y, P6 Tests/CI/Deploy.

## Critical Pitfalls

### Pitfall 1: Repeated-letter scoring done in one pass
**What goes wrong:** The scorer marks each tile independently ("is letter in answer?"), so a guess with two Es against an answer with one E shows two yellows. Or yellows are assigned left-to-right before greens are known, so a yellow steals the count from a later green.
**Why it happens:** The naive single loop works for most words. Bugs appear only on repeated letters (ABBEY/BABES, SPEED/ERASE, and 4-letter words like LEVEL).
**Consequences:** Violates the project's Core Value. Public players notice immediately.
**Prevention:** Two-pass algorithm. Pass 1 marks greens and builds a count map of the unmatched answer letters. Pass 2 marks yellows left to right, decrementing the count. Write the unit tests first (plan.txt cases plus triple letters, all-same letters like AAAA, and every length). Use one pure `evaluate(guess, answer)` function with no UI dependency. Cover keyboard best-state merging as a separate pure function (green > yellow > gray; never downgrade).
**Detection:** Any test where tile colour counts for a letter exceed the answer's count of that letter. Add a property test: for each letter, (greens + yellows) <= count in answer.
**Phase:** P2.

### Pitfall 2: Day arithmetic with timestamps instead of calendar dates (DST/timezone)
**What goes wrong:** Missed days are computed as `(now - last) / 86400000`. On DST change days (23 or 25 h) this is off by one, and `new Date('2026-03-08')` parses as UTC midnight, which is the previous day in negative-offset zones. `toISOString().slice(0,10)` gives the UTC date, not the local date, so evening play in the Americas lands on "tomorrow".
**Why it happens:** Streak rules say "local calendar day", but JS Date defaults lean toward UTC and ms math.
**Consequences:** Streaks break or double-count at midnight and on DST weekends. Players lose streaks unfairly, which is the worst trust failure for a streak feature.
**Prevention:**
- Store dates as local `YYYY-MM-DD` strings built from `getFullYear/getMonth/getDate`.
- Compute day differences on calendar-day integers (e.g. `Date.UTC(y, m, d) / 86400000` from the parsed parts), never from local timestamps.
- Inject a `now()`/`today()` clock into `streaks.ts` so tests can fake any date.
- Test in several TZs (`TZ=America/Los_Angeles`, `Pacific/Auckland`, `Asia/Kolkata`), across DST start and end, the year boundary, and Feb 29.
- Run Vitest with a TZ matrix, or set `process.env.TZ` in the setup file.
**Detection:** Tests that pass in your timezone but fail in CI (UTC). Off-by-one at 23:00 to 01:00 local.
**Phase:** P2 (design in P1 SPEC).

### Pitfall 3: Streak/Restore state machine has gaps the plan leaves implicit
**What goes wrong:** The plan is detailed but has edge cases that will be decided ad hoc during coding:
- *Idempotency:* the missed-day check runs on open, on focus, and on date change, and the prompt reappears after refresh. Win Streaks are reset immediately, but the Day Streak decision is deferred. Running the check twice must not double-apply anything or lose the pending-prompt state.
- *Pending prompt vs playing:* can the player finish a game while the Restore prompt is unanswered? If so, lastActiveDate moves to today and the prompt's gap vanishes, silently preserving or breaking the streak. Make the modal blocking or persist a `pendingRestore` state.
- *Month used:* "counted against the month the Restore is used in", but the refill check compares `restores.month` with the current month. If the prompt appears on the 1st for a gap that began last month, the refill must happen first, then the offer.
- *Midnight with the tab open:* the date changes while a game is in progress. Which day does the finished game count for? Decide: the finish date.
- *Give Up / New game as "finished game":* the plan says any finished game (win or loss) advances the Day Streak, and Give Up counts as a loss. This allows instant Day Streak farming (Give Up once a day). Decide deliberately and write it in SPEC.md.
- *Restore sets lastActiveDate = yesterday* but `longest` and the "+1 at most once per day" guard must not treat that as "already played today".
- *Clock backwards:* today < lastActiveDate gives missed = 0, but then do not overwrite lastActiveDate with the earlier date, or the next correction produces a false huge gap.
- *Missed >= 1 but Day Streak = 0:* Win Streaks still reset; no prompt.
**Why it happens:** The rules were designed as prose; code needs a state machine.
**Consequences:** Streak bugs are subtle, reported rarely, and not reproducible without date control.
**Prevention:** Model `streaks.ts` as pure functions `(state, today) -> state` plus an explicit `pendingRestore` field. Table-driven tests from the plan's examples (Mon 1st -> Sat 6th offered, Sun 7th reset), plus every edge above. Resolve the ambiguities in SPEC.md in P1 before coding. Make the check run on `visibilitychange` and via a timer scheduled for the next local midnight (timers drift or freeze in background tabs, so re-check on focus too).
**Detection:** Two consecutive calls of the check function returning different states for the same `today`.
**Phase:** P1 (decide), P2 (implement).

### Pitfall 4: Unversioned or unvalidated localStorage state
**What goes wrong:** `JSON.parse` on corrupted, truncated or hand-edited data throws on startup and the app white-screens permanently (the bad value survives refresh). Shape changes in a later release break existing players. localStorage access itself throws in some private modes or when storage is disabled/quota exceeded (`SecurityError`, `QuotaExceededError`).
**Why it happens:** Storage is treated as always available and always trusted. Version is added "later" when there is already data in the wild.
**Consequences:** Total loss of streaks or an unrecoverable broken app. A white screen on a public site.
**Prevention:**
- Put `schemaVersion` in the very first release, even at v1, with a `migrations[]` chain (v1 -> v2 ...).
- Validate on load with a schema (zod or a hand-written guard); on failure, back up the raw string under a second key (`...:corrupt`), reset to defaults, and show a toast. Never throw at module top level.
- Wrap every `getItem/setItem` in try/catch. Fall back to in-memory state and show a "progress won't be saved" notice.
- Single storage key per concern, written atomically (one `setItem` for the whole state), so a crash cannot leave mixed versions.
- Handle the multi-tab case: listen to the `storage` event, or accept last-writer-wins and re-read before write. Two tabs playing the same Board is a realistic corruption path.
- Validate saved in-progress games against the current pools (answer no longer in the pool after a word-list change is fine, but guesses must be correct length/charset).
- "Reset my data" must clear every key, including the corrupt backup.
**Detection:** Playwright test that seeds garbage, an old version, and a throwing `localStorage` (via `addInitScript`) and expects the app to load.
**Phase:** P2 (storage), tested in P6.

### Pitfall 5: Word pools with obscure, offensive or wrong-length answers
**What goes wrong:** `wordlist-english` frequency tiers still contain obscure words, plurals, proper-noun leftovers, abbreviations, British/American variants, and crude or offensive terms. Players get unfair or embarrassing answers. Guess pool and answer pool get mixed up, so a valid guess is rejected or an obscure word becomes an answer.
**Why it happens:** Filtering by length and a-z only (as the plan's script does) does not filter quality. A blocklist is never complete.
**Consequences:** Public-facing embarrassment; unfair losses that break the Core Value ("correct play").
**Prevention:**
- Build script outputs answer pool = common-frequency tier minus blocklist; guess pool = large dictionary + all slang + all answers. Assert in the script that answers is a subset of guesses.
- Use the smallest, most common tiers for Normal answers, then manually skim the final list (4-letter lists are small enough to read in full; skim the 5 and 6 lists sorted by tier).
- Blocklist as a checked-in file with comments; include slurs, sexual and violent terms, and common obscure-plural patterns (consider dropping most plain `-s` plurals from the answer pool; this is a judgment call to record in SPEC).
- Build-time tests: no duplicates, all lowercase a-z, exact lengths, no answer in blocklist, no slang in the Normal answer pool, minimum pool sizes per length (so 25% common picks in Wordubado never hit an empty or tiny pool).
- Slang: the owner reviews each word. Words that double as slurs (or are in-group reclaimed terms) should be excluded even if "mild". Also check that slang words do not collide with the blocklist when both lists are merged into the guess pool.
- Normalise guesses to lowercase on input and store words consistently.
**Detection:** The review step finds words nobody can define. Build output counts changing unexpectedly between runs (pin the `wordlist-english` version).
**Phase:** P1 (pipeline and review process), content review again before launch.

### Pitfall 6: Input handled during animation (typing races and double-submit)
**What goes wrong:** Players type or press Enter while tiles are flipping, so a second submit happens, letters go into the next row, the reveal state mixes, or the keyboard colours update before the flip finishes (spoiling the result). Animation state kept only in CSS or timeouts goes stale when the player switches Board mid-flip or refreshes mid-reveal.
**Why it happens:** Game state is updated immediately on Enter, while the visuals are driven by `setTimeout` chains.
**Consequences:** Lost or duplicate attempts, corrupted rows, an attempt that is saved but never shown, and flaky E2E tests.
**Prevention:**
- Separate the logical state (committed instantly and saved) from presentation state (`isRevealing`). Block input while `isRevealing`, or queue at most one keystroke.
- Commit the guess to the store and storage before the animation, so a refresh mid-reveal resumes with the row already revealed (skip the animation on load).
- Delay the keyboard colour update and the result modal until the last flip ends (`onAnimationEnd` of the last tile, not a hardcoded sum of timeouts); use a single reduced-motion code path where durations become ~0.
- Ignore key events with `repeat`, modifier keys (Ctrl/Cmd+R, etc.) and events from focused buttons/inputs in modals. Make sure Enter on a focused on-screen key button doesn't fire twice (click plus keydown).
- Make the physical-keyboard listener a single `useEffect` with a stable handler, not re-attached every render (stale closures cause dropped letters).
- Switching Board or opening a modal mid-reveal: cancel the reveal and render the final state.
**Detection:** Mash-typing test; Playwright test that presses Enter twice rapidly and asserts one attempt used.
**Phase:** P3.

### Pitfall 7: Flaky Playwright E2E from animations, randomness and time
**What goes wrong:** Tests wait on arbitrary timeouts, assert mid-flip tile colours, or depend on a random answer, so they pass locally and fail in CI. Streak tests need dates the real clock cannot give.
**Why it happens:** The game is random and animated by design; neither is test-friendly.
**Consequences:** CI that people re-run until green, then ignore. CI is a learning goal of this project, so flaky tests directly defeat it.
**Prevention:**
- Add a deterministic test hook: a seeded answer (e.g. `?answer=` or `localStorage` seed, or `window.__TEST__` only when `import.meta.env.MODE === 'test'`/build flag) so tests know the answer. Make sure the hook is not exposed in production, or is harmless if it is.
- Emulate `prefers-reduced-motion: reduce` in the Playwright config (`reducedMotion: 'reduce'`) so animations collapse; the app must honour it fully (also a11y requirement).
- Assert on semantic state (`data-state="correct"` attributes, ARIA labels) with web-first auto-retrying assertions (`expect(locator).toHaveAttribute`), never `waitForTimeout`.
- Use Playwright's clock API (`page.clock.install` / `setFixedTime`) for day-boundary tests. Verify the current API in docs when writing these.
- Fresh browser context per test (isolated localStorage); `workers` and `retries: 1-2` only in CI; trace on first retry.
- Run E2E against `vite preview` (production build), not the dev server, with `webServer` in config.
- Stub `dictionaryapi.dev` with `page.route` so tests never hit the network.
- In CI, cache/install browsers (`npx playwright install --with-deps chromium`); limit to Chromium (+ WebKit if mobile coverage matters).
**Detection:** Tests that fail on re-run at random; any `waitForTimeout` in the codebase.
**Phase:** P3 (add hooks and data-attributes while building UI), P6 (suite and CI).

## Moderate Pitfalls

### Pitfall 8: Mobile viewport and keyboard issues
**What goes wrong:** `100vh` on iOS Safari is taller than the visible area (the URL bar), pushing the on-screen keyboard off-screen. Double-tap on keys zooms the page. Tapping keys causes text selection, a tap highlight, or the 300 ms delay. Rotating the phone or showing the OS keyboard shifts the layout. The page itself scrolls or pull-to-refreshes during play.
**Prevention:** Use `100dvh` (with `100vh` fallback) and a flex column layout so the grid shrinks and the keyboard stays at the bottom; size tiles with `min()`/`clamp()` from both width and height (7 rows x 6 columns for the biggest board must fit at 320-360 px wide). Set `touch-action: manipulation` on keys, `user-select: none`, `-webkit-tap-highlight-color: transparent`, and `overscroll-behavior: none`. Use `<meta name="viewport" content="width=device-width, initial-scale=1">` and do not disable zoom (accessibility). Render on-screen keys as `<button type="button">` and avoid focusing a real `<input>` (which pops the OS keyboard). Test on a real iPhone or at least a Playwright WebKit mobile profile. Re-verify current iOS behaviour of `dvh`.
**Detection:** The keyboard row clipped on a 7-attempt, 6-letter board on a small phone.
**Phase:** P3, re-verified in P5.

### Pitfall 9: Share and clipboard API quirks
**What goes wrong:** `navigator.share` and `navigator.clipboard` exist only in secure contexts (fine on Vercel HTTPS, but not on a LAN http test), require a user gesture, and reject when the user cancels the share sheet (`AbortError`, which is not an error to report). Many desktop browsers lack `navigator.share`. Clipboard writes can fail with a permissions error. Emoji grids with variation selectors render differently across platforms; the 🟧🟦 colour-blind squares can appear different from the on-screen palette. Calling share after an `await` (e.g. after a definition fetch) can lose the user gesture on Safari.
**Prevention:** Feature-detect: `navigator.canShare?.({text})` -> `share`, else `clipboard.writeText`, else a fallback (select text in a textarea and `execCommand('copy')`, or show text in a modal for manual copy). Treat `AbortError` silently. Build the share text synchronously from stored state before the click handler awaits anything. Show a "Copied" toast on success and a visible failure state. Generate the text in a pure function and unit-test it (win, loss `X/6`, colour-blind, per length and mode, trailing newline handling). Share must not leak the answer on a win-or-loss grid.
**Detection:** Share button does nothing on desktop Firefox or on an http preview.
**Phase:** P4.

### Pitfall 10: dictionaryapi.dev failures, rate limits and slow responses
**What goes wrong:** The free, keyless API has no SLA; it returns 404 for words it does not know (valid common answers can lack entries), is sometimes down, can rate-limit, and CORS or network errors look identical to "not found". A hung request leaves a spinner forever. Result shapes vary (multiple meanings, missing definitions, empty arrays).
**Prevention:** Lookup only on click (as planned). `AbortController` with a ~5 s timeout; map any non-200, network error or empty result to "Definition unavailable". Parse defensively (optional chaining; take the first non-empty definition). Cache successful results in memory (and optionally in a small localStorage cache with a cap, keeping it out of the versioned game state so it cannot corrupt it). Do not retry in a loop. Disable the button while loading to prevent request spam. Stub in tests. Consider bundling curated definitions for common answers later if the failure rate is annoying (out of scope for v1, note as a possible v2 item). Remember an offline player should still be able to finish the game: nothing but the definition may depend on the network.
**Detection:** The result modal blocking or erroring when offline (test with `context.setOffline(true)`).
**Phase:** P4.

### Pitfall 11: Word lists bloating the initial bundle
**What goes wrong:** Importing six large guess-pool JSON files statically puts hundreds of KB into the main bundle (a 4-6 letter English dictionary can be tens of thousands of words), slowing first paint on mobile. All three lengths and all pools load even if the player only uses one.
**Prevention:** Load only the pool for the active length with dynamic `import()` (Vite code-splits JSON), and show a short loading state. Store pools as one newline/space-joined string per file and `split` at load rather than a JSON array of strings (smaller; parses faster). Use a `Set` for guess validation. Do not ship the "answers" pool and "guesses" pool as duplicates (guess pool contains the answers, so store answers as a subset or flag). Check the output size in the build script and fail CI over a budget; confirm gzip/brotli (Vercel compresses). Note that a client-side answer list is inspectable; that is acceptable for an unlimited, no-stakes game, but do not claim otherwise.
**Detection:** `vite build` size report; Lighthouse.
**Phase:** P1 (format), P3 (lazy loading), P6 (size budget).

### Pitfall 12: Accessibility of the tile grid and modals
**What goes wrong:** The tile grid is plain `div`s, so screen readers hear nothing or a stream of letters; the result is conveyed by colour only (fails for colour-blind players and screen-reader users); the toast is not announced; modals do not trap or restore focus; focus is lost to `body` so physical keyboard play stops working after closing a modal; Escape does not close dialogs; `prefers-reduced-motion` is ignored.
**Prevention:** Give each tile an accessible name ("Row 2, column 3, S, correct"); use `role="grid"/row/gridcell` or a list with labels, and keep it simple. Announce each submitted row once through a single `aria-live="polite"` region (not per tile during the flip, which spams). Toasts use `role="status"`; invalid-guess toast is announced. Never rely on colour alone: also expose the state in text or an icon/pattern in the colour-blind mode. Use native `<dialog>` or a tested focus-trap library, restore focus to the trigger on close, and keep key capture from stealing keys while a modal is open. Contrast check both light and dark palettes (soft/airy design is a real contrast risk: verify 4.5:1 for letters on tiles and 3:1 for tile states). Wrap animations in `@media (prefers-reduced-motion: reduce)` and offer the same information without motion. Run axe in Playwright (`@axe-core/playwright`) on the main states.
**Detection:** The grid is unreadable with a screen reader; pastel tiles failing contrast checks.
**Phase:** P3 (structure), P5 (audit).

### Pitfall 13: Per-Board state mixing and Forfeit bookkeeping
**What goes wrong:** Six Boards share one set of component state, so letters typed on 5-letter Normal leak to 4-letter Wordubado, or switching boards writes the current guess to the wrong key. "New game" while in progress records a loss for the wrong Board, or twice (confirm clicked twice, or a refresh after confirm but before save). A finished game is recorded twice on refresh (the result modal reopens and re-records). Stats for Normal and Wordubado leak into each other, or the All tab averages divide by zero (no wins, zero games).
**Prevention:** Key everything by `boardId = ${mode}-${length}`. Keep the in-progress current-row text in persisted board state, or deliberately discard it on switching (decide in SPEC). Record results in a single reducer action that is guarded by the game `status` (`playing -> won|lost` once; recording only on that transition). Persist the finished state with the result in one write. Derive stats from stored per-board aggregates with guards for 0 games (show "-" rather than NaN). Unit-test the sequences: win, refresh on result screen, play again; new-game-confirm double-click; switching boards mid-row.
**Phase:** P2 (store design), P4 (stats).

### Pitfall 14: Answer picking bias and 75/25 logic
**What goes wrong:** `Math.floor(Math.random() * n)` is fine, but the Wordubado branch is often written so slang is unreachable when the slang list is short, or the 75/25 split is decided per word rather than per game, or the same word repeats back to back (allowed by the plan, but players perceive it as a bug; verify this is wanted). A saved game's answer is re-picked on reload (refresh lets you re-roll), or the answer is saved in plain sight and a refresh shows it in DevTools (acceptable, but note it).
**Prevention:** `pickAnswer(board, rng)` takes an injectable RNG for tests (the plan's 10,000-draw test should assert a tolerance such as 0.75 +/- 0.02 using a seeded RNG so it is not itself flaky). Persist the answer with the saved game at the moment the game starts. Ensure slang pool sizes are per-length (80-150 each) and that the 4-letter slang pool is non-trivial.
**Phase:** P2.

## Minor Pitfalls

### Pitfall 15: Physical keyboard edge cases
**What goes wrong:** Backspace/Enter keys on non-US layouts; `event.key` of "Process" with IME; letters with accents; caps lock; typing while a modal's text is selected; holding a key repeats letters.
**Prevention:** Accept only `/^[a-z]$/i` single-character `event.key`, ignore `isComposing`, ignore Ctrl/Meta/Alt combos, lowercase on entry.

### Pitfall 16: Hard-coded 5x6 assumptions
**What goes wrong:** Grid sizes, share text, stats guess-distribution bars and the CSS grid columns are written for 5 letters/6 attempts, and the 4/5/6-letter, 5/6/7-attempt variants break (distribution chart has the wrong number of bars; share shows "x/6" for 7 attempts).
**Prevention:** Derive everything from a single `BOARD_CONFIG[length] = { letters, attempts }`. Include all three sizes in the unit and E2E tests, including the smallest phone width at 6 letters x 7 attempts.

### Pitfall 17: Theme and colour-blind palette gaps
**What goes wrong:** Hard-coded hex colours in components bypass the theme; dark mode flashes light on load (theme applied after React mounts); the colour-blind setting does not apply to the keyboard or share text; theme preference ignores the OS setting on first visit.
**Prevention:** CSS custom properties per theme on `<html data-theme>`, set by a tiny inline script in `index.html` before first paint; default from `prefers-color-scheme`; every state colour (correct/present/absent, keyboard, share emoji) reads from the same setting.

### Pitfall 18: Vercel and CI integration surprises
**What goes wrong:** Node version mismatch between local, CI and Vercel; the lockfile not committed or `npm ci` failing; the build script `build-words.mjs` run in CI but its generated JSON also committed (drift), or not committed and the build fails on Vercel; E2E running against a different build than is deployed; Open Graph image using a relative URL so link previews are blank; SPA fallback not needed (single page), but a stray 404 for `favicon` or `og:image` in preview deploys.
**Prevention:** Pin Node via `.nvmrc` and `engines`; decide once whether the word JSON is generated at build (`prebuild` script, source of truth is the script and pinned `wordlist-english` version) or committed (then CI checks that regenerating produces no diff); absolute URLs in OG tags (use the production domain once known); run lint, typecheck, unit, build, then E2E against the built output, in that order, with Playwright report uploaded as an artifact on failure; set Vercel to build from the same npm script that CI runs.

### Pitfall 19: Spec drift between plan.txt, SPEC.md, and code
**What goes wrong:** plan.txt contradicts the final code on small rules (e.g. whether the Day Streak counts Give Up; the confirm text; Restore wording) and tests encode one version while the docs state another.
**Prevention:** Make SPEC.md the single source, written in P1 with every edge case from Pitfall 3 resolved; reference the SPEC section in each test name.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| P1 Spec and word pipeline | Ambiguous streak edge cases left open (3, 19); word list quality (5); data format and size (11) | Resolve edge cases in SPEC.md; blocklist plus subset/length assertions in the build script; read the lists; pin package version |
| P2 Core logic | Single-pass scoring (1); ms-based day math (2); unversioned or throwing storage (4); double-recording results (13); RNG not injectable (14) | Pure, clock- and RNG-injected functions; TZ-matrix tests; versioned schema with validation and backup |
| P3 UI and animation | Input during flip (6); 100vh and zoom (8); hard-coded 5x6 (16); no test hooks (7); a11y structure (12) | `isRevealing` gate; `dvh` layout; `BOARD_CONFIG`; `data-state` attributes and seeded-answer hook from day one |
| P4 Result, stats, share, definitions | Clipboard/share quirks (9); dictionaryapi failures (10); NaN stats (13) | Feature-detect and fall back; timeout and "unavailable" path; guard zero games |
| P5 Polish and a11y | Contrast of soft palette (12); theme flash (17); reduced motion | axe in Playwright; inline theme script; reduced-motion media query |
| P6 Tests, CI, deploy | Flaky E2E (7); Node/lockfile drift and generated-data drift (18); bundle budget (11) | Reduced-motion and fake clock in tests; E2E on built preview; size budget in CI |

## Research Flags

- P2 streak module: needs a design pass (write the state machine in SPEC.md before coding); high bug density.
- P6 Playwright clock/reduced-motion API details: re-check current Playwright docs when writing the suite.
- P3/P5 iOS Safari behaviour (`dvh`, share sheet): re-verify on a real device or WebKit profile; not verified in this research.
- Word-list content: needs owner review time; not a research problem but a scheduling one.

## Sources

- plan.txt and .planning/PROJECT.md (settled rules; Restore month and clock-backwards cases analysed directly)
- General knowledge of Wordle-clone implementations, MDN (Web Share API, Clipboard API, localStorage exceptions, `dvh` units, `prefers-reduced-motion`), Playwright docs (reducedMotion, clock, web-first assertions), WCAG 2.x. Not freshly fetched in this session; treat browser-quirk specifics as MEDIUM/LOW confidence until re-verified in the relevant phase.
