# Phase 3: Wordubado Mode and Slang - Research

**Researched:** 2026-10-02
**Domain:** Extending an existing React 19 + Zustand 5 + Vite static SPA with a second game mode, slang data in the build pipeline, a header switch, and a modal dialog
**Confidence:** HIGH (almost everything is an extension of code read in this session; no new libraries needed)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** The slang review is an early, blocking checkpoint. The first Phase 3 work regenerates `scripts/words/slang-review.md` and pauses for the owner. Wordubado is built and tested against the final reviewed list, not the draft.
- **D-02:** Owner reviews with a cut list (same as Phase 2 Normal review): they reply with the words to cut. Every word not cut becomes `reviewed: true`. Cut words are removed from `slang.json`.
- **D-03:** Every "blocklist hit" slang word is cut automatically (anything the obscenity filter or `blocklist.txt` matches, e.g. ARSE) before the owner sees the sheet. The sheet lists these as already cut. Crude words that are not blocklist hits stay in the sheet with their `crude` flag for the owner to keep or cut.
- **D-04:** Slang words that are also common English words (e.g. BARS, BAIT, SALTY) count as slang: they stay in `slang.json` and can be picked in Wordubado's 75% slang share. They stay out of Normal answers (existing rule).
- **D-05:** After review, every length must still have a usable number of reviewed slang answers. The `slang.test.mjs` count rule (80-150 per length) may need loosening if cuts go below 80; flag at the checkpoint, not silently.
- **D-06:** Wordubado's 25% common share is drawn from the Normal Answer Pool for that length (770/857/959 lists).
- **D-07:** The 75% slang share is drawn only from slang entries with `reviewed: true` for that length.
- **D-08:** Default mode on first visit is Normal.
- **D-09:** Switching mode or length while a game is in progress asks for confirmation first. "In progress" = at least one guess submitted and not yet won or lost. No guesses yet (even half-typed) or game over: switch immediately, no prompt. Confirm starts a new game in the new mode/length; cancel leaves everything as it was. Switching stays blocked while a row is revealing.
- **D-10:** The confirm is a stopgap (Phase 4 removes it). Build it on a reusable dialog so Phase 4's Modal work can absorb it.
- **D-11:** Mode and length are NOT persisted in Phase 3. Reload = Normal at default length.
- **D-12:** Single switch labelled "Wordubado" (off = Normal, on = Wordubado), exposed to AT as a switch named "Wordubado". Layout: title row on top, then the "Wordubado" switch with its (i) button next to the length picker.
- **D-13:** Help, stats and settings buttons stay hidden until their screens exist. Keep the reserved `.header-actions` slot.
- **D-14:** UI-05 is split. Phase 3 delivers mode switch + length picker. Settings counts in Phase 4, stats in Phase 5, help in Phase 7. ROADMAP Phase 3 success criterion 1 must be reworded to drop "header also has help/stats/settings buttons", and the UI-05 traceability row updated, as part of this phase's planning.
- **D-15:** Subtle Wordubado accent (e.g. title or switch tinted). Tile and key result colours do not change.
- **D-16:** (i) popup opens on tap of (i), and automatically the first time the player turns Wordubado on in a page session. "Seen" held in memory only. If that first switch needs the D-09 confirm, confirm first, popup after.
- **D-17:** The (i) button sits next to the switch, always visible.
- **D-18:** Copy short and playful, 2-3 lines: what Wordubado is (mostly slang, meme and Gen Z words, plus some normal ones) and a clear note that some words are mildly crude. Claude drafts; owner approves via the UI spec.

### Claude's Discretion
- How slang reaches the browser (field in `words-N.json` vs separate chunk), as long as pools stay out of the entry bundle (WORD-09) and only reviewed slang can be picked. Definitions not needed at runtime until Phase 6.
- Store shape for mode (e.g. `mode` next to `length`), easy to extend to six Boards keyed `${mode}-${len}` in Phase 4.
- How the 75/25 choice is made and the seeded 10,000-draw test.
- How the E2E test hook fixes a Wordubado answer; good point to address WR-01 (test hook reachable in production) if it fits.
- Dialog implementation for D-09/D-16 (focus trap, Esc, focus return), sized so Phase 4 can reuse or replace it.
- Exact accent colour, switch styling and popup copy, set in the Phase 3 UI spec.

### Deferred Ideas (OUT OF SCOPE)
- WR-02, WR-03, WR-04 from `02-REVIEW.md` (not discussed; WR-03 must be fixed before Phase 4). Can be folded into a plan at planner discretion.
- Persisting mode/length and the "seen popup" flag: Phase 4.
- Showing slang definitions: Phase 6.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WORD-01 | User can switch between Normal and Wordubado | Store `mode` + `requestSwitch` action with D-09 confirm; header switch (role="switch"); sections Architecture, Pattern 2/4 |
| WORD-03 | Slang guessable in Normal, never the answer | Already true in the pipeline (slang merged into `guesses`, dropped from answers in `buildPools`); Phase 3 adds regression tests on generated JSON and a store test; Pitfall 2 |
| WORD-04 | Wordubado answer is slang 75% / common 25% | `pickWordubadoAnswer` pure function, two rng draws, seeded 10,000-draw test; Pattern 1 |
| WORD-06 | Wordubado (i) popup explains mode + crude warning | Native `<dialog>` based `Modal` component; auto-open on first enable; Pattern 4 |
| WORD-08 | `slang.json` ~80-150 curated words/length, definitions, owner reviewed, validated by test | Review checkpoint plan, auto-cut script, updated `slang.test.mjs` (reviewed must be true, no blocklist hits, count rule); Pattern 5 |
| UI-05 | Header has mode toggle + length picker (+ buttons as screens land) | Header layout change; D-14 doc rewording of ROADMAP/REQUIREMENTS |
</phase_requirements>

## Summary

This phase needs no new dependencies. Everything is an extension of Phase 2 code that was read in full this session: `gameStore.ts` (injected deps, token-guarded `startGame`), `build-words.mjs` + `scripts/words/lib.mjs` (pure pool builder, invariants), `wordData.ts` (lazy per-length chunk), `Header.tsx`/`LengthPicker.tsx`, `check-bundle.mjs`, and the e2e helpers. Slang already flows into the `guesses` list of each `words-N.json`, and `buildPools` already removes slang words from Normal answers, so WORD-03 is largely a test-and-verify item. The new work is: (1) the owner-gated slang review and a data change that emits a reviewed-slang list per length, (2) a pure `pickWordubadoAnswer`, (3) store `mode` + guarded switch flow, (4) header switch + (i) button + a reusable modal, (5) accent token override, (6) E2E and doc rewording for D-14.

The main risk is not technical but process: D-01 makes the owner review the first task and a blocking human gate. Everything that depends on the final list (E2E picking specific slang, count assertions) must come after it, or be written against the list generically (read counts from the file, never hard-code).

**Primary recommendation:** Add a `slang` string field (space-joined reviewed slang words) to each `words-N.json` (same lazy chunk, ~1 KB extra), keep `guesses` as-is, extend `Pools` to `{ answers, slang, guesses }`, and implement the 75/25 draw as a pure function `pickWordubadoAnswer(pools, rng)` using the first draw for pool choice and the second for the word. Build a native-`<dialog>` `Modal` component used by both the confirm and the (i) popup.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Slang curation/review, auto-cut of blocklist hits | Build script (Node) | Owner (human gate) | Static data; nothing offensive or filter code ships to the browser |
| Emit reviewed slang per length | Build script | CDN/Static (committed JSON) | Generated JSON committed, CI drift check |
| 75/25 answer choice | Browser logic (`src/logic`) | Store action | Pure, rng-injected, unit-testable; picked in a store action not an effect (StrictMode rule) |
| Mode / pending-switch state | Browser store (Zustand) | none | Cross-cutting state; callable outside React |
| Mode switch UI, (i) popup, confirm dialog | Browser (React components) | none | Pure client UI |
| Accent per mode | Browser CSS (`data-mode` + token override) | none | Variable override, no JS cost |
| Test hook gating (WR-01) | Build config (Vite env) | Playwright webServer | Build-time flag so prod bundle excludes it |

## Standard Stack

No additions. Use what is installed [VERIFIED: package.json read this session].

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.8 | Components | Existing |
| zustand | ^5.0.15 | Store with `mode`, `pendingSwitch`, `infoOpen` | Existing pattern (`createGameStore(deps)`) |
| obscenity | ^0.4.6 | Build-time filter for D-03 auto-cut | Already wired in `build-words.mjs` (`isProfane`) |
| Vitest 5 / jsdom 30.1.1 / Testing Library | existing | Unit and component tests | Existing |
| Playwright 1.63 | existing | E2E (chromium + Pixel 7) | Existing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<dialog>` + `showModal()` | Hand-rolled focus trap div | Native gives top-layer, inert background, Esc, focus return for free. Do not hand-roll. |
| Native `<dialog>` | `@radix-ui/react-dialog` etc. | New dependency, bundle weight, no learning benefit; not needed |
| `slang` field in same chunk | Separate `slang-N` chunk | Extra request, extra bundle-check complexity for ~1 KB. Same chunk wins. |

**Installation:** none.

## Package Legitimacy Audit

No new packages are installed in this phase. Packages used already exist in `package.json`.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
BUILD TIME
 slang.json (reviewed flags) ──┐
 blocklist.txt + obscenity ────┼─> build-words.mjs ──> words-{4,5,6}.json
 wordlist-english ─────────────┘     (assertInvariants)   { answers, guesses, slang }
                                              │
                                              └─> slang-review.md (owner gate, D-01..D-03)

RUNTIME
 Header switch ("Wordubado") ─┐
 Length picker ───────────────┼─> store.requestSwitch({mode,length})
                              │        │
                              │   revealing? ──yes──> ignore
                              │        │no
                              │   same as active? ──yes──> ignore
                              │        │no
                              │   rows>0 && status==='playing'? ──yes──> set pendingSwitch ──> ConfirmDialog
                              │        │no                                   │ confirm        │ cancel
                              │        ▼                                     ▼                ▼
                              └──> startGame(mode,length) <──────────── applySwitch      clear pending
                                       │
                                  loadPools(length) (lazy chunk, token-guarded)
                                       │
                          mode==='wordubado'? ─yes─> pickWordubadoAnswer(pools, rng)
                                       │no               rng()<0.75 && slang.length>0 ? slang : answers
                                       ▼                  then pickAnswer(pool, rng)
                                  pickAnswer(pools.answers, rng)
                                       ▼
                                  status 'playing'
 After turning Wordubado ON (post-confirm, after load starts): if !infoSeen -> infoOpen=true, infoSeen=true
 (i) button -> infoOpen=true  ->  InfoDialog (same Modal component)
```

### Recommended Project Structure
```
src/
├── components/
│   ├── Modal.tsx            # native <dialog> wrapper (focus return, Esc, backdrop click)
│   ├── ModeSwitch.tsx       # role="switch" + (i) button
│   ├── WordubadoInfo.tsx    # popup content
│   ├── SwitchConfirm.tsx    # "this ends your current game" content
│   └── Header.tsx           # updated
├── data/wordData.ts         # Pools gains `slang`
├── logic/pickAnswer.ts      # add pickWordubadoAnswer (or new wordubado.ts)
├── state/gameStore.ts       # mode, pendingSwitch, infoOpen/infoSeen
├── state/copy.ts            # popup + confirm copy
└── styles/tokens.css        # [data-mode='wordubado'] accent override
```

### Pattern 1: Pure 75/25 pick
**What:** one draw picks the pool, a second picks the word. Both from the injected rng.
```ts
export const SLANG_SHARE = 0.75
export function pickWordubadoAnswer(
  pools: { answers: readonly string[]; slang: readonly string[] },
  rng: () => number,
): string {
  const useSlang = pools.slang.length > 0 && rng() < SLANG_SHARE
  return pickAnswer(useSlang ? pools.slang : pools.answers, rng)
}
```
Note: if `slang` is empty the `rng()` draw is skipped (short-circuit); acceptable, but keep the draw unconditional if you want a stable draw count in tests: `const r = rng(); const useSlang = pools.slang.length>0 && r < SLANG_SHARE`. Prefer the latter.
**Seeded test:** implement a small `mulberry32(seed)` in the test file (no dependency), run 10,000 `pickWordubadoAnswer` calls against fake pools (`slang=['aaaa',...]`, `answers=['bbbb',...]` disjoint), count slang hits. With p=0.75, sigma = sqrt(10000*0.75*0.25) ≈ 43; assert count in [7300, 7700] (about 4.6 sigma, deterministic anyway since seeded). Also assert every returned word belongs to the pool it came from. [ASSUMED: PRNG choice; any seeded generator works.]

### Pattern 2: Store extension (guarded switch)
- Add `mode: 'normal' | 'wordubado'` (default `'normal'`, D-08), `pendingSwitch: { mode, length } | null`, `infoOpen: boolean`, `infoSeen: boolean` (module-memory only, D-16).
- `startGame(length, mode = get().mode)` sets `mode` and `length` together at the top (same place `length` is set today) and picks the answer by mode after `loadPools` resolves, inside the existing `loadToken` guard.
- `requestSwitch(next: {mode?, length?})`: ignore if `status==='revealing'`; ignore if nothing changes (preserve existing `status !== 'error'` retry exception for length); if `rows.length > 0 && status === 'playing'` set `pendingSwitch`; else `applySwitch`.
- `confirmSwitch()` / `cancelSwitch()`; confirm calls `startGame` and clears pending.
- "In progress" definition: `rows.length > 0` and `status` in (`playing`). `revealing` is blocked earlier; `won`/`lost`/`loading`/`error` are not "in progress". Careful: `status==='loading'` after a switch has `rows: []` so it is naturally false.
- Guard: if the game ends (reveal finishes) while a confirm dialog is pending, nothing breaks; but cancelling/confirming should re-read state. Because the dialog opens only when `playing` and typing is suppressed while open (see Pitfall 3), `finishReveal` cannot fire in between.
- Auto-open popup: in `applySwitch`/`confirmSwitch`, when new mode is `'wordubado'` and `!infoSeen`, set `infoOpen: true, infoSeen: true`. Because the confirm closes first (pending cleared) the popup follows, satisfying D-16.
- Mode must be keyed so Phase 4 can derive board key `${mode}-${length}`; no extra work now.

### Pattern 3: Pools and slang data
- `lib.mjs`: `buildPools` already receives `slang`. Change `build-words.mjs` to pass ALL slang words to `buildPools` for the guess list (so unreviewed/draft words stay guessable if you keep them) but emit `slang` field = only `reviewed === true` words of that length, sorted. Since D-02 removes cut words and marks the rest reviewed, in the committed state every entry is `reviewed: true` and both lists coincide; still filter on the flag (D-07, and D-15 of Phase 2 says unreviewed can never be an answer).
- `serialisePools({answers, guesses, slang})` adds `slang` space-joined string. `wordData.ts`: `RawPools` gets `slang: string`; `toPools` splits it and keeps `guesses = new Set([...answers, ...slang, ...extra])`. NOTE `guesses` in the JSON already contains slang; union is harmless (a Set).
- `assertInvariants`: add (a) every emitted slang word is in `answers ∪ guesses`'s union (it is in `guesses`) and NOT in `answers`; (b) slang words are not blocklisted and not `isProfane` (fail the build); (c) emitted slang count >= a floor (see D-05 below). IMPORTANT: the existing "seen" duplicate check iterates `[...answers, ...guesses]` only; do not add `slang` to that list or every slang word reports as duplicated.
- Gzip budgets in `build-words.mjs` (15/30/50 KB): slang field adds only ~0.5-1 KB gzipped; verify at build. [VERIFIED: budgets read in build-words.mjs; size of addition estimated, ASSUMED small]
- `check-bundle.mjs`: sentinels are the first 20 *answers*; the slang field sits in the same chunk, so no change is strictly needed. Add one assertion that a few slang sentinel words (e.g. first 10 reviewed slang) also do NOT appear in the entry chunk (WORD-09 coverage for slang).

### Pattern 4: Modal (native dialog) and header
- `Modal.tsx`: `<dialog ref>` with `useEffect` calling `showModal()` when `open` becomes true and `close()` when false; handle the `cancel` event (Esc) by calling `onClose` and `preventDefault` so React state stays the source of truth; handle backdrop click (`e.target === dialog`). The browser returns focus to the previously focused element on `close()`. `aria-labelledby` pointing at a heading. [CITED: MDN HTMLDialogElement.showModal - inert background, Esc closes, top layer; behaviour known, not re-fetched this session -> MEDIUM]
- jsdom 30.1.1 does NOT implement `showModal`/`close` on HTMLDialogElement: `node_modules/jsdom/lib/jsdom/living/nodes/HTMLDialogElement-impl.js` has no `showModal` or `close` [VERIFIED: grep this session]. Component tests must stub them in the test setup (e.g. `HTMLDialogElement.prototype.showModal = function(){ this.setAttribute('open','') }` and `close` removing it), or in the component guard `typeof dlg.showModal === 'function'`. Put the stub in the existing test setup file/`beforeAll` of the modal tests. Real behaviour is covered in Playwright.
- `ModeSwitch.tsx`: `<button type="button" role="switch" aria-checked={mode==='wordubado'} aria-label?>` with visible text "Wordubado" (accessible name must be "Wordubado"). Space/Enter toggle on a native button already work. Disabled while `status==='revealing'` (mirror the picker, `aria-disabled`). Add `data-own-enter` to the switch, (i) button and dialog buttons so `usePhysicalKeyboard` does not treat Enter/Space as submit (WR-02 pattern: existing code returns early on `target.closest('[data-own-enter]')`). The same click-then-blur trick used in `LengthPicker` (`e.detail > 0` -> `blur()`) applies so physical Enter after a mouse click plays instead of re-toggling.
- (i) button: `aria-label="About Wordubado"`, `aria-haspopup="dialog"`.
- `Header.tsx`: row 1 title, row 2 `[ModeSwitch + (i)] [LengthPicker]`; keep empty `.header-actions` (D-13). Add `data-mode={mode}` to `.app` (or `document.documentElement`) so the accent override applies. LengthPicker should call `requestSwitch({length})` instead of `selectLength`; keep `selectLength` name or replace (update `gameStore.test.ts`, `App.test.tsx`, `e2e/*` call sites).
- Accent: `[data-mode='wordubado'] { --color-accent: ... }` override of a *dedicated* token (e.g. add `--color-mode-accent` used only by title/switch) rather than overriding `--color-accent`, because `--color-accent` is used at `game.css:224` and `:281` (verify what those style; if they are tile/key result colours D-15 forbids changing them). [VERIFIED: grep showed lines 224 and 281 use `var(--color-accent)`; their targets not inspected.] Add a contrast check to the UI spec (axe/E2E later phase; the title text must keep AA contrast in light and dark when tinted).

### Pattern 5: Slang review gate (D-01..D-05)
Order of work:
1. Task A (autonomous): write a small script step (new `scripts/words/apply-slang-review.mjs`, or a flag on `build-words.mjs`) that auto-cuts blocklist hits from `slang.json` (D-03: `isProfane(word) || blocklist.has(word)`), records them, and regenerates `slang-review.md` with a section "Already cut (blocklist hits)" listing them, keeping the existing crude/common flags. The existing `renderSlangReview` text says blocklist hits are "flagged, never dropped" and instructs keep/cut marks; update the header text to the cut-list protocol (D-02) and add the already-cut section.
2. Human gate: owner replies with cut list. A script applies it: remove cut words, set `reviewed: true` on all remaining. Keep the apply script deterministic and idempotent; run `build:words` afterwards and commit JSON.
3. Update `slang.test.mjs`: `reviewed` must be `true` for every entry (replace the current `toBe(false)` assertion, which would fail after review); add "no entry is a blocklist hit" (read `blocklist.txt` via `parseList`, and run obscenity matcher the same way as the build); keep shape, sorted, no duplicates; count rule per length (see D-05).
4. D-05 count rule: currently 98 / 110 / 95 with floor 80. The cut of ARSE-type words plus owner cuts could drop 4-letter or 6-letter below 80. Make the floor a named constant with a comment, and do NOT loosen silently: the plan task must report the actual reviewed counts at the checkpoint and set the floor with owner agreement. Recommended fallback if cuts go below 80: lower floor to the smallest value that still keeps the 75% slang share from being repetitive (suggest >= 50 per length) [ASSUMED: 50 is a judgment call, flag to owner]. Also test that the generated `words-N.json` `slang` list equals the reviewed entries of that length (guards drift).
5. Duplicate-word interplay: slang words that are common words (BARS, BAIT) are in `common` sets; `buildPools` already `dropped.slang` them from Normal answers, so Normal answer counts (770/857/959) may shift if a previously cut-or-uncut slang word changes membership. Cutting a slang word that is also a common word RETURNS it to the Normal answer pool unless it is in `exclude.txt`. Pitfall 2 below. Surface the Normal pool counts in the build log and in `pools.test.mjs` expectations; check `pools.test.mjs` for hard-coded counts before the review lands.

### Anti-Patterns to Avoid
- Picking the answer in a `useEffect` (StrictMode double-pick); stay in store actions.
- Importing `slang.json` into `src/` (it carries definitions and crude flags; ship only the word list in the chunk).
- Loosening the slang count test quietly (D-05).
- Hand-rolling a focus trap.
- Overriding result colours with the mode accent (D-15).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal focus trap, Esc, focus return, inert background | Custom div + key handlers | Native `<dialog>.showModal()` | Free, accessible, top-layer |
| Profanity detection for D-03 | New regexes | Existing `isProfane` (obscenity) + `blocklist.txt` in `build-words.mjs` | Already wired and tested |
| Seeded RNG in tests | npm package | 6-line `mulberry32` in the test file | Single use, no dependency |
| Switch semantics | Div with click handler | `<button role="switch" aria-checked>` | Native keyboard + AT support |
| Persisted "seen popup" | localStorage code | In-memory flag (D-16) | Phase 4 owns storage |

## Runtime State Inventory

Not a rename/refactor phase. Skipped. Note for completeness: no persisted state exists yet (localStorage arrives in Phase 4), so there is no stored data to migrate.

## Common Pitfalls

### Pitfall 1: Slang test asserts `reviewed: false`
**What goes wrong:** `slang.test.mjs` currently expects every entry `reviewed === false`; after the owner review it fails.
**How to avoid:** change to `true` in the same task that applies the review; run the test in the review-apply task.

### Pitfall 2: Cutting a slang word that is also a common word re-admits it to Normal answers
**What goes wrong:** `buildPools` removes any slang-listed word from Normal answers (`dropped.slang`). If the owner cuts e.g. BARS from `slang.json`, it re-enters Normal answers (and shifts 770/857/959), possibly after the Phase 2 owner review that never saw it as a candidate.
**How to avoid:** when applying cuts, for each cut word that is in the common set, either add it to `exclude.txt` or call it out to the owner. Print the diff of Normal pool counts per length in the build log. Also keep `pools.test.mjs` assertions about counts consistent (inspect before editing).
**Warning signs:** `answers` count changes after applying the cut list.

### Pitfall 3: Keystrokes leak to the game while a dialog is open
**What goes wrong:** `usePhysicalKeyboard` listens on `window`; letters or Enter pressed with the dialog open would type/submit in the hidden game.
**How to avoid:** early-return in the handler when `pendingSwitch !== null || infoOpen`, or when `e.target` is inside a `dialog`. Add a unit test. Native dialog makes the background inert for pointer/focus but window keydown still fires for the focused dialog button.

### Pitfall 4: Enter/Space on the new switch or dialog buttons triggers submit
**Why:** existing handler treats Enter/Space globally except inside `[data-own-enter]`. **How to avoid:** add `data-own-enter` to switch, (i), and dialog buttons (WR-02 style); test with Enter on the focused switch.

### Pitfall 5: Stale async load after fast switching
**What goes wrong:** user switches mode then length quickly; an older `loadPools` resolves later. **How to avoid:** `startGame` already uses `loadToken`; make sure the mode is also set inside `startGame` (not separately) and the answer is chosen using the mode captured at call time (`const m = mode`), not re-read after the await. WR-04 (reveal timer not token guarded): a new game started via confirm while `revealing` cannot happen (blocked) but a won/lost -> switch -> old timer can't fire either because `finishReveal` early-returns when status is not `revealing`. Still, add a test that a switch immediately after a reveal completes starts clean.

### Pitfall 6: jsdom lacks `showModal`
See Pattern 4: stub in tests, or component tests throw `showModal is not a function`. [VERIFIED]

### Pitfall 7: Auto-opening the popup collides with loading/confirm
Open the info popup only after the confirm closes; do not open it when the switch is cancelled; `infoSeen` is set when it auto-opens, not when the switch is merely requested.

### Pitfall 8: Test hook answer in Wordubado
`readTestAnswer(length, pools.guesses)` ignores mode and only accepts words in `guesses`; a slang word like `bruh` is in `guesses`, so it works for Wordubado E2E, but it also overrides Normal mode answers (a test could then "win" Normal with a slang word, undermining the "never the answer" claim). For E2E of WORD-03, assert guessability in Normal (type a slang word, row accepted) with the hook fixing a normal answer, not that slang never appears. The "never the answer" guarantee belongs to build-time invariants plus a unit test over the generated JSON.

### Pitfall 9: WR-01 gating breaks Playwright
Gate with `import.meta.env.VITE_E2E === 'true'`. Playwright's `webServer.command` currently runs `npm run build && npm run preview`; change to `VITE_E2E=true npm run build && ...` (cross-platform: use `cross-env`, or set via Playwright `webServer.env`: `env: { VITE_E2E: 'true' }` which applies to the command process, including the build) [CITED: Playwright webServer `env` option; MEDIUM]. Then add a check in `check-bundle.mjs` asserting `__WORDLE_TEST__` is absent from a normal build, run in CI against the non-E2E build (CI order: build, check:bundle, then E2E build overwrites `dist`). Optional for this phase (flagged "if it fits"); it touches `ci.yml` ordering, so it is a separate small plan.

## Code Examples

### Dialog wrapper core
```tsx
// Source: MDN HTMLDialogElement (showModal/close, cancel event)
useEffect(() => {
  const d = ref.current
  if (!d) return
  if (open && !d.open) d.showModal()
  if (!open && d.open) d.close()
}, [open])
// <dialog ref={ref} aria-labelledby={id} onCancel={(e)=>{e.preventDefault(); onClose()}}
//         onClick={(e)=>{ if (e.target === e.currentTarget) onClose() }}>
```

### Generated JSON shape
```json
{ "answers": "able acid ...", "guesses": "aahs ...", "slang": "aight baka ..." }
```

### E2E sketch
```ts
await page.getByRole('switch', { name: 'Wordubado' }).click()   // popup auto-opens first time
await expect(page.getByRole('dialog')).toContainText(/crude/i)
await page.keyboard.press('Escape')
// confirm path: type a guess in Normal first, then toggle -> dialog "ends your current game"
```
Hook change for Wordubado win: extend `__WORDLE_TEST__` type to `{ answers?: Partial<Record<4|5|6,string>> }` (unchanged); use a slang word (read it from `src/data/words-5.json` in the test, never hard-code, because the owner's cuts decide membership).

## State of the Art

| Old | Current | Impact |
|-----|---------|--------|
| Custom modal focus traps | Native `<dialog>` | Fewer lines, built-in a11y; jsdom needs stubs |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Slang field adds only ~0.5-1 KB gzip, within budgets | Pattern 3 | Build throws on gzip budget; trivial to raise |
| A2 | Floor of 50 per length as fallback if cuts go below 80 | Pattern 5 | Owner may want a different floor; must be confirmed at checkpoint |
| A3 | Seeded test bounds [7300, 7700] for 10,000 draws | Pattern 1 | None (deterministic); tighten if desired |
| A4 | Native dialog behaviours (focus return, Esc) per MDN knowledge, not re-fetched | Pattern 4 | Minor; confirm in Playwright |
| A5 | `webServer.env` reaches the build step of the combined command | Pitfall 9 | Use `cross-env` instead |
| A6 | `--color-accent` at game.css:224/281 styles something other than result colours | Pattern 4 | If it is a tile/key colour, use a separate token (recommended anyway) |

## Open Questions

1. **Owner cut list outcome and D-05 floor.** Unknown until the checkpoint; plan a decision point after counts are known.
2. **Should WR-01 (test hook gating) be in this phase?** Recommend a separate small plan late in the phase; it touches CI and Playwright config.
3. **Popup copy and accent colour.** Decided in the Phase 3 UI spec (owner approves wording). The planner should not invent final copy without that spec.
4. **ROADMAP/REQUIREMENTS edits for D-14** (reword success criterion 1, UI-05 traceability row) are a doc task in this phase; UI-05 stays "Pending" in the traceability table until help lands in Phase 7 (or the table is split per button).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, tests | yes | 24.19.0 | none needed |
| node_modules (obscenity, jsdom, vitest, playwright) | everything | yes | installed (167 entries) | none |
| Playwright browsers | E2E | per memory note, `npx playwright install` times out here; use curl + unzip into ms-playwright | n/a | existing manual install from Phase 2 |

No missing blocking dependencies.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.3 (node for logic/scripts, jsdom for components) + Playwright 1.63.0 [VERIFIED: 02-VALIDATION.md] |
| Config file | `vite.config.ts` (includes `scripts/`), `playwright.config.ts` |
| Quick run command | `npx vitest run src/logic src/data src/state src/components scripts` |
| Full suite command | `npm run lint && npm run typecheck && npm test && npm run build && npm run check:bundle && npx playwright test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WORD-04 | 10,000 seeded draws give ~75% slang, each word from its own pool; empty-slang fallback | unit | `npx vitest run src/logic/pickAnswer.test.ts` | extend (Wave 0 for new cases) |
| WORD-04 | Store picks via mode in `startGame`; Normal never draws slang | unit | `npx vitest run src/state/gameStore.test.ts` | extend |
| WORD-03 | Generated `answers` contain no slang word; every slang word is in `guesses`; Normal accepts a slang guess | unit + e2e | `npx vitest run scripts/words/pools.test.mjs`; `npx playwright test e2e/wordubado.spec.ts` | new e2e file Wave 0 |
| WORD-08 | slang.json shape, all reviewed true, no blocklist hits, no dupes, count floor/ceiling, `words-N.json` slang field equals reviewed entries | unit | `npx vitest run scripts/words/slang.test.mjs` | exists, must be edited |
| WORD-01 | Switch toggles mode; confirm only when rows>0 and status playing; blocked when revealing; cancel keeps state; confirm restarts | unit (store) + component + e2e | `npx vitest run src/state src/components` | extend / new |
| WORD-06 | (i) opens dialog with crude warning; auto-opens once on first enable (after confirm); Esc closes; focus returns | component (stubbed dialog) + e2e | `npx playwright test e2e/wordubado.spec.ts` | new |
| UI-05 | Header shows switch + picker, no help/stats/settings buttons; switch has accessible name "Wordubado" | component + e2e (role query) | `npx vitest run src/components/Header` | new |
| WORD-09 (regression) | Slang words not in entry chunk | build check | `npm run build && npm run check:bundle` | extend script |
| Keys | Physical keys ignored while dialog open; Enter on switch does not submit | component | `npx vitest run src/components` | new |

### Sampling Rate
- Per task commit: quick run command for touched dirs
- Per wave merge: full unit suite (`npm test`) + `npm run build:words && git diff --exit-code src/data scripts/words`
- Phase gate: full suite green, owner has signed off the slang review

### Wave 0 Gaps
- [ ] jsdom `HTMLDialogElement.showModal/close` stub in test setup (needed by Modal/Header component tests)
- [ ] `e2e/wordubado.spec.ts` (switch, popup, confirm, win with slang answer read from words JSON)
- [ ] Seeded RNG helper inside `pickAnswer.test.ts`
- [ ] Update `slang.test.mjs` (reviewed true) after the review lands, not before (it would otherwise pass wrongly or fail the checkpoint)

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4 Auth, session, access | no | static client-only app |
| V5 Input validation | limited | guesses already restricted to `[a-zA-Z]` and Set lookup; render popup and definition text as React text (no `dangerouslySetInnerHTML`) |
| V6 Cryptography | no | none |

### Known Threat Patterns
| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| Content risk: slur or hate term shipped as answer | Reputation | Build-time auto-cut (D-03), obscenity + blocklist invariant failing the build, owner review, test over final `slang.json` |
| Test hook lets a player fix the answer in prod (WR-01) | Tampering (cheating only) | Build-time `VITE_E2E` gate + bundle assertion |
| Offensive word list in the entry bundle | Reputation | Keep slang in lazy per-length chunk; bundle check |

## Sources

### Primary (HIGH confidence)
- Local codebase read this session: `src/state/gameStore.ts`, `src/data/wordData.ts`, `src/state/testHook.ts`, `src/components/Header.tsx`, `LengthPicker.tsx`, `App.tsx`, `usePhysicalKeyboard.ts`, `scripts/build-words.mjs`, `scripts/words/lib.mjs`, `scripts/words/slang.test.mjs`, `scripts/check-bundle.mjs`, `e2e/helpers.ts`, `playwright.config.ts`, `package.json`
- `node_modules/jsdom/lib/jsdom/living/nodes/HTMLDialogElement-impl.js` (no showModal/close)
- 03-CONTEXT.md, REQUIREMENTS.md, SPEC.md, GLOSSARY.md, 02-REVIEW.md

### Secondary (MEDIUM)
- MDN `<dialog>`/`showModal` behaviour and Playwright `webServer.env`, from knowledge, not re-fetched

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages, all from the repo
- Architecture: HIGH - direct extension of read code
- Pitfalls: HIGH for code-derived items (1-6), MEDIUM for CI/Playwright env (9)

**Research date:** 2026-10-02
**Valid until:** 2026-11-01
