# Phase 6: Result Screen, Share and Definitions - Research

**Researched:** 2026-10-12
**Domain:** React 19 + Zustand result modal, Web Share / Clipboard, third-party dictionary fetch, build-time word data
**Confidence:** MEDIUM-HIGH (codebase facts HIGH; dictionaryapi.dev live behaviour could not be verified, see Open Questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Locked elsewhere (SPEC §10 R-RESULT-1/2, R-SHARE-1..3; R-BOARD-4; Phase 4 D-03, D-06; Phase 5 D-04, D-11, D-12, D-14, D-21; GLOSSARY Forfeit gets no Result modal).

- **D-01** Result modal (shared `Modal`) plus slim banner with "See result" and Play again. Must pass 320x500 no-scroll checks in `e2e/layout.spec.ts`.
- **D-02** Modal auto-opens only right after finishing in this session (`finishReveal` for win/loss, right after confirmed Give Up). Later visits show only the banner.
- **D-03** Restore prompt and streak-break modal win over the Result modal; ordering is Claude's discretion.
- **D-04** Modal stats: this Board only, compact (Played, Win %, Streak, Best + guess distribution with just-won row highlighted). No tabs/toggle/Day Streak footer. Reuse StatsModal pieces and "—" rules.
- **D-05** Win Streak moves into modal; banner `winStreakLine` removed; Day Streak toast stays at reveal end.
- **D-06** Play again in modal = banner Play again, closes modal.
- **D-07** "Show definition" hidden until clicked; reveals in place.
- **D-08** Wordubado + answer in that length's reviewed slang list => curated definition only, no network. Everything else => dictionaryapi.dev.
- **D-09** dictionaryapi.dev shows top 1-2 senses with part of speech + "Source: dictionaryapi.dev" credit; short enough for phone.
- **D-10** Loading state; give up after 5 s, and on offline/404/network error/bad shape => "Definition unavailable" + "Try again".
- **D-11** Slang `crude` flag changes nothing.
- **D-12** Header: Wordubado `Unlimited Wordle - Wordubado 5 - 4/6`; Normal `Wordle 5 - 4/6`. Update SPEC.md §10 to record this.
- **D-13** Loss and Give Up share as `X/n`; no "gave up" marker.
- **D-14** Emoji grid: submitted rows only; 🟩🟨⬜ normal, 🟧🟦⬜ colour-blind; never letters.
- **D-15** URL = `window.location.origin`.
- **D-16** Builder takes `colourBlind` flag, both variants unit-tested; flag reads a settings value defaulting false; no colour-blind UI.
- **D-17** `navigator.share` only when it exists and device is touch-first; desktop always clipboard + "Copied" toast.
- **D-18** `AbortError` => nothing; other share error => clipboard fallback.
- **D-19** Clipboard failure => selectable read-only textarea + note "Couldn't copy. Select the text and copy it."
- **D-20** Auto-open waits: win = bounce end + ~400 ms; loss ~600 ms; Give Up immediate. Derive from same timing source as `revealDurationMs`.
- **D-21** (Phase 6) Input blocked from reveal end until the modal opens; modal always opens (subject to D-03).
- **D-22** Win gets a gentle flourish; no confetti.
- **D-23** Reduced motion: no flourish, ~300 ms pause.
- **D-24** Revealed definition stays revealed on that Board (in memory); no second click, no second lookup.
- **D-25** Revealed state in memory only; reload/Board switch hides; Play again resets. No saved-doc change, no migration.
- **D-26** Failed lookups not cached; reopening retries automatically; only successes cached per session.
- **D-27** No emoji preview in modal.
- **D-28** After successful copy the Share button reads "Copied ✓" ~2 s; "Copied" toast still shows; screen readers announced once. Share-sheet path changes neither.
- **D-29** Share appears in modal only.
- **D-30** Play again gets focus on open; guard against held/repeated Enter from the final submit.
- **D-31** Modal closed on finished Board: letters/Enter do nothing.

### Claude's Discretion
- How curated slang definitions reach the browser (must stay out of entry bundle, WORD-09 / `scripts/check-bundle.mjs`, must not loosen reviewed-only rule).
- dictionaryapi.dev fetch details (AbortController timeout, shape guard, session cache, E2E route stub). Research must confirm CORS and response shape.
- Touch-device check (incl. iPadOS); iOS share/clipboard user-activation.
- Modal ordering with Restore prompt, break modal, Day Streak toast.
- Focus handling; banner autoFocus adaptation.
- Banner wording and modal copy (now fixed in 06-UI-SPEC.md).
- Where modal state lives (new `DialogName` `'result'` vs separate state) and `isInputBlocked` interaction.

### Deferred Ideas (OUT OF SCOPE)
- Colour-blind toggle in Settings and colour-blind tile colours: Phase 7 (only the share seam here).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RSLT-01 | Finished game shows won/lost, answer, attempts, stats, Play again | Result modal on shared `Modal`; stats from `deriveStats(stats, mode, length)`; store `stats[key].last` for highlight |
| RSLT-02 | "Show definition" hidden until click; curated slang or dictionaryapi.dev; "Definition unavailable" on failure | New lazy slang-defs in `words-N.json`; `lookupDefinition()` with AbortController 5 s + shape guard |
| RSLT-03 | Share emoji grid with header + URL; X/n on loss; orange/blue in colour-blind mode | Pure `buildShareText()` in `src/logic/share.ts` |
| RSLT-04 | Phones get share sheet; otherwise clipboard + "Copied" toast | `shareResult()` sync-in-click, device test, fallback chain |
</phase_requirements>

## Summary

The phase is mostly assembly on top of existing, well-factored pieces: a native-`<dialog>` `Modal` (with `data-initial-focus`, opener-focus restore, close animation), `deriveStats` (already returns `highlightRow`, `winStreak`, `bestWinStreak`, `dist` per Board), a `dialog: DialogName | null` field in `gameStore`, `revealDurationMs` as timing source, and a single toast slot. Stats are recorded at submit (Phase 5 D-21), so by the time the Result modal opens the Board's stats already include the finished game and `stats[key].last` identifies the just-won row; no extra bookkeeping is needed.

Three real risks need planner attention. (1) **dictionaryapi.dev returned HTTP 522 (Cloudflare "origin unreachable") for every request I made on 2026-10-12 (hello, crane, a nonsense word)**, and its GitHub tracker has a recent "website down" report. So I could not verify CORS or the 404 body live; the feature must treat "unavailable" as a first-class, common path, never block on it, and E2E must stub the network entirely. (2) **Toast vs modal**: the existing `Toast` is page-level and a `showModal()` dialog makes the rest of the document inert. A popover in the top layer will render visibly above the dialog, but is still outside the modal's subtree, so its `role="status"` text is likely not announced; render the active toast (or a hidden live region) inside the open dialog for the "Copied" announcement. (3) **Bundle/budget**: slang definitions must go in the lazy per-length chunk with `GZIP_BUDGET` (15/30/50 KB) and `check-bundle.mjs` re-verified.

**Primary recommendation:** Add `'result'` to `DialogName` plus transient store fields (`resultReady`/open scheduling via the existing `deps.setTimer`), put curated definitions in a new `defs` field of each `words-N.json` (only reviewed slang of that length), implement `buildShareText` and `lookupDefinition` as pure/injectable modules in `src/logic/`, and call `navigator.share`/`clipboard.writeText` synchronously from the click handler with a prebuilt string.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Result modal, banner, definition panel | Browser / Client | — | Static SPA, no server |
| Auto-open scheduling, input block | Browser (Zustand store) | — | Must sit with `finishReveal`/`isInputBlocked` |
| Share text building | Browser (pure `src/logic/share.ts`) | — | Pure, node-env unit tests |
| Share sheet / clipboard | Browser APIs | — | User-activation bound |
| Curated slang definitions | CDN / Static (lazy JSON chunk) | Build script | Generated by `scripts/build-words.mjs` |
| Common-word definitions | External API (dictionaryapi.dev) via browser `fetch` | — | No server functions allowed |
| Definition session cache | Browser memory (module Map) | — | D-25: not persisted |

## Standard Stack

No new runtime dependencies. [VERIFIED: package.json] Use existing React 19, Zustand 5, Vitest 5, Playwright 1.63, @axe-core/playwright 4.13, jsdom 30, @testing-library/react 16. Plain `fetch`, `AbortController`, `navigator.share`, `navigator.clipboard`, `matchMedia`, HTML `popover` are platform APIs.

### Package Legitimacy Audit
No external packages are installed in this phase. **Packages removed: none. Packages flagged: none.** slopcheck not needed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `'result'` DialogName | Separate `resultOpen` boolean | See Architecture Pattern 1; `DialogName` reuses closeConfirms/Restore-wins logic but see pitfalls |
| Native popover toast | Render toast inside open dialog | Inside-dialog is the safer a11y choice (see Pitfall 2) |

## Architecture Patterns

### System Architecture Diagram

```
submit() --> finishGame(record stats @submit) --> status 'revealing' --> setTimer(revealDuration+50)
                                                                              |
                                                                       finishReveal()
                                          status won/lost, finishedInSession, toasts (Day Streak)
                                                                              |
                                      schedule openResult(delay: win BOUNCE+400 | loss 600 | reduced 300)
                                                    (isInputBlocked true while pending)
                                                                              |
                          pendingRestore || breakNotice/dialog 'streak-break' ? --yes--> skip (banner "See result" remains)
                                                                              | no
                                                                      dialog = 'result'
 giveUp() --(~120 ms after confirm closes)------------------------------------^

 ResultModal --Show definition--> useDefinition(answer, mode, length)
        slang in defs (wordubado)  --> curated text (sync, no fetch)
        else sessionCache hit      --> cached senses
        else fetch api.dictionaryapi.dev (AbortController 5 s) --> guard shape --> cache | "Definition unavailable"+Try again
 ResultModal --Share click--> buildShareText (precomputed) --> [touch? navigator.share] / clipboard.writeText
        AbortError -> nothing | other error/desktop -> clipboard | clipboard fail -> read-only textarea
 ResultModal --Play again--> playAgain() (same as banner) -> closes dialog (startGame already sets dialog: null)
```

### Recommended Project Structure
```
src/logic/share.ts          # buildShareText(), isTouchFirst(), pure; share.test.ts (node env)
src/logic/definition.ts     # lookupDefinition(word, {fetch, timeoutMs}), parseEntries() guard, session cache; definition.test.ts
src/components/ResultModal.tsx   # + ResultModal.test.tsx (jsdom)
src/components/Banner.tsx        # slimmed (See result + Play again)
src/state/copy.ts           # new strings; retire winStreakLine etc. per UI-SPEC
src/state/gameStore.ts      # 'result' dialog, timing constants next to revealDurationMs
scripts/build-words.mjs, scripts/words/lib.mjs   # emit defs per length
e2e/result.spec.ts          # new
```

### Pattern 1: Result modal state and scheduling (verified against gameStore.ts)
- `DialogName` is currently `'giveUp' | 'newGame' | 'settings' | 'reset' | 'stats'`. [VERIFIED: src/state/gameStore.ts:65] Add `'result'`. `isInputBlocked` already returns true when `dialog !== null`.
- The post-reveal pause needs its own flag, since `status` becomes `'won'|'lost'` in `finishReveal` and `typeLetter`/`submit` already reject non-`playing` status (so typing is naturally dead), but **Board switch, Stats, Settings, Mode switch are NOT blocked by status** (see `switchBoard`: only `revealing` returns early; `openStats` only blocks on `revealing`). Add a transient `resultPending: boolean` set in `finishReveal` (win/loss) and treat it like `revealing` in `isInputBlocked`, `switchBoard`, `openStats`, `openSettings`, `openDialog`. Clear it when the timer fires or on `startGame`/`resetAll`/`applyExternal` (token check: `get().loadToken === token`, as `finishReveal` timer already does).
- Timer must use `deps.setTimer` (test-injectable). Add exported constants + helper next to `revealDurationMs`: `bounceMs(length) = 400 + (length-1)*100`, `resultDelayMs(outcome, length, reduced)` => reduced 300; win `bounceMs + 400`; loss 600. [CITED: 06-UI-SPEC.md]
- D-03 skip rule: at fire time, if `pendingRestore !== null` or a break notice is showing (`breakNotice` / the streak-break dialog state), do not open; clear `resultPending`. Check how `StreakBreakModal` derives its open state (`breakNotice` field) and test both. [VERIFIED: gameStore.ts `breakNotice`]
- The Restore prompt in `finishGame` sets `dialog: null` when `effect === 'prompt'`; since the prompt is `pendingRestore`, the skip rule covers it.
- Give Up: `giveUp()` already sets status `'gave-up'` and `finishedInSession`. Schedule `dialog = 'result'` via `deps.setTimer(..., ~120)` after the confirm closes (Modal uses a 120 ms CLOSE_MS animation; a dialog opened while another is `data-closing` is OK because the confirm's `open` prop flips false in the same `set`). Simplest: set `dialog: 'result'` directly in `giveUp()` instead of `dialog: null`, which replaces the confirm in one render; GiveUpConfirm's Modal then closes with animation while the Result modal's `showModal()` opens. **Test this in E2E** (two dialogs briefly in the top layer; Modal's `finish()` checks `d.contains(activeElement)` before restoring focus, which should not steal focus from the new modal, verify).
- `DialogName` change ripples: `closeConfirms` and the `openDialog(name: 'giveUp'|'newGame')` typing; audit `dialog` uses (grep showed ~25). `startGame` and `switchBoard` already reset `dialog: null`, which also gives "Play again closes modal".

### Pattern 2: Definition-revealed memory (D-24..D-26)
Keep revealed flag in the store (transient, not in `docFromState`/`partialize`; verify `partialize` excludes it) or in a keyed module variable: `definitionRevealed: string | null` holding `${gameId}`. Reset in `startGame` (covers Play again) and Board switch. Successful senses cached in a module-level `Map<string, Sense[]>` (word, session). Failed lookups never enter the Map, and on modal open with revealed = true the effect runs `lookup` again (cache hit returns synchronously).
- Must be safe under StrictMode (double-effect): lookups are idempotent GETs; use an effect with `AbortController` cleanup, do not count/record anything in effects (CLAUDE.md pitfall).

### Pattern 3: Share handler (sync in click)
```ts
// Source: WebKit user-activation behaviour [CITED: webkit.org/blog/13862/the-user-activation-api/]
function onShare() {
  const text = shareText            // built during render (useMemo), NOT inside the handler after any await
  if (canNativeShare()) {
    navigator.share({ text }).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'AbortError') return
      void copy(text)                // falls through after rejection; see Pitfall 1
    })
    return
  }
  void copy(text)
}
function copy(text: string) {
  try { return navigator.clipboard.writeText(text).then(onCopied, onCopyFailed) }
  catch { onCopyFailed() }            // navigator.clipboard undefined on insecure origin
}
```
`navigator.share({ text })` is enough; the URL is already the last line of the text (SPEC wants header + grid + URL as one block; do not also pass `url`, or iOS apps may append the URL twice). [ASSUMED]

### Pattern 4: Share text builder (pure)
```ts
type ShareInput = { mode: 'normal'|'wordubado'; length: 4|5|6; rows: TileState[][]; maxAttempts: number;
                    outcome: 'won'|'lost'|'gave-up'; colourBlind: boolean; origin: string }
// header: normal `Wordle ${len} - ${n}/${max}`; wordubado `Unlimited Wordle - Wordubado ${len} - ${n}/${max}`; n = outcome==='won' ? rows.length : 'X'
// lines: rows.map(r => r.map(s => map[s]).join('')); join: header + '\n\n' + grid + '\n\n' + origin
```
Rows come from `rows[].states` (already scored `TileState[]`). Test: win/loss/gave-up, both modes, all 3 lengths, colourBlind true/false, partial rows only, no letters in output, no trailing newline.

### Pattern 5: Device test (D-17)
UI-SPEC rule: `typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0`. Note a caveat: iPadOS Safari reports `(pointer: coarse)` true for touch; iPad with a trackpad/mouse attached may report `fine` (then clipboard is used, acceptable). Wrap `matchMedia` in `globalThis.matchMedia?.()` (jsdom lacks it; existing Modal does the same). [ASSUMED for iPadOS behaviour; MEDIUM]
Put as `isTouchFirst()` taking injectable env for unit tests.

### Pattern 6: Definition lookup
```ts
// dictionaryapi.dev v2 shape [CITED: dictionaryapi.dev]: GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}
// -> Array<{ word, phonetic?, phonetics[], origin?, meanings: Array<{ partOfSpeech: string,
//      definitions: Array<{ definition: string, example?, synonyms[], antonyms[] }> }> }>
async function lookup(word: string, f = fetch, timeoutMs = 5000): Promise<Sense[]> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await f(url, { signal: ctl.signal })
    if (!res.ok) throw new Error('http')           // 404 body is {title:"No Definitions Found",...}, not an array
    const json: unknown = await res.json()
    return parse(json)                             // Array.isArray, string fields, >=1 usable sense, else throw
  } finally { clearTimeout(t) }
}
```
Take first 2 senses: first definition of the first meaning, then first definition of the second meaning if present (different POS), else second definition of the first. Truncate at 100 chars on a word boundary + "…" (UI-SPEC). Use `encodeURIComponent(word)`. No custom headers (a custom header would trigger a CORS preflight; keep it a "simple" GET).
Timeout also via `AbortSignal.timeout(5000)` is available but fake-timer testing is easier with manual `setTimeout`+AbortController under `vi.useFakeTimers()`.

### Pattern 7: Curated definitions in the lazy chunk
`RawPools` gets an optional `defs: string`? Better: `defs: Record<string,string>` (word -> definition) per length containing only reviewed slang of that length (same filter as `reviewedSlang`). Extend `serialisePools` (`scripts/words/lib.mjs:150`) and its test (`lib.test.mjs`), `build-words.mjs` (pass defs), `RawPools`/`Pools`/`toPools` in `wordData.ts` (`defs: Readonly<Record<string,string>>`), and `src/data/wordData.test.ts`. The pools are already loaded by the time a game is playing (`state.pools`), so the Result modal reads `pools.defs[answer]` synchronously with no extra fetch. Keep `slang` list as is (tests/e2e `slangWords()` parse it). 300 entries x ~60 chars ≈ 18 KB raw across 3 chunks; verify against `GZIP_BUDGET` (15/30/50 KB) after build and add a `check-bundle.mjs` sentinel for one definition string per chunk to prove it is not in the entry. [VERIFIED: build-words.mjs budgets; slang.json has 300 entries]
Decision rule D-08: `mode === 'wordubado' && pools.slang.includes(answer)` (use `defs[answer] !== undefined`, which is equivalent and cheaper). Normal mode never uses `defs`, even if a word is in both lists.

### Anti-Patterns to Avoid
- **Awaiting before `share`/`writeText`** (iOS rejects with NotAllowedError). Precompute text.
- **Doing the auto-open in a React effect keyed on `status`**: StrictMode double fire and re-open on Board switch violates D-02. Schedule from the store action (`finishReveal`/`giveUp`), per CLAUDE.md pitfall.
- **Reading `window.location.origin` inside the pure builder** — pass it in.
- **Using `--color-muted` for text** (UI-SPEC contrast rule).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dialog focus trap/Esc/backdrop | Custom overlay | Existing `Modal.tsx` | Has opener focus restore, `data-initial-focus`, closing animation |
| Stats maths/distribution | New calc | `deriveStats(stats, mode, length)` + extract StatsModal's `Stat`/dist chart into shared component | Same zero-safe "—" rules |
| Timing | New constants | Derive from `revealDurationMs` | Keeps E2E deterministic |
| Fetch timeout | Promise.race | `AbortController` | Cancels the request |
| Clipboard fallback | execCommand polyfill | Read-only textarea (D-19) | Locked decision |

## Common Pitfalls

### Pitfall 1: iOS user activation lost
**What goes wrong:** `navigator.share`/`clipboard.writeText` reject with `NotAllowedError` if called after an `await`, or from a timer. [CITED: webkit.org/blog/13862/the-user-activation-api/; bugs.webkit.org/show_bug.cgi?id=197779]
**How to avoid:** call synchronously in the `onClick`; text precomputed. **Subtlety:** the fallback-to-clipboard after a share *rejection* happens outside the activation (Safari activation lasts only a few seconds, and share consumed it). A non-Abort share error then clipboard write may itself be rejected on iOS; D-19's textarea fallback is the safety net. Do not treat a rejected clipboard write as impossible; always route to the textarea.
**Warning signs:** Works on desktop Chrome, fails on iPhone only.

### Pitfall 2: Toast hidden or silent under a modal dialog
**What goes wrong:** `showModal()` makes everything outside the dialog inert and `.toast-layer` is `z-index: 10` in normal flow, so "Copied" and the Day Streak toast render beneath the backdrop. Promoting to a manual popover fixes paint order but the popover is still not inside the modal dialog's subtree; the document is "blocked by modal", so I expect its live region not to be exposed to assistive tech. [ASSUMED: from HTML modal-dialog/inert semantics; verify with a manual screen reader pass]
**How to avoid:** Render the active toast inside the open Result dialog (UI-SPEC's stated fallback) — e.g. `Toast` rendered as a child of `Modal` card when `dialog === 'result'` and also at page level otherwise (one instance at a time to avoid duplicate announcements). For the D-28 "announced once" requirement, test that exactly one `role="status"` with text "Copied" exists in the DOM. The popover approach needs re-`showPopover()` after each `showModal()` (top layer is ordered by insertion).
**Day Streak toast overlap:** the toast fires at `finishReveal`; modal opens >= 300 ms later, so for a win the praise toast then the Day Streak toast (queued after TOAST_LIFE_MS) will overlap the modal. Same mechanism.

### Pitfall 3: dictionaryapi.dev unreliable (observed 522)
Observed: `HTTP 522 error code: 522` (Cloudflare origin connection timeout) on three different words on 2026-10-12; GitHub issues show recent "website down" and an earlier SSL error. [VERIFIED: curl; CITED: search results re github.com/meetDeveloper/freeDictionaryAPI]. 522 responses from Cloudflare likely lack `Access-Control-Allow-Origin`, so in browsers they surface as a CORS/network `TypeError` — your catch-all must treat any thrown error as unavailable. CORS for the working service is, to my recollection, permissive (`*`) [ASSUMED]; the docs page does not mention CORS or the 404 body [CITED: dictionaryapi.dev]. Do not depend on its availability for any acceptance test; E2E stubs it.

### Pitfall 4: 404 body shape
Not-found returns a JSON object (`{title, message, resolution}`), not an array [ASSUMED]. The shape guard (`Array.isArray`) handles it; do not call `.meanings` on it. Also check `res.ok` first.

### Pitfall 5: Held Enter opens then triggers Play again
The final submit's Enter may still be held when the modal opens 400-1200 ms later (rare) or, with `Give Up`, a repeat. `usePhysicalKeyboard` already ignores repeat for submit. The modal's focused Play again responds to `keydown` Enter (default activation on keydown for buttons fires `click` on keydown for Enter, on keyup for Space). Use the UI-SPEC capture listener `if (e.repeat && (Enter||Space)) e.preventDefault()` on the dialog. Test with `fireEvent.keyDown(btn, {key:'Enter', repeat:true})` (jsdom does not synthesise click from keydown, so unit-test only that `preventDefault` was called; E2E can use `page.keyboard.down('Enter')` held).

### Pitfall 6: Modal Tab trap queries only `button`
`Modal.onKeyDown` builds its trap from `querySelectorAll('button')`. A `<textarea>` (D-19 fallback) is not in the trap list: Tab from the last button wraps to first, skipping the textarea, and from the textarea Tab is not intercepted. Extend the selector to `button, textarea, [tabindex="0"]` (keep panel `tabindex="-1"` excluded). Add a Modal test.

### Pitfall 7: Modal `opener` is body at auto-open
`Modal` records `document.activeElement` as `opener` at open; at auto-open that is `body`, so `finish()` falls to `fallbackFocus`. Pass `fallbackFocus={() => document.querySelector('[data-see-result]')}`. After Play again the target should be body (blur), not See result: Banner unmounts when `status` changes to `loading`, so `isConnected` fails and `fallbackFocus` returns null, which is correct.

### Pitfall 8: `finishNote` / `winStreak` reset detection
`finishNote = {won, winStreak, prev}` is set at submit/giveUp and stays until `startGame`. UI-SPEC's ", reset" screen-reader suffix is `finishNote.prev > 0 && !finishNote.won`. But `finishNote` is `null`-ed on reload; only apply the suffix when `finishedInSession`. Also a Day Streak break can reset *all* Board win streaks (`resetWinStreaks`), so a win can show streak 1 after a reset; no suffix needed there.

### Pitfall 9: `distRowLabel`/chart reuse with 7-row max
Distribution array lengths are per Board (`dist` length 7 in `all` tab, per-board `attempts`); in the Result modal slice to `BOARD_CONFIG[length].attempts` rows. Check how StatsModal slices it and share that code instead of copying.

### Pitfall 10: Layout/regression at 320x500
Banner height: current `.banner` content is heading + body + streak + button inside `--controls-h`. Slim banner removes the streak line and `data-streak` padding rule in `game.css`; remove that CSS too. Modal flows scroll inside the dialog (`overflow-y: auto` on `.modal-card`, `max-height: calc(100dvh - 32px)`), mirroring Stats. Existing layout.spec must be extended (UI-SPEC verification hooks).

### Pitfall 11: App.test / Banner.test / copy tests break
`Banner.test.tsx`, `App.test.tsx` and any test importing `winStreakLine`, `WIN_BODY`, `LOSS_BODY`, `lossHeading`, `winHeading` will fail when those are retired. Grep and update in the same plan as the Banner change. [ASSUMED: not grepped in tests; verify]

## Code Examples

### Playwright stub for dictionaryapi.dev
```ts
// Source: Playwright docs, page.route [ASSUMED API usage, standard]
await page.route('https://api.dictionaryapi.dev/**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify([{ word: 'crane', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A large, tall bird.' }] }] }]) }))
// 404: route.fulfill({ status: 404, body: JSON.stringify({ title: 'No Definitions Found' }), headers: {...cors} })
// hang >5 s: route.fulfill after a never-resolving promise, or `await new Promise(() => {})`, and use page.clock to advance 5 s
// offline: route.abort('failed')
```
Playwright's `page.clock.install()/fastForward()` can drive the 5 s timeout and the post-reveal pauses deterministically. [ASSUMED; Playwright 1.45+ feature, project uses 1.63]

### Share/clipboard stubbing in E2E
```ts
await page.addInitScript(() => {
  (window as any).__shared = []
  Object.defineProperty(navigator, 'share', { value: (d) => { (window as any).__shared.push(d); return Promise.resolve() }, configurable: true })
})
```
Chromium Desktop project: no coarse pointer => clipboard path; "mobile" project (Pixel 7) has `hasTouch`/coarse pointer => share path (define `navigator.share` since desktop Chromium on Linux lacks it). For clipboard use `context.grantPermissions(['clipboard-read','clipboard-write'])` then `page.evaluate(() => navigator.clipboard.readText())`; for failure path override `navigator.clipboard.writeText` to reject.

## Runtime State Inventory
Not a rename/migration phase. No persisted-doc change (D-25): saved doc version unchanged, no migration. `colourBlind` default is a constant/store field not persisted this phase.

## State of the Art

| Old | Current | Impact |
|-----|---------|--------|
| execCommand('copy') | Async Clipboard API + textarea fallback | Locked by D-19 |
| Toast in page layer | Needs top-layer/in-dialog | Pitfall 2 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | dictionaryapi.dev sends permissive CORS when healthy | Pitfall 3 | If not, all dictionary lookups fail in browsers; ship still works (shows unavailable) but feature is dead. Owner could swap provider |
| A2 | 404 body is a JSON object, not an array | Pitfall 4 | Low; guard handles both |
| A3 | Passing only `text` (URL inside) to `navigator.share` avoids duplicate URLs | Pattern 3 | Cosmetic |
| A4 | iPadOS reports `(pointer: coarse)` with touch; keyboard/trackpad iPad may fall to clipboard | Pattern 5 | Minor UX |
| A5 | Popover toast outside modal subtree is not announced by screen readers | Pitfall 2 | If wrong, popover is fine; in-dialog render is still safe |
| A6 | Legacy tests import retired copy exports | Pitfall 11 | Planner must grep |
| A7 | Playwright `page.clock` usable with this app's `setTimeout` timers | Code Examples | Fall back to computed `waitForTimeout` |

## Open Questions (RESOLVED)

1. **Is dictionaryapi.dev actually up / CORS-open?** 522 on 2026-10-12 for all words.
   - Recommendation: plan a human-verify checkpoint to hit it from a real browser (devtools on the deployed preview) before sign-off; the code path already degrades to "Definition unavailable". Optionally the owner may want a fallback provider (out of scope unless raised; do not add silently).
   - RESOLVED: 06-07 Task 2 (checkpoint:human-verify) has the owner click "Show definition" in a real browser, check the console for CORS errors and record in the SUMMARY whether the live lookup worked or showed "Definition unavailable". All automated tests stub the API (06-05). No fallback provider is added.
2. **Does the staged `.planning/research/FEATURES.md` change matter?** Unrelated working-tree modification; ignore.
   - RESOLVED: ignored; no plan touches it.
3. **GZIP budget headroom:** current gzip sizes of words-N.json unknown here; plan a task to run `npm run build:words` and read the printed sizes, raise `GZIP_BUDGET` only with owner awareness if exceeded.
   - RESOLVED: 06-06 Task 2 runs `npm run build:words`, reads the printed gzip sizes and must leave `GZIP_BUDGET` unchanged; if a length exceeds its budget the plan stops and reports a deviation for the owner. 06-07 Task 1 also runs `npm run check:bundle`.
4. **SPEC.md §10 R-SHARE-1 update** (D-12) is a doc task to include.
   - RESOLVED: 06-03 Task 2 rewrites the R-SHARE-1 header sentence in SPEC.md §10 (Wordubado `Unlimited Wordle - Wordubado 5 - 4/6`, Normal `Wordle 5 - 4/6`).
5. **Do legacy tests import or assert the copy exports being retired (A6, Pitfall 11)?**
   - RESOLVED: 06-02 Task 2 deletes the retired exports, greps `src` and `e2e` for every deleted name (acceptance: zero matches) and rewrites Banner.test.tsx and App.test.tsx; 06-01 Task 3 already scopes App.test.tsx's Give Up queries to the banner with `within()`. The legacy E2E specs that assert the old copy are migrated in 06-08.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node / npm | build, tests | ✓ | project pins 24 | — |
| Playwright Chromium | E2E | per memory note, `npx playwright install` times out; manual curl+unzip into ms-playwright | — | follow MEMORY note |
| api.dictionaryapi.dev | live definitions | ✗ (522 at research time) | — | "Definition unavailable"; stub in tests |
| Real iOS Safari | share/clipboard verification | ✗ | — | manual check on owner's phone (human-verify) |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.3 (node env for `src/logic/**`, jsdom for components; `stubDialog()` helper in `src/test/stubDialog.ts`) + Playwright 1.63 (chromium + Pixel 7 "mobile" projects; webServer builds `--mode e2e` and previews on 4173) |
| Config file | `vitest` config via vite config; `playwright.config.ts` |
| Quick run command | `npx vitest run src/logic/share.test.ts src/logic/definition.test.ts src/components/ResultModal.test.tsx src/components/Banner.test.tsx` |
| Full suite command | `npm test && npm run build && npm run check:bundle && npx playwright test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RSLT-01 | Modal shows heading/answer/attempts/stats/Play again for win, loss, give up | component | `npx vitest run src/components/ResultModal.test.tsx` | ❌ Wave 0 |
| RSLT-01 | Store: `result` dialog opens after delay, input blocked during pause, skipped when pendingRestore/break, not on restored game, Give Up opens | unit | `npx vitest run src/state/gameStore.test.ts -t result` | ✅ extend |
| RSLT-01 | Banner slim: See result + Play again, no streak line | component | `npx vitest run src/components/Banner.test.tsx` | ✅ rewrite |
| RSLT-01 | E2E: finish game, modal appears after computed delay, layout 320x500, axe | e2e | `npx playwright test e2e/result.spec.ts e2e/layout.spec.ts` | ❌ Wave 0 / ✅ extend |
| RSLT-02 | Curated def present only for reviewed slang; chunk contains defs, entry bundle does not | script/unit | `npx vitest run scripts/words/lib.test.mjs src/data/wordData.test.ts && npm run build && npm run check:bundle` | ✅ extend |
| RSLT-02 | Lookup: success shape, 404, bad shape, network error, 5 s timeout (fake timers), cache success only | unit | `npx vitest run src/logic/definition.test.ts` | ❌ Wave 0 |
| RSLT-02 | Hidden until click; stays revealed on reopen; resets on Play again; Try again retries | component | `npx vitest run src/components/ResultModal.test.tsx -t definition` | ❌ Wave 0 |
| RSLT-02 | E2E with route stubs (success/404/malformed/hang/abort) in Normal and Wordubado slang (no network call for slang) | e2e | `npx playwright test e2e/result.spec.ts -g definition` | ❌ Wave 0 |
| RSLT-03 | Share text: headers (Normal vs Wordubado), X/n, rows played only, colourBlind variants, URL last | unit | `npx vitest run src/logic/share.test.ts` | ❌ Wave 0 |
| RSLT-04 | Device test truthy/falsy matrix; share-sheet vs clipboard; AbortError no-op; other error falls to clipboard; clipboard failure shows textarea | unit/component | `npx vitest run src/logic/share.test.ts src/components/ResultModal.test.tsx -t share` | ❌ Wave 0 |
| RSLT-04 | "Copied" toast once + button "Copied ✓" 2 s (fake timers); E2E clipboard content on desktop; mobile project calls stubbed `navigator.share` | e2e | `npx playwright test e2e/result.spec.ts -g share` | ❌ Wave 0 |
| RSLT-04 | Real iOS Safari share sheet + clipboard | manual | owner phone checklist | manual-only (no iOS device in CI) |

### Sampling Rate
- **Per task commit:** the Quick run command for touched files plus `npm run typecheck`
- **Per wave merge:** `npm test && npm run lint && npm run build && npm run check:bundle`
- **Phase gate:** full suite green + Playwright (both projects) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/logic/share.test.ts`, `src/logic/definition.test.ts`, `src/components/ResultModal.test.tsx`, `e2e/result.spec.ts`
- [ ] Extend `e2e/layout.spec.ts`, `src/state/gameStore.test.ts`, `scripts/words/lib.test.mjs`, `src/data/wordData.test.ts`, `Banner.test.tsx`, `App.test.tsx`, `Modal.test.tsx` (textarea Tab trap), `Toast.test.tsx`
- [ ] No new framework install

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4 | no | static site, no accounts |
| V5 Input Validation | yes | Treat dictionaryapi.dev JSON as untrusted: type-guard every field, render as React text (never `dangerouslySetInnerHTML`), cap length (100 chars); `encodeURIComponent(word)` in URL (word is from our own list, a-z only) |
| V6 Cryptography | no | — |
| V13 API | yes | Plain GET, no credentials (`credentials: 'omit'` default for cross-origin), no custom headers (avoids preflight), no secrets |

### Known Threat Patterns
| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| XSS via API definition text | Tampering | React text nodes only; shape guard |
| Share text spoofing/injection | Tampering | Text built from own state; origin from `window.location.origin` |
| Third-party outage/hang | DoS (UX) | 5 s AbortController, non-blocking UI |
| Answer leakage | Info disclosure | Share grid has no letters; definition area never needed before game ends (modal only opens when finished); do not prefetch definitions during play |

If a CSP is ever added, `connect-src` must allow `https://api.dictionaryapi.dev` (no `vercel.json`/CSP exists today). [VERIFIED: no vercel.json, no CSP in index.html]

## Sources

### Primary (HIGH)
- Codebase: `src/state/gameStore.ts`, `src/components/{Banner,Modal,Toast,StatsModal}.tsx`, `src/logic/stats.ts`, `src/data/wordData.ts`, `scripts/build-words.mjs`, `scripts/words/lib.mjs`, `scripts/check-bundle.mjs`, `e2e/helpers.ts`, `playwright.config.ts`
- 06-CONTEXT.md, 06-UI-SPEC.md
- Live curl to api.dictionaryapi.dev (522, 2026-10-12)

### Secondary (MEDIUM)
- https://dictionaryapi.dev/ (response shape)
- https://webkit.org/blog/13862/the-user-activation-api/ , https://bugs.webkit.org/show_bug.cgi?id=197779 , https://bugs.webkit.org/show_bug.cgi?id=244812 (user activation for share/clipboard)
- https://github.com/meetDeveloper/freeDictionaryAPI/issues (outage reports, via search summary)

### Tertiary (LOW)
- CORS header of dictionaryapi.dev, 404 body shape, iPadOS pointer media behaviour, popover/inert a11y: training knowledge only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (no new deps)
- Architecture: HIGH for store/modal integration (read the code); MEDIUM for toast a11y
- Pitfalls: MEDIUM-HIGH; iOS items are documented but untested on a device

**Research date:** 2026-10-12
**Valid until:** 2026-11-12 (dictionaryapi.dev status may change any day; re-check before release)
