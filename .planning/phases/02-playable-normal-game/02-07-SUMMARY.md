---
phase: 02-playable-normal-game
plan: 07
subsystem: ui
tags: [react, css-tokens, keyboard, a11y, playwright]
requires: [02-05, 02-06]
provides:
  - Grid, Tile, Keyboard, usePhysicalKeyboard, LengthPicker, Header, Banner, App shell
  - UI-SPEC tokens in tokens.css and token-only game.css
  - Green win/lose E2E on chromium and mobile
affects: [02-08, 02-09]
tech-stack:
  added: []
  patterns: [data-own-enter Enter exemption, blur-after-pointer-click, game start outside effects]
key-files:
  created:
    - src/components/Tile.tsx
    - src/components/Grid.tsx
    - src/components/Grid.test.tsx
    - src/components/Keyboard.tsx
    - src/components/Keyboard.test.tsx
    - src/components/usePhysicalKeyboard.ts
    - src/components/Header.tsx
    - src/components/LengthPicker.tsx
    - src/components/Banner.tsx
    - src/styles/game.css
  modified:
    - src/styles/tokens.css
    - src/styles/global.css
    - src/App.tsx
    - src/App.test.tsx
    - src/main.tsx
key-decisions:
  - "Length radio label is built as '{n} <span hidden>letters</span>' with a separate space text node, because the accessible name otherwise computed as '5letters'"
  - "Submitted tiles keep data-state while revealing; only the aria-label omits the state (colour timing is 02-08's keyframes)"
metrics:
  tasks: 3
  files: 15
  completed: 2026-10-02
---

# Phase 2 Plan 07: Playable Game Shell Summary

Grid, on-screen and physical keyboards, length picker and win/loss banner wired to the game store with UI-SPEC tokens; the 02-05 E2E is green.

## Commits

- 1ac7845 feat(02-07): add tokens, grid and tiles
- 0d5dccd feat(02-07): add on-screen and physical keyboard
- fd16bf3 feat(02-07): playable game shell with length picker and result banner

## Verification

`vitest run src` (66 tests), lint, typecheck, format:check and build pass. `npx playwright test e2e/game.spec.ts`: 4/4 pass (chromium and Pixel 7). No hex in game.css, no dangerouslySetInnerHTML, no useEffect in App.tsx, `startGame(5)` called in main.tsx. Regression test "does not restart" passes.

## Deviations from Plan

- Tests were written before the components but the RED run was not separately observed for Grid and Keyboard (tests and components written in one step, then run green). Tests do assert the specified behaviour.
- [Rule 1 - Bug] The LengthPicker accessible name was '5letters' with the planned markup; fixed with an explicit space text node.

## Known Stubs

None. `.header-actions` is an intentionally empty hidden slot reserved for Phase 3 icons.

## Self-Check: PASSED
