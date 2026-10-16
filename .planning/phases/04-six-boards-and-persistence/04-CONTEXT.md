# Phase 4: Six Boards and Persistence - Context

**Gathered:** 2026-10-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Players keep six independent saved games, one per Board (2 Modes x 3 lengths). Games survive a refresh, mode and length switches, corrupt or hand-edited saved data, blocked or full localStorage, and two open tabs. This phase also adds Give Up and New game (only with exactly 2 tries left, each behind a confirm), a Settings modal with "Reset my data" and the "stored in this browser only" note, and the header settings button.

Requirements: SAVE-01..09, PLAY-07, PLAY-08, UI-11, plus the settings-button part of UI-05 (Phase 3 D-14).

Out of this phase: stats, streaks and Restores (Phase 5); the result screen, share and definitions (Phase 6); themes, colour-blind palette and the help screen (Phase 7). This phase settles the saved-data schema and the migration chain, so Phase 5 only adds fields through a migration.

</domain>

<decisions>
## Implementation Decisions

Already locked elsewhere and not re-decided here:
- **SPEC.md §5 (R-BOARD-1..4, R-SAVE-1..6):**
  - The Board key is `${mode}-${len}`, and switching never forfeits.
  - Refresh saves submitted guesses only; a half-typed row is discarded.
  - A finished Board shows the grid, a result banner and Play again.
  - Saved data is one versioned document with a migration chain from the first release.
  - Corrupt data is backed up under the main key plus `:corrupt`, and the app starts fresh.
  - Blocked or full storage falls back to in-memory for the session.
  - Tabs sync through the `storage` event.
  - Settings has the reset and the browser-only note.
- **SPEC.md §6 (R-FORFEIT-1..6):**
  - Give Up and New game are allowed only when `attemptsUsed === maxAttempts - 2`.
  - Both ask for confirmation and count as a loss.
  - New game and Play again are always available once a game is finished.
  - A fresh Board cannot be abandoned.
- **Phase 3 decisions:**
  - D-08: the first visit defaults to Normal.
  - D-10: the Phase 3 "End this game?" switch confirm is a stopgap that this phase removes.
  - D-13/D-14: each header button appears when its screen exists. Settings lands here.
  - The Phase 3 `Modal` (native `<dialog>`) is the reusable dialog.

### Give Up and New game
- **D-01:** Give Up and New game sit in a **small, quiet row of text buttons under the grid**, between the grid and the keyboard. The layout must still fit 320x500 with no vertical scroll (the existing `e2e/layout.spec.ts` checks).
- **D-02:** The row is **hidden unless exactly 2 tries are left** (R-FORFEIT-1/2). There are no disabled or greyed buttons. Once a game is finished, Play again in the result banner covers New game (R-FORFEIT-5), so the row does not show then either.
- **D-03:** After a confirmed Give Up the player sees the **same finished state as a normal loss**:
  - The answer is revealed in the result banner with Play again.
  - The banner wording says "You gave up" instead of the out-of-tries wording.
  - No fake row is added to the grid.
- **D-04:** The Give Up confirm **mirrors the New game confirm**: "This counts as a loss. Reveal the answer?" with buttons "Keep playing" / "Give up". New game keeps SPEC's "This counts as a loss. Start a new game?" with "Keep playing" / "New game". Both use the shared `Modal`.
- **D-05:** The Phase 3 "End this game?" switch confirm is **removed**. Switching is now non-forfeiting (R-BOARD-2, Phase 3 D-10). The `pendingSwitch`/`confirmSwitch`/`cancelSwitch` path and `SwitchConfirm` go away or are repurposed, and their tests are updated.

### Settings
- **D-06:** Settings opens as a **modal dialog** built on the Phase 3 `Modal`. A settings button appears in the reserved `.header-actions` slot (UI-05 settings part; D-14). Phase 5 stats and Phase 7 help follow the same modal pattern.
- **D-07:** For now Settings contains **only** these two items:
  - **"Reset my data"**
  - **The browser-only note.** The intent is "Your progress is saved in this browser only. Clearing site data or using another device starts fresh."; the final copy is set in the UI spec.
  - Theme and colour-blind options come in Phase 7.
- **D-08:** Reset uses **one confirm dialog** with a destructive-styled Reset button. The intent is "Reset all data? This clears every game, your stats, streaks and Restores. It can't be undone." with "Cancel" / "Reset"; final copy goes in the UI spec. There is no typed confirmation.
- **D-09:** After a reset, the app behaves **like a first visit**:
  - Settings closes and all six Boards and saved flags are cleared, including the "Wordubado popup seen" flag.
  - A new Normal 5-letter game starts, and a short toast says "All data reset".

### Board memory and hints
- **D-10:** On return (reload or a new visit) the app **opens the last Board the player played**. The saved data remembers the last active mode and length. The first visit stays Normal 5 (Phase 3 D-08).
- **D-11:** The **"Wordubado popup seen" flag is saved**. The popup auto-opens on the very first switch to Wordubado ever, not once per session. The (i) button still opens it any time, and reset clears the flag. This replaces Phase 3's in-memory `infoSeen`.
- **D-12:** The length picker shows a **small dot on lengths that have an unfinished game in the current mode**. Each one has a screen-reader label such as "6 letters, game in progress". A finished or never-started Board shows no dot. The mode switch itself gets no dot.
- **D-13:** Switching to a Board with **no saved game starts a new game right away**, as today: it picks an answer and shows an empty grid. There is no Start screen.

### Carried-over fixes (must land in this phase)
- **D-14:** **Phase 3 WR-03** (`03-REVIEW.md`): `Modal` must also handle the native `close` event. If the browser closes a dialog without `cancel` (Esc without recent user activation, the Android back gesture), the store still thinks it is open and all keys are ignored. This phase adds three more dialogs (Give Up, New game, Settings/Reset), so it must be fixed here.
- **D-15:** **Phase 2 WR-03** (`02-REVIEW.md`): on a chunk-load retry, `wordData.ts` reloads the page, which is no longer safe now that progress is saved. Phase 3 CONTEXT flagged this as "must be fixed before Phase 4 adds saved progress". Fix it so a failed retry never loses saved data or hangs. For example, only reload when `navigator.onLine` is true; otherwise keep the error UI.
- **D-16:** **Phase 2 WR-04** (`02-REVIEW.md`): reveal timers must be tied to the game through a token, so a reset, Board switch or restore during a reveal cannot let a stale timer finish the wrong game. This phase adds new `startGame` callers (reset, Board switching, New game), so it must be fixed here.

### Claude's Discretion
- **Storage-trouble feedback (not discussed; owner left it open).** This covers corrupt data that was backed up and reset, blocked or full storage, and another tab changing the active Board.
  - The UI spec decides whether to show a short toast or a quiet note, or nothing.
  - Defaults should be calm and non-blocking.
  - The game must always stay playable (R-SAVE-2/3).
- **Two-tab conflicts on the same Board.** Choose a simple, safe rule, for example "last write wins and the other tab reloads that Board's state". Do not lose submitted guesses, and do not double-count a finished game (Phase 5 stats depend on this).
- **Schema shape.**
  - Fields: per-Board saved games (answer, submitted rows, status, outcome including give-up/forfeit), last active Board, "popup seen", and a `version` field.
  - It should be ready for Phase 5's `dayStreak`, `restores`, `pendingRestore` and per-Board `winStreak` (SPEC §7) to be added through a migration.
  - Storage key name, validation guard style (hand-written guard, no zod) and whether Zustand `persist` is used are left to research and the planner, following CLAUDE.md ("persist middleware with version + migrate + partialize").
- **What a saved finished game stores.** It must be enough to show the finished grid, the banner (won, lost, gave up or forfeited) and the answer (R-BOARD-4).
- **Banner wording for a forfeit via New game.** New game starts a fresh game right away, so the forfeited game is not shown. It is recorded as a loss for Phase 5. Wording for a Give Up banner is per D-03.
- **Exact placement and spacing** of the Give Up / New game row and the in-progress dot are set in the Phase 4 UI spec.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Game rules and terms
- `SPEC.md` §5 "Boards and persistence": R-BOARD-1..4 and R-SAVE-1..6 are the source of truth for Boards, refresh, saved data, corrupt data, blocked storage, tab sync, reset and the browser-only note.
- `SPEC.md` §6 "Give Up, New game and Forfeit": R-FORFEIT-1..6, the exactly-2-tries rule, the confirm copy and the anti-farming rationale.
- `SPEC.md` §7 "Persisted state": names Phase 5 will add (`dayStreak`, `restores`, `pendingRestore`, per-Board `winStreak`). The schema must be ready for them to be added through a migration.
- `SPEC.md` §8, open question 4: a fresh Board with zero guesses cannot be abandoned.
- `GLOSSARY.md`: Board, Mode, Forfeit, Give Up. Use these terms exactly.

### Prior phase decisions and design
- `.planning/phases/03-wordubado-mode-and-slang/03-CONTEXT.md`: D-08 (default Normal), D-10 (the switch confirm is a stopgap), D-11 (persistence deferred to this phase), D-13/D-14 (header buttons per phase), D-16 ("popup seen").
- `.planning/phases/03-wordubado-mode-and-slang/03-UI-SPEC.md`: Modal, switch, accent and two-row header visuals to extend.
- `.planning/phases/02-playable-normal-game/02-UI-SPEC.md`: base visual system (tokens, banner, toast, spacing).

### Open review findings to fix here
- `.planning/phases/03-wordubado-mode-and-slang/03-REVIEW.md`: WR-03 (Modal `close` event, D-14). Also see WR-04 (the animated close path is untested) and IN-02 ("seen" kept outside store state), which D-11 resolves.
- `.planning/phases/02-playable-normal-game/02-REVIEW.md`: WR-03 (reload-on-retry, D-15) and WR-04 (reveal timer token, D-16).

### Project constraints
- `CLAUDE.md`: Zustand `persist` with `version` + `migrate` + `partialize`. Also wrap `JSON.parse`, validate in `migrate`, and fall back to fresh state. Wire the StrictMode-safe listeners once. Do game actions in store actions, not effects.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/Modal.tsx`: reusable native `<dialog>` with initial focus, Tab wrap, Esc/scrim close, focus return, `fallbackFocus` and a 120 ms close animation. Use it for the Give Up, New game, Settings and Reset dialogs, after fixing WR-03.
- `src/components/SwitchConfirm.tsx` and `src/state/copy.ts`: the confirm-dialog pattern and copy constants. They show the shape for the new confirms. `SwitchConfirm` itself is removed by D-05.
- `src/components/Banner.tsx`: the result banner with Play again. Extend it for the "You gave up" wording (D-03).
- `src/components/LengthPicker.tsx`: where the in-progress dot goes (D-12).
- `src/components/Header.tsx`: the `.header-actions` slot for the settings button.
- `src/components/Toast.tsx`: for the "All data reset" toast and any storage-trouble messages.
- `src/logic/boards.ts` (`BOARD_CONFIG`, `WordLength`): max attempts per length, used for the exactly-2-tries rule.
- `src/test/stubDialog.ts`: jsdom `showModal` stub for component tests.

### Established Patterns
- **Store:** one Zustand store in `src/state/gameStore.ts`, created by `createGameStore(deps)` with injected `rng`, `setTimer`, `loadPools` and `prefersReducedMotion`.
  - Persistence should follow the same pattern: inject a storage dependency so tests can pass a fake or a throwing localStorage.
- **Game state:** today the store holds a single game (`mode`, `length`, `answer`, `rows`, `current`, `status`, `keyStates`). This phase turns that into six Boards keyed `${mode}-${len}` while keeping the active-Board view.
- **Answer loading:** answers come from lazily loaded per-length pools (`loadPools`). A restored Board needs its pool loaded before guesses can be validated.
- **Test hook:** `src/state/testHook.ts` fixes answers only in `e2e`/`test` mode builds. E2E specs (`e2e/*.spec.ts`, `e2e/helpers.ts`) run against `npm run build:e2e`.
- **Keyboard guards:** `data-own-enter` and the `usePhysicalKeyboard` dialog guard (`dialog[open]`). New buttons and dialogs must follow them.

### Integration Points
- The store's `startGame`, `requestSwitch` and `playAgain` become Board-aware. New actions are `giveUp`, `forfeitNewGame` and `resetAll`, plus a `storage` event listener wired once (StrictMode-safe).
- `App.tsx` mounts the dialogs (the WordubadoInfo pattern) and the new Settings modal.
- The `e2e/layout.spec.ts` 320x500 checks constrain the new button row under the grid.

</code_context>

<specifics>
## Specific Ideas

- Give Up confirm: "This counts as a loss. Reveal the answer?" with "Keep playing" / "Give up".
- New game confirm (SPEC R-FORFEIT-3): "This counts as a loss. Start a new game?" with "Keep playing" / "New game".
- After a Give Up, the banner reads "You gave up" and shows the answer and Play again.
- After a reset: the toast "All data reset", then a fresh Normal 5 game, like a first visit.
- In-progress dot screen-reader label: "6 letters, game in progress" (pattern).

</specifics>

<deferred>
## Deferred Ideas

- A version and credits line in Settings, including the SCOWL/wordlist-english attribution: Phase 7 polish.
- Phase 3 review items not needed here:
  - WR-01/WR-02 (slang-cut tooling) before the next slang review.
  - WR-05 (Enter on the (i) button submits) during the Phase 7 keyboard/a11y pass.
  - IN-03/IN-04 (slang plurals, flag/definition fixes) before Phase 6 shows definitions.

</deferred>

---

*Phase: 04-six-boards-and-persistence*
*Context gathered: 2026-10-02*
