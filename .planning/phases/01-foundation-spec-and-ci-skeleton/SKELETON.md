# Walking Skeleton: Unlimited Wordle

**Phase:** 1
**Generated:** 2026-10-01

## Capability Proven End-to-End

A visitor opens the public Vercel URL and sees the "Unlimited Wordle" placeholder page, built from `main` after a pull request passed the GitHub Actions `check` job and was previewed on its own Vercel preview URL.

This app has no server, database, auth or routing, so the "full stack" is: source -> lint/format/typecheck/unit tests -> Vite build -> CI on the PR -> Vercel preview -> merge -> Vercel production.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | React 19 + Vite 8 + TypeScript `~6.0.3`, single-page app, no router | Static SPA is all a one-page game needs; TS 6.0.x because typescript-eslint 8.71 peers `<6.1.0` (TS 7 is `latest` on npm, avoid) |
| Runtime | Node 24 (`.nvmrc`), `engines.node >=22.12` | Vitest 5 and Vite 8 floors; one pin for local, CI and Vercel |
| Data layer | None in Phase 1. Later: committed word JSON in `src/data/` (Phase 2), one versioned localStorage document via `src/logic/storage.ts` (Phase 4) | No backend by design; persistence is not pulled forward |
| State | None in Phase 1. Later: Zustand 5 store in `src/state/` without the `persist` middleware (Phase 2/4) | Resolved research decision: explicit versioned storage module |
| Auth | None (no accounts, ever in v1) | Progress lives in the browser only |
| Styling | Plain CSS with custom properties: `src/styles/tokens.css` + `src/styles/global.css` | Themes later become variable sets on `[data-theme]` / `[data-palette]`; no CSS library |
| Testing | Vitest 5 configured inside `vite.config.ts`; `node` env by default, `// @vitest-environment jsdom` docblock per component test; explicit `vitest` imports (no globals); Testing Library for components | One config file; pure logic tests stay fast |
| Lint / format | ESLint 10 flat config (`eslint.config.js`: @eslint/js, typescript-eslint, react-hooks, react-refresh); Prettier 3 (`singleQuote`, no `semi`, `endOfLine: lf`); `.prettierignore` skips `.planning`, `docs`, `*.md`, `plan.txt` | QA-01; oxlint from create-vite removed; markdown tables are not reformatted |
| Line endings | `.gitattributes` `* text=auto eol=lf` | Owner's Windows machine has `core.autocrlf=true`; keeps local and Linux CI identical |
| CI | `.github/workflows/ci.yml`, workflow `CI`, single job id `check`: npm ci, lint, format:check, typecheck, test, build; `permissions: contents: read`; triggers `pull_request` + push to `main` | Job id `check` is stable for Phase 8 branch protection; later phases add E2E and word-drift jobs |
| Deployment target | Vercel Git integration (Hobby): preview per PR branch, production from `main`; no `vercel.json`, no tokens in GitHub | D-14; zero secrets; Vercel auto-detects Vite and serves `dist/` |
| Git flow | Feature branches (`phase-NN/<slug>`) and PRs into `main`, merged with merge commits | D-13: every phase gets a CI run and a preview |
| Spec | `SPEC.md` (rule IDs `R-<AREA>-<n>`, edge cases `EC-nn`) and `GLOSSARY.md` at the repo root | D-08, D-10; tests cite rule and EC IDs in their titles |
| Directory layout | `src/main.tsx`, `src/App.tsx`, `src/logic/` (pure TS, no clock/RNG/storage access), `src/styles/`; later `src/state/`, `src/components/`, `src/data/`, `scripts/` | Layering from research ARCHITECTURE.md: UI -> store -> pure logic; folders are created when their first file lands |
| Tests location | Co-located `*.test.ts(x)` next to the file under test | Vitest `include: ['src/**/*.test.{ts,tsx}']` |

## Stack Touched in Phase 1

- [ ] Project scaffold (framework, build, lint, format, test runner): plan 01-01
- [ ] Routing: not applicable (single page, no router; one real page at `/`)
- [ ] Database: not applicable (no backend; localStorage arrives in Phase 4)
- [ ] UI: one real rendered page (title + coming-soon line) covered by a component test: plan 01-01
- [ ] Pure logic: `src/logic/boards.ts` `BOARD_CONFIG` (R-LEN-1) with a unit test: plan 01-01
- [ ] CI: baseline `check` job green on a PR: plan 01-04
- [ ] Deployment: Vercel preview on a PR and production from `main`: plans 01-05, 01-06

## Out of Scope (Deferred to Later Slices)

- Gameplay, scoring, keyboard, animations (Phase 2)
- Word data build script and JSON pools, blocklist, slang (Phases 2-3)
- Zustand store, localStorage persistence, schema migrations, two-tab sync (Phase 4)
- Streaks, Restore logic implementation, stats (Phase 5; Phase 1 only specifies them in SPEC.md)
- Result screen, share, definitions (Phase 6)
- Dark mode, colour-blind palette, accessibility polish, OG metadata (Phase 7)
- Playwright E2E, word-drift CI job, branch protection, SHA-pinned actions (Phases 2 and 8)
- PWA / offline install (v2)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without changing its architectural decisions:

- Phase 2: play a complete, correctly scored Normal game at 4, 5 or 6 letters
- Phase 3: switch to Wordubado and play slang answers; slang valid as Normal guesses
- Phase 4: six independent Boards that survive refresh, with versioned storage
- Phase 5: Win Streaks, Day Streak, monthly Restores and statistics
- Phase 6: result screen with Play again, definitions and share
- Phase 7: themes, accessibility and public-link polish
- Phase 8: full E2E suite, complete CI gates and the finished pipeline guide
