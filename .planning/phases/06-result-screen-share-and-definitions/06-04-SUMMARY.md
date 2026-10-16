---
phase: 06-result-screen-share-and-definitions
plan: 04
subsystem: ui
tags: [toast, popover, top-layer, a11y, live-region, playwright]
requires:
  - phase: 06-03
    provides: notify action, Copied toast, Share flow
provides:
  - Toast layer as a manual popover re-raised above open dialogs
  - Single in-dialog live region for toasts while the Result modal is open
  - e2e/toast.spec.ts (paint-order and announcement checks)
  - Fix for the stale dialog close event race (Enter on See result flake)
affects: [Phase 7 settings toasts]
tech-stack:
  added: []
  patterns: [popover="manual" re-show to re-enter the top layer, pixel-sample E2E for paint order]
key-files:
  created: [e2e/toast.spec.ts]
  modified: [src/components/Toast.tsx, src/components/Toast.test.tsx, src/components/ResultModal.tsx, src/components/ResultModal.test.tsx, src/components/Modal.tsx, src/components/Modal.test.tsx, src/App.tsx, src/styles/game.css, e2e/result.spec.ts, e2e/restore.spec.ts, e2e/streaks.spec.ts]
key-decisions:
  - "Toast is the last child of div.app with raiseKey=dialog so its effect runs after Modal showModal() effects"
  - "announce={dialog !== 'result'}: the page toast is visual only while the Result modal is open; ResultModal owns the one role=status region (rendered only while open)"
requirements-completed: [RSLT-04]
duration: ~75min
completed: 2026-10-13
---

# Phase 6 Plan 04: Toasts over the Result modal Summary

Toast layer is now a manual popover that is hidden and re-shown whenever its toast or the open dialog changes, so Copied, praise and Day Streak toasts paint above the Result modal, with a single live region inside the dialog so screen readers hear each once.

## Tasks

1. Failing E2E (d916bde): e2e/toast.spec.ts, four tests.
2. Toast popover, App wiring, in-dialog live region, CSS reset (6a3d603), plus a follow-up (3fcd5d9) so the live region text renders only while the modal is open.
3. Flake fix (667eed4), see below.

## Deviations from Plan

**1. [Rule 1 - Bug] E2E hit-test helper cannot see a toast above a modal**
- Chromium treats everything outside a modal dialog as inert, so `document.elementFromPoint` skips even a correctly raised toast. `topmostIsToast` instead pauses the toast animation at full opacity, screenshots one pixel inside its padding and compares it with the toast surface colour (it would be dimmed by the 32% backdrop if underneath). Mutation check: with popover/showPopover removed, 3 of the 4 chromium tests fail.

**2. [Rule 1 - Bug] Day Streak toast timing in test 3**
- On a win the Day Streak toast is queued one toast life (1860 ms) after the praise toast, while the modal opens at 1200 ms. The plan assumed it was visible at modal open. The test now runs the paused clock a further `TOAST_LIFE_MS - resultDelayMs + 10` after the modal opens, so the toast lands while the modal is open (exercises raise-on-new-toast). page.clock does drive the app timers (RESEARCH A7 confirmed).

**3. [Rule 1 - Bug] jsdom hides popover elements**
- jsdom hides `[popover]` that is not open, so the existing Toast tests use `getByRole(..., { hidden: true })`. Assertions are otherwise unchanged. The popover tests stub `showPopover`, `hidePopover` and `matches(':popover-open')`.

**4. [Rule 1 - Bug] Existing E2E strict-mode clashes with the new live region**
- `getByText('Day streak: N')` in result, restore and streaks specs, and `getByRole('status')` for Day Streak in streaks.spec.ts, matched both the toast and the in-dialog region. Scoped to `.toast-layer`. A first version rendered the toast text in the (closed) dialog too, which broke storage and tabs specs; fixed by rendering it only while `open`.

**5. [Rule 1 - Bug] Flake: "Enter on a focused See result opens the modal" (extra task)**
- **Root cause (app bug, not the test):** Escape closes the Result modal via `dialog.close()` (reduced motion: immediately). The native `close` event is queued and can arrive several ms later. If See result is activated in that window (Playwright presses Enter about 8 ms after focus lands), the dialog is already open again, and `Modal`'s `onClose` handler saw `openRef.current === true` and treated the stale event as a browser-initiated close, calling `closeDialog` and closing the freshly opened modal. Reproduced 3 of 20 and 6 of 25 even when run alone (so not parallel load), and traced with a temporary event logger: Enter keydown, click, dialog open=true, then `close` event, focus back on See result, dialog open=false, all before keyup. Focus and disabled state were not the issue; the global keyboard handler returns early for `data-own-enter` buttons.
- **Fix:** `Modal` ignores a `close` event when `dialog.open` is true (a genuine browser close has `open === false`). Modal.test: the existing native-close test now removes `open` first; new test for the stale event.
- **Proof:** `npx playwright test e2e/result.spec.ts --repeat-each=10 --reporter=line` gave 420 passed (before: 3 failed per 420). Full suite: 348 passed, 14 skipped; `npm test` 589 passed; lint and typecheck clean.

## Known Stubs

None.

## Threat Flags

None. T-06-10 mitigated: all popover calls are guarded and covered by a no-API unit test.

## Self-Check: PASSED

e2e/toast.spec.ts and this file exist; commits d916bde, 6a3d603, 667eed4, 3fcd5d9 found in git log.
