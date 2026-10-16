---
phase: 02-playable-normal-game
plan: 08
subsystem: ui
tags: [css-animation, reduced-motion, toast, playwright]
requires: [02-06, 02-07]
provides:
  - Toast component (role alert/status, 1860 ms life)
  - Row shake scoped by shakeRow, tile pop, midpoint-colour flip, win bounce, key transition
  - Reduced-motion alternative (fade, outline flash)
  - e2e/feedback.spec.ts and e2e/motion.spec.ts
affects: [02-09]
key-files:
  created:
    - src/components/Toast.tsx
    - src/components/Toast.test.tsx
    - e2e/feedback.spec.ts
    - e2e/motion.spec.ts
  modified:
    - src/components/Grid.tsx
    - src/components/Grid.test.tsx
    - src/components/Tile.tsx
    - src/App.tsx
    - src/styles/game.css
key-decisions:
  - "Shake re-trigger: Fragment key={shakeId} remounts only the active row's tiles; shake and outline-flash animate the tiles (not the row), so repeat rejections replay"
  - "Flip colour comes from --tile-colour inside the flip keyframes (49%/50%); backwards fill hides state colour until each tile's midpoint"
metrics:
  tasks: 2
  files: 9
  completed: 2026-10-02
---

# Phase 2 Plan 08: Feedback and Motion Summary

Toasts, scoped row shake, pop, staggered flip with midpoint colour, win bounce, key transitions and a full reduced-motion path, all verified in E2E.

## Commits

- feat(02-08): toast and shake for rejected guesses
- test(02-08): motion and reduced-motion E2E

## Verification

Vitest src: 74 pass (Toast and Grid shake tests observed RED first: missing Toast module, shake count 0). Playwright: 12/12 pass on chromium and mobile. Lint, format:check, typecheck, build pass. No hex in game.css.

## Deviations from Plan

- Tasks 1 and 2 touched overlapping files (Grid, Tile, game.css), so all animation CSS and Tile/Grid changes landed in the first commit; the second commit holds only motion.spec.ts. Cleaner split would have broken the build between commits.
- `calc(var(--i) * 300ms)` appears twice in game.css (flip rule and the bounce rule's animation list) rather than once, as the plan's own CSS requires both.
- Shake applied on tiles inside the `data-shake` row rather than the row element, so the Fragment remount replays it (row element is not remounted).
- The motion spec's "keys update after the flip" is not strictly time-based beyond the Playwright expect retries; the first assertion can be racy only if the flip were instant (it is not under full motion).

## Known Stubs

None.

## Self-Check: PASSED
