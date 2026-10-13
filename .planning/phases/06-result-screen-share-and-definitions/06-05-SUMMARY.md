---
phase: 06-result-screen-share-and-definitions
plan: 05
subsystem: ui
tags: [dictionaryapi, fetch, abort-controller, a11y, zustand, playwright]
requires:
  - phase: 06-04
    provides: Result modal live region, toast layer
provides:
  - lookupDefinition (5 s timeout, shape guard, success-only session cache)
  - Show definition button and DefinitionPanel in the Result modal
  - Transient definitionShown store flag
  - e2e/definition.spec.ts with dictionaryapi.dev route stubs
affects: [06-06 curated slang definitions]
tech-stack:
  added: []
  patterns: [success-only module Map cache, AbortController with external signal forwarding, panel mounted only while modal open so reopen retries]
key-files:
  created: [src/logic/definition.ts, src/logic/definition.test.ts, src/components/DefinitionPanel.tsx, src/components/DefinitionPanel.test.tsx, e2e/definition.spec.ts]
  modified: [src/state/gameStore.ts, src/state/gameStore.test.ts, src/state/copy.ts, src/components/ResultModal.tsx, src/components/ResultModal.test.tsx, src/styles/game.css]
key-decisions:
  - "definitionShown is cleared at every site that clears resultFlourish alongside resultPending (loadBoard, startGame, resetAll, applyExternal), never persisted"
  - "DefinitionPanel mounts only while the modal is open, so a reopen re-reads the success cache or retries a failed lookup"
  - "Retry button uses --color-bg fill so it stays visible on the --color-surface panel"
requirements-completed: [RSLT-02]
duration: ~35min
completed: 2026-10-13
---

# Phase 6 Plan 05: Show definition Summary

Result modal now has a "Show definition" button that fetches from dictionaryapi.dev only on click, shows up to two senses with part of speech and credit, and handles timeout, 404, offline and malformed responses with "Definition unavailable" plus Try again.

## Tasks

1. Failing E2E with page.route stubs (dd36af9).
2. definition.ts with 19 unit tests (aa7f541).
3. Store flag, DefinitionPanel, ResultModal button, copy, CSS, component tests (2c58789).

## Deviations from Plan

- E2E test D-25: after reload and after switching back to the finished Board the keyboard (Enter) is absent, so the spec uses the See result button and a direct radio click instead of waitForReady/selectLength for those steps. Test-only adjustment.
- Two scoped eslint-disable comments in DefinitionPanel (mount-only focus effect deps, set-state-in-effect for starting a lookup).

## Verification

npm test, lint, typecheck, prettier, build pass. Playwright definition, result and layout specs pass in chromium and mobile (24 and 136 tests).

## Known Stubs

None. Wordubado slang uses the same dictionary path until 06-06.

## Threat Flags

None beyond the plan's threat model (T-06-12..16 mitigated: no dangerouslySetInnerHTML, no headers, no prefetch, 5 s timeout).

## Self-Check: PASSED
