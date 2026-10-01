# Project Research Summary

**Project:** Unlimited Wordle (Normal + Wordubado)
**Domain:** Client-only browser word game, static Vercel deploy
**Researched:** 2026-10-01
**Confidence:** MEDIUM-HIGH

## Executive Summary

A static, client-only Wordle variant: React 19 + Vite 8 + TypeScript, no backend, one versioned localStorage document. It has 6 Boards (Normal/Wordubado × 4/5/6 letters), a per-Board Win Streak, and a global Day Streak with 3 Restores a month. The standard structure has three layers:

- **Pure core logic (TS)**: scoring, answer picking, dates, streaks, share, migrations. It never calls `Date.now()`, `Math.random()` or localStorage; these are injected.
- **Store**: orchestrates and owns the clock, RNG and storage.
- **Presentational UI**

Recommended approach: write SPEC.md first to settle the open streak/Restore cases, then build the core logic test-first. Settle the persistence schema before streaks. Start the word pipeline and slang drafting early, because the owner's review takes real time. Word lists are a build-time artifact (`wordlist-english` + blocklist), committed as per-length JSON and lazy-loaded.

**Top risks:**
1. Single-pass scoring breaks the Core Value on repeated letters.
2. Day maths done in DST or timezone terms breaks streaks unfairly.
3. Unvalidated localStorage data white-screens the site.
4. Offensive or obscure answers. Measured: profanity appears even in the common tiers of `wordlist-english`, so a blocklist is mandatory.
5. E2E tests go flaky from animation, randomness and time.

## Key Findings

### Recommended Stack (npm-verified 2026-10-01, HIGH)

- **Framework:** React 19.3, Vite 8.3, @vitejs/plugin-react 6.1 (needs Vite 8).
- **TypeScript:** **pin `~6.0.3`**. npm `latest` is 7.0.2, but typescript-eslint 8.71 supports only `<6.1.0`. Check what create-vite scaffolds.
- **Node:** 24 LTS (`.nvmrc`, engines >=22.12).
- **State:** Zustand 5.0.15, **without** the `persist` middleware (see Resolved Disagreements).
- **Styling:** plain CSS variables + keyframes. No motion library, Tailwind or CSS-in-JS.
- **Unit tests:** Vitest 5 + jsdom + Testing Library.
- **E2E:** Playwright 1.63 + `@axe-core/playwright`, run against `vite preview` with `reducedMotion: 'reduce'`.
- **Lint/format:** ESLint 10 flat config + typescript-eslint 8 + react-hooks 7, Prettier 3. No Husky.
- **Word data:** `wordlist-english` 1.2.1 and `obscenity` 0.4.6 as build-time devDependencies only. `src/` never imports them.
- **Definitions:** dictionaryapi.dev via `fetch`, only on click, with a 5 s abort and an in-memory cache.
- **Deploy:** Vercel Git integration (no `vercel deploy` from Actions) + one GitHub Actions workflow.
- **Measured pools:**
  - Answer candidates (tiers 10+20): ~920 / 1355 / 1640 for 4/5/6 letters.
  - Guess pools: ~5-9K per length, ~40 KB gzipped in total.

### Expected Features

- **Table stakes:**
  - Two-pass scoring
  - Large-dictionary validation
  - Shake + toast that doesn't use an attempt
  - Both keyboards, with keys keeping their best state
  - Reduced-motion-safe animations
  - Resume after refresh
  - Stats
  - Spoiler-free share
  - How-to-play on first visit
  - Dark and colour-blind palettes
  - Phone layout
  - Accessibility
  - Play again
  - Answer revealed on a loss
  - Clean answer pool
  - Open Graph (link-preview) image
- **Cheap gaps added to v1:**
  - Finished-Board behaviour
  - Handling storage failure and corrupt data
  - DST-safe dates
  - Site URL in the share text
  - Content warning on Wordubado
- **Differentiators:**
  - Wordubado slang mode
  - 6 independent Boards
  - Day Streak + Restore
  - Win Streak per Board
  - Definitions (the cuttable P2)
  - A public CI/deploy pipeline
- **Defer to v1.x:** export/import of saved data, a report-a-word link, analytics.
- **Defer to v2+:** PWA, extra modes, sync/accounts.
- **Never:** hard mode, daily puzzle, hints/undo, restoring Win Streaks, ads.

### Architecture Approach

- **Pure modules:** `evaluate`, `keyboard`, `pickAnswer`, `dates`, `streaks`, `share`, and the `game` reducer.
- **Impure edges:** `storage` and `wordData`.
- **Other pieces:**
  - `gameStore`
  - `useDayWatcher`
  - a `Modal` primitive with a focus trap, built early
  - one `aria-live` region
  - CSS-token themes
- **Rules:**
  - Persist guesses only. Tile colours, keyboard state, restoresLeft, the All-tab stats and `pendingRestore` are all derived from the saved data.
  - The Board key is `${mode}-${len}`, and everything derives from one `BOARD_CONFIG`.
  - `recordResult` runs `checkMissed` first.
  - Word pools load lazily per length with `import()` through an explicit loader map, and are memoised as `Set`s.

### Critical Pitfalls

1. **Single-pass scoring.**
   - Use two passes.
   - Test ABBEY/BABES, SPEED/ERASE, LEVEL, and AAAA at every length.
   - Add a property test: greens + yellows never exceed the count of that letter in the answer.
2. **Day maths.**
   - Store local `YYYY-MM-DD` strings and take the difference using `Date.UTC` on the parsed parts.
   - Inject `today`.
   - Run a TZ matrix (LA, Auckland, Kolkata, UTC) covering DST, year end and Feb 29.
3. **Gaps in the Restore state machine.** Resolve all of these in SPEC.md and implement them table-driven:
   - Running the check twice gives the same result.
   - The pending prompt vs. continuing to play.
   - Refill before the offer on the 1st of the month.
   - Midnight passing mid-game.
   - Day Streak farming by giving up.
   - A clock moved backwards must not overwrite `lastActiveDate`.
4. **localStorage.**
   - Version the data and add a migrate chain from the first release.
   - Validate the shape of saved data.
   - Back up garbage under a `:corrupt` key.
   - Fall back to in-memory storage when localStorage is unavailable.
   - Handle the `storage` event (two tabs).
   - Test with a v1 fixture, garbage data, and a localStorage that throws.
5. **Word pools.**
   - Use obscenity + a hand-made blocklist + `exclude.txt`.
   - Eyeball the final lists.
   - Pin the package version.
   - Add build-time assertions and slang validation tests.

**Also:**
- An `isRevealing` input gate, with the guess committed before the animation runs.
- `data-state` assertions and `page.clock` in E2E.
- A `100dvh` layout.

## Resolved Disagreements

1. **Zustand `persist`: not used.** The explicit `logic/storage.ts` (version + migrate chain, validation, corrupt backup, in-memory fallback) is a requirement and a learning goal. It is cleaner to test as plain functions.
2. **Guess-pool size:** use STACK's measured 5-9K per length. Re-measure on the first build.
3. **Generated word JSON:** commit it to the repo. A CI job regenerates it and runs `git diff --exit-code`.
4. **E2E determinism:**
   - Seed a saved Board with a known answer via `addInitScript`.
   - Control dates with `page.clock`.
   - Ship no debug hooks in production.
5. **Blocklist scope:** answers only; guesses stay permissive. Record this in SPEC.md.

## Owner Decisions (2026-10-01)

| Question | Decision |
|---|---|
| Does Give Up count as a finished game for the Day Streak? | **Yes.** New rule: forfeiting is only allowed when 2 or fewer tries are left (see the clarification in the requirements) |
| Exclude plurals/inflections from the Normal answer pool? | **Yes, exclude.** They remain valid guesses |
| What a finished Board shows on return | **The finished grid + Play again** |
| Two tabs open | **Sync via the `storage` event** |

## Implications for Roadmap (suggested)

1. **Foundation, Spec and Tooling.** Scaffold (TS 6.0.x), lint/format/Vitest, a minimal CI job + Vercel Git integration, types, `BOARD_CONFIG`, SPEC.md (full Restore state machine), GLOSSARY.md.
2. **Word-Data Pipeline and Slang Content.**
   - Build script, blocklist, committed JSON, loader, assertions, draft `slang.json` + validation test.
   - Start slang drafting immediately, since the owner's review is the long pole.
   - Can run in parallel with phase 3.
3. **Pure Core Logic, test-first.** evaluate, keyboard, pickAnswer (10k-draw 75/25 test), dates, game reducer, share text.
4. **Playable single-Board UI slice.** Tiles, keyboards, toast, animations + reduced-motion, minimal store, Modal primitive, theme tokens, first Playwright smoke test.
5. **Persistence and six Boards.** Versioned and validated storage, resume (including finished Boards), switching Boards, New game / Give Up confirms, Reset.
6. **Stats, Streaks and Restore.** Table-driven `streaks.ts`, stats, `useDayWatcher`, Restore/Stats/Confirm modals.
7. **Result, Share, Wordubado and Definitions.** Result modal, Share (feature detection + URL), Wordubado popup with a content warning, definitions.
8. **Polish and Accessibility.** Themes with a pre-paint script, how-to-play, aria-live, contrast, phone checks, OG image, favicon, `<noscript>`.
9. **E2E, CI hardening, Deploy and Docs.** Full-game, resume and Restore specs, axe, a mobile/WebKit project, bundle budget, branch protection, production deploy, docs/PIPELINE.md.

### Research Flags

- **Phase 1:** whether the scaffold installs TS 6 or 7, and typescript-eslint's peer range.
- **Phase 2:** which word tiers to use, plural handling, blocklist quality, the `obscenity` API.
- **Phase 7:** dictionaryapi.dev availability/CORS, iOS Web Share/clipboard.
- **Phase 9:** Playwright `page.clock`/`reducedMotion`, `actions/*` versions.
- **No research needed:** phases 3, 4, 5, 8. Phase 8 still needs an iOS `dvh` device or WebKit check.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Checked against npm and by inspecting the tarball |
| Features | MEDIUM | Competitor behaviour comes from training knowledge |
| Architecture | MEDIUM-HIGH | An established pattern |
| Pitfalls | MEDIUM | Browser quirks not freshly verified |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- TS 6 vs 7 scaffold
- Answer-pool quality (needs the owner's review)
- dictionaryapi.dev behaviour
- iOS Safari quirks
- Playwright clock API
- Real pool and bundle sizes

## Sources

- npm registry metadata and the `wordlist-english@1.2.1` tarball (HIGH)
- plan.txt and PROJECT.md (HIGH)
- Training knowledge of Wordle clones, MDN and Playwright (MEDIUM)
- obscenity API, dictionaryapi.dev, Actions versions (LOW)

---
*Research completed: 2026-10-01*
*Ready for roadmap: yes*
