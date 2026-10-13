---
phase: 06-result-screen-share-and-definitions
plan: 06
subsystem: ui
tags: [word-data, build-script, bundle-check, definitions, playwright]
requires:
  - phase: 06-05
    provides: DefinitionPanel and dictionaryapi.dev lookup
provides:
  - reviewedDefs and a defs object in each lazy words-N.json
  - check:bundle defs sentinel (absent from entry chunks, present in its pool chunk)
  - Pools.defs and the curated branch in DefinitionPanel
affects: []
tech-stack:
  added: []
  patterns: [curated text shipped inside the lazy per-length chunk]
key-files:
  created: []
  modified: [scripts/words/lib.mjs, scripts/build-words.mjs, scripts/check-bundle.mjs, src/data/words-4.json, src/data/words-5.json, src/data/words-6.json, src/data/wordData.ts, src/components/DefinitionPanel.tsx, src/components/ResultModal.tsx, src/styles/game.css, e2e/definition.spec.ts]
key-decisions:
  - "Curated text is used only in Wordubado, keyed by membership in defs, which mirrors the reviewed slang list (words that are slang and common get the curated text)"
  - "The crude flag is not shipped and changes nothing in the display (D-11)"
  - "GZIP_BUDGET unchanged; gzip is 9.9/19.9/33.4 KB against 15/30/50 KB"
requirements-completed: [RSLT-02]
duration: ~20min
completed: 2026-10-13
---

# Phase 6 Plan 06: Curated slang definitions Summary

Wordubado slang answers now show their hand-written meaning instantly with no network request, via a `defs` object in each lazy words-N.json chunk; every other answer still uses dictionaryapi.dev.

## Tasks

1. Failing E2E for curated slang (7840a3c).
2. reviewedDefs, serialisePools defs, regenerated chunks, check:bundle sentinel (a5b9331).
3. Pools.defs, curated branch in DefinitionPanel, ResultModal wiring, CSS, tests (see git log, feat(06-06) show curated).

## Deviations from Plan

None. The first regex written for the check:bundle sentinel had a syntax slip (unescaped backslash) and was fixed before commit.

## Verification

vitest scripts/words, npm test, lint, typecheck, build and check:bundle pass (definitions 95/110/95). E2E definition.spec.ts: 34 passed across chromium and mobile.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED
