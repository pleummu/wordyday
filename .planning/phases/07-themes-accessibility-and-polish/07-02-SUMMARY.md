---
phase: 07-themes-accessibility-and-polish
plan: 02
subsystem: ui
tags: [meta, open-graph, favicon, noscript]
requires: []
provides:
  - Link-preview meta tags, OG image, apple-touch-icon, SVG favicon, noscript message
affects: [07-04]
tech-stack:
  added: []
  patterns: [SVG sources rendered to PNG by script with cached Playwright Chromium]
key-files:
  created:
    - scripts/meta.test.mjs
    - e2e/meta.spec.ts
    - scripts/make-assets.mjs
    - scripts/assets/og-image.svg
    - scripts/assets/apple-touch-icon.svg
    - public/og-image.png
    - public/apple-touch-icon.png
  modified:
    - index.html
    - public/favicon.svg
key-decisions:
  - "Absolute production URLs (wordyday.vercel.app) hard-coded in OG tags (D-17)"
requirements-completed: [UI-10]
duration: 15min
completed: 2026-10-14
---

# Phase 7 Plan 02: Link preview and metadata Summary

Title, description, Open Graph and Twitter tags, a 1200x630 OG image, a 180x180 apple-touch-icon, a sage W favicon and a styled noscript message, with a reproducible SVG-to-PNG export script.

## Commits
- f0ae95b test: failing metadata and asset tests
- 0c3a97d feat: meta, noscript, favicon
- 0df3e83 feat: OG image and apple-touch-icon (plus e2e noscript fix)

## Deviations from Plan

**[Rule 1 - Bug] noscript E2E locator:** Playwright's getByText ignores `<noscript>` content, so the test uses `page.locator('noscript p')` (toHaveText + toBeVisible). File: e2e/meta.spec.ts. Committed in 0df3e83.

## Verification
meta.test.mjs 8/8, e2e/meta.spec.ts 2/2, build, check:bundle, lint, format:check all pass. og-image.png checked visually (33 KB).

## Known Stubs
None.

## Self-Check: PASSED
