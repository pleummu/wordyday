# Feature Research

**Domain:** Browser word-guessing game (Wordle clone, unlimited play, 4/5/6 letters, slang mode, streaks)
**Researched:** 2026-10-01
**Confidence:** MEDIUM. The feature landscape comes from well-known behaviour of NYT Wordle, Wordle Unlimited, Wordly, Octordle, Absurdle, Quordle and Lewdle-style variants. It rests on my existing knowledge, with no live re-verification of each competitor. The findings about plan.txt and PROJECT.md come from reading both files directly (HIGH).

## Verdict

The planned feature set is more than sufficient for a public launch. It is over-complete on retention mechanics (Day Streak, Restore, per-Board Win Streaks) and has a few small gaps in robustness and in what the game does after a finish. None of the gaps need new big features. They are mostly "decide this behaviour now" items, listed under "Gaps in the plan" below.

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Correct duplicate-letter scoring (greens first, then limited yellows) | Wrong scoring is the number one complaint about clones | LOW | Planned. Unit tests ABBEY/BABES and SPEED/ERASE are the right ones |
| Valid-word check against a large guess list | Players try odd words and expect fair rejection | MEDIUM | Planned. The Guess Pool is the main quality risk (4- and 6-letter lists are less curated than 5) |
| Invalid-guess feedback (shake plus toast) that costs no attempt | Standard Wordle behaviour | LOW | Planned |
| On-screen and physical keyboard with best-state key colouring | Core Wordle UX | LOW | Planned. Include Enter, Backspace and no-focus-needed key capture |
| Flip, pop and shake animations | Defines the "feel" | MEDIUM | Planned. Must honour prefers-reduced-motion (planned) |
| Resume after refresh | Players lose games to accidental refresh and will rage-quit | MEDIUM | Planned (per-Board localStorage) |
| Stats: played, win %, streaks, guess distribution | Core retention hook since Wordle | MEDIUM | Planned |
| Share emoji grid, spoiler-free | Wordle's growth engine | LOW | Planned. Web Share API with clipboard fallback is right |
| How-to-play modal, auto-opened on first visit | New players need the rules | LOW | Planned |
| Dark mode | Expected since 2022 | LOW | Planned. Consider defaulting to `prefers-color-scheme` |
| Colour-blind palette | Standard in Wordle since launch | LOW | Planned |
| Responsive, phone-width layout | Most traffic is mobile | MEDIUM | Planned. Beware mobile browser viewport and keyboard sizing |
| Screen-reader announcements, modal focus handling | Accessibility baseline, and a stated constraint | MEDIUM | Planned. Needs aria-live and per-tile labels |
| Play again immediately (unlimited loop) | Defining feature of "Unlimited" clones | LOW | Planned (result screen) |
| Reveal the answer on loss | Players need closure | LOW | Planned |
| Page title, Open Graph image, favicon | Shared links are the growth channel | LOW | Planned |
| Clean answer pool (no obscure or offensive Normal answers) | Obscure answers drive "unfair" complaints | MEDIUM | Planned (blocklist). Needs a manual review pass |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Wordubado slang/meme mode (75% slang answers) | The unique hook; no major clone does a Gen Z slang mode | MEDIUM | Needs curated slang.json with definitions and owner review. Content and tone are the real work |
| 4/5/6 lengths with 5/6/7 attempts | Wordle Unlimited has multiple lengths; fewer clones balance attempts per length | LOW | Planned |
| 6 independent Boards with their own saved games | Switch freely without forfeiting. Most clones keep one game | MEDIUM | Planned. Drives most of the storage and state complexity |
| Day Streak plus monthly Restore | Forgiving streaks. Duolingo-style "streak freeze", rare in Wordle clones | HIGH | The riskiest logic in the app (date maths, month boundary, clock changes). Planned tests are thorough |
| Per-Board Win Streak | Gives unlimited play a reason to care about each game | LOW | Planned |
| Definition on the result screen (hidden until clicked) | Educational and fun, especially for slang | MEDIUM | Planned. dictionaryapi.dev needs timeout and failure handling (planned) |
| Separate stats for Normal vs Wordubado | Honest stats | LOW | Planned |
| Soft, airy design that is not an NYT copy | Brand identity | MEDIUM | Planned |
| Full public pipeline (CI, Playwright, Vercel previews) | Portfolio and learning value, not a player-facing feature | MEDIUM | Planned |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Hard mode | NYT has it | Already ruled out. Extra validation logic and tests for little value | Stay out of scope |
| Daily puzzle | The original Wordle format | Contradicts "unlimited" and needs a deterministic shared answer schedule | Day Streak covers the daily habit |
| Accounts, cloud sync, leaderboards, multiplayer | Social features, cross-device streaks | Needs a backend, auth, moderation and anti-cheat. Streaks in localStorage are trivially editable, so leaderboards would be meaningless anyway | Stay out of scope. Optional later: export/import save code |
| Hints, reveal-a-letter, undo | "Helpful" to casual players | Undermines scoring and streak integrity | None. Give Up already exists |
| Restoring Win Streaks | Players would ask for it | Makes streaks meaningless; already decided against | Restore covers only the Day Streak |
| Ads, popups, newsletter prompts, cookie banner | Monetisation | Hurt the airy feel. Without analytics no consent banner is needed | Keep no analytics in v1 |
| Analytics and telemetry in v1 | Wanting to know usage | Adds consent and privacy obligations | Defer to v2 (planned). Use Vercel's built-in privacy-friendly metrics if anything |
| Offensive or slur-based slang | "Edgy" authenticity | Public-facing reputation and hosting risk | Mild crude allowed, no slurs or hate terms (planned) |
| Many extra modes at launch (Octordle-style multi-board, timed, speedrun) | Variety | Each mode multiplies Boards, stats and tests | Revisit after launch |
| Animated confetti or sound effects | Delight | Conflicts with the soft aesthetic and reduced-motion. Needs mute settings | If added later, respect reduced-motion and keep it silent |

### Gaps in the plan (decide before requirements)

| Gap | Why it matters | Complexity | Suggestion |
|-----|----------------|------------|------------|
| Behaviour of a finished game after refresh or board switch | The plan covers in-progress resume only. A won board may be reloaded to an empty board, or be stuck "finished" | LOW | A finished Board shows its finished grid and a "Play again" button; starting a new game on it costs nothing. Define it in SPEC |
| localStorage unavailable or full (private mode, blocked storage) | App can crash on startup | LOW | Wrap storage in try/catch, fall back to in-memory with a small notice |
| Corrupt or hand-edited saved data | The versioned migration exists, but not a validation or reset fallback | LOW | Schema-validate on load. On failure offer reset, never a white screen |
| Two tabs open at once | Last-write-wins can corrupt streaks or restores | LOW to MEDIUM | Listen to the `storage` event and reload state, or document as accepted |
| Timezone and DST day arithmetic | "missed days" computed with ms/86400000 is off by one around DST | MEDIUM | Compare local calendar dates (Y-M-D), not timestamps. Add a DST unit test |
| Statistics when a game is abandoned via refresh | Not an issue, since resume exists. But "Reset my data" must also clear streaks and restores | LOW | State clearly what Reset does in its confirm dialog |
| Share text lacks a URL | A shared grid with no link is a lost growth opportunity | LOW | Append the site URL to the share text |
| Wordubado content warning | Slang may be crude. The (i) popup should say so | LOW | One sentence in the (i) popup |
| Error report or feedback link ("report a word") | Word-list complaints will arrive | LOW | A mailto or GitHub issue link in Settings. Do not build a form |
| Keyboard-only and focus return after toast and modals | Partly covered under Accessibility | LOW | Covered by the Playwright checks |
| 404 and no-JS fallback | Public deploy hygiene | LOW | A one-line `<noscript>` message |

## Feature Dependencies

```
Word build script (answers/guesses pools)
    └──requires──> evaluate.ts scoring
                       └──requires──> Board/Row/Tile UI + Keyboard
                                          └──requires──> gameStore + versioned storage
                                                             ├──requires──> Resume after refresh
                                                             ├──requires──> Stats (per mode, per length)
                                                             │                  └──requires──> Result screen (+ Share)
                                                             └──requires──> Streaks (Win Streak, Day Streak)
                                                                                └──requires──> Restore (RestoreModal)

slang.json ──requires──> Wordubado mode ──enhances──> Definitions (curated slang path)
dictionaryapi.dev lookup ──enhances──> Definitions (common-word path)
Confirm dialog ──requires──> New game / Give up = loss ──requires──> Win Streak reset logic
Day Streak ──requires──> Missed-day check (open, focus, date change)
Dark / colour-blind themes ──enhances──> Share (🟧🟦 grid)

Daily puzzle ──conflicts──> Unlimited play (out of scope)
Hard mode ──conflicts──> Slang valid-guess policy (extra validation cost; out of scope)
```

### Dependency Notes

- **Scoring and pools come before everything:** Core Value is correct play. Nothing else is testable without `evaluate.ts` and valid pools.
- **Storage versioning must exist from the first save:** Adding migrations later breaks the first players' data. Version the schema in the very first persistence phase.
- **Streaks and Restore depend on stats and storage, not on the UI:** Build and unit-test the pure `streaks.ts` logic before the Restore modal.
- **Wordubado depends on slang.json being reviewed:** Content review is a human gate and can block the mode. Start drafting early, and ship Normal first if review lags.
- **Definitions are independent of core play:** They can be built last or dropped without hurting Core Value.
- **Share depends on the result screen and the colour-blind setting.**

## MVP Definition

### Launch With (v1)

Everything in PROJECT.md's Active list is reasonable. Suggested internal build order, which also serves as the cut line:

- [ ] Scoring, pools, single-Board play (Normal, 5 letters), keyboard, animations. This is the Core Value.
- [ ] All 6 Boards, persistence with versioning, resume, New game/Give up confirms.
- [ ] Stats, result screen, Share.
- [ ] Win Streak, Day Streak, Restore, with unit tests.
- [ ] Wordubado mode plus slang.json, the (i) popup and definitions.
- [ ] Dark mode, colour-blind palette, how-to-play, accessibility, Open Graph.
- [ ] CI, Playwright, Vercel deploy, docs.

Add the small gaps above (finished-board behaviour, storage failure handling, DST-safe dates, share URL) to v1 requirements, as they are cheap.

### Add After Validation (v1.x)

- [ ] Export/import save code (a localStorage-only game loses data when the browser is cleared or the device changes)
- [ ] Report-a-word link and word-list tuning from feedback
- [ ] Auto-follow `prefers-color-scheme` if not in v1
- [ ] Privacy-friendly analytics, if wanted

### Future Consideration (v2+)

- [ ] PWA / offline install (already deferred)
- [ ] Extra modes (multi-board Octordle-style), only if players ask
- [ ] Cloud sync, accounts, leaderboards (needs a backend)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Correct scoring and validation | HIGH | LOW | P1 |
| Keyboard, animations, mobile layout | HIGH | MEDIUM | P1 |
| Resume and persistence (versioned) | HIGH | MEDIUM | P1 |
| Stats and Share | HIGH | MEDIUM | P1 |
| Win Streak | MEDIUM | LOW | P1 |
| Day Streak and Restore | MEDIUM | HIGH | P1 (owner-chosen; keep, but build behind pure tested logic) |
| Wordubado and slang.json | HIGH | MEDIUM | P1 (the differentiator) |
| Dark mode and colour-blind palette | MEDIUM | LOW | P1 |
| Accessibility | MEDIUM | MEDIUM | P1 |
| Definitions | MEDIUM | MEDIUM | P2 (cuttable) |
| Storage failure and corrupt-data handling | MEDIUM | LOW | P1 |
| Export/import save | MEDIUM | MEDIUM | P3 (v1.x) |
| Report-a-word link | LOW | LOW | P2 |
| Analytics | LOW | MEDIUM | P3 |

## Competitor Feature Analysis

| Feature | NYT Wordle | Wordle Unlimited (and clones) | Octordle / Quordle | Absurdle | Our Approach |
|---------|------------|-------------------------------|--------------------|----------|--------------|
| Play frequency | One per day | Unlimited | Daily plus practice | Daily-ish, endless | Unlimited |
| Word lengths | 5 | 4 to 11 (varies by clone) | 5 | 5 | 4/5/6 with 5/6/7 attempts |
| Streak | Daily streak, no recovery | Mostly none, or per-session | Daily streak | None | Win Streak per Board plus Day Streak with 3 Restores a month |
| Stats | Yes, global | Basic, sometimes none | Yes | Basic | Per mode and length, with All tab |
| Hard mode | Yes | Sometimes | No | N/A | No |
| Slang pool | No | Rarely | No | No | Wordubado, the differentiator |
| Share grid | Yes | Yes | Yes | Yes | Yes, with colour-blind variant |
| Dark and colour-blind | Yes | Usually | Usually | Partial | Yes |
| Definitions | After game (via a link) | Rare | No | No | In-app, hidden until clicked |
| Accounts and sync | Yes (NYT account) | Mostly no | Some | No | No (v1) |

## Sources

- NYT Wordle, observed behaviour and feature set (training knowledge; not re-verified live). Confidence MEDIUM.
- Wordle Unlimited, Octordle, Quordle, Absurdle, Wordly (training knowledge). Confidence MEDIUM.
- `C:\Users\pleum\Wordle\.planning\PROJECT.md` and `C:\Users\pleum\Wordle\plan.txt` (read directly). Confidence HIGH.

---
*Feature research for: browser word-guessing game (Wordle clone)*
*Researched: 2026-10-01*
