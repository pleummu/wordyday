# Pipeline Guide: How Unlimited Wordle Gets Built

This is a learning guide. It explains **what happens, in what order, and why**: both the way the project is *planned* (the GSD workflow) and the way code *travels* from your editor to a live website (the build pipeline).

> Status: written at project start (2026-10-01). Sections marked 🔜 describe things that don't exist yet. Phase 8 updates this file so it describes the finished pipeline.

---

## 1. The big picture

```
 IDEA ──► SPEC ──► ROADMAP ──► for each phase: DISCUSS ► PLAN ► EXECUTE ► VERIFY ──► SHIP
 (plan.txt) (SPEC.md) (8 phases)          (GSD loop, repeated 8 times)              (Vercel)
```

There are two pipelines, and they meet in the middle:

| Pipeline | Question it answers | Where it lives |
|---|---|---|
| **Planning pipeline** (GSD) | *What* do we build next, and how do we know it's done? | `.planning/` |
| **Code pipeline** (build → test → deploy) | How does a code change become a safe, live website? | `package.json`, `.github/workflows/`, Vercel |

---

## 2. The planning pipeline (GSD)

### 2.1 What's already done

| Step | Output | What it's for |
|---|---|---|
| Q&A on the original spec | `plan.txt` | Settled the contradictions (unlimited vs daily, slang vs dictionary) |
| `/gsd-new-project` | `.planning/PROJECT.md` | The project's "constitution": what it is, core value, constraints, key decisions |
| Research (4 agents in parallel) | `.planning/research/*.md` | Stack versions, features, architecture, pitfalls, all checked *before* coding |
| Requirements | `.planning/REQUIREMENTS.md` | 62 testable "User can…" statements with IDs (PLAY-01, STRK-06…) |
| Roadmap | `.planning/ROADMAP.md` | 8 phases; each requirement belongs to exactly one phase |
| State | `.planning/STATE.md` | Where we are right now (memory across sessions) |

> 🎓 **What you'll learn:** writing requirements as *observable, testable* behaviour ("User can X") instead of vague goals ("handle streaks"). Every later step (plans, tests, verification) checks itself against these IDs.

### 2.2 The loop each phase goes through

```
/gsd-discuss-phase N  ─►  /gsd-plan-phase N  ─►  /gsd-execute-phase N  ─►  /gsd-verify-work N
   clarify how             research + write        build it, atomic         check that the phase
                           PLAN.md files,          git commits per          goal is really met,
                           plan-checker reviews    task                     plus manual UAT
```

| Step | Command | Produces | Why it exists |
|---|---|---|---|
| **Discuss** | `/gsd-discuss-phase N` | `CONTEXT.md` | Settles *your* preferences (look, edge cases) before planning, so the planner doesn't guess |
| **(UI contract)** | `/gsd-ui-phase N` | `UI-SPEC.md` | For UI phases: settles spacing, colours and states up front (matters for the soft, light design) |
| **Plan** | `/gsd-plan-phase N` | `RESEARCH.md`, `PLAN.md` files | Splits the phase into small tasks with "must be true" checks; a checker agent reviews the plan |
| **Execute** | `/gsd-execute-phase N` | Code + one commit per task, `SUMMARY.md` | Does the work in small, revertible steps |
| **Verify** | `/gsd-verify-work N` | `VERIFICATION.md` / UAT | Works back from the goal: does the app *actually* do what the success criteria say? |

Your settings (`.planning/config.json`): **interactive** mode (you confirm each step), **sequential** execution (easier to follow), research, plan-check and verifier all **on**.

> 🎓 **What you'll learn:** the difference between *planning* and *verifying against the goal*. A phase isn't done because the tasks ran; it's done when the success criteria in ROADMAP.md are observably true.

---

## 3. The 8 phases and why they're in this order

The roadmap is a **vertical MVP**: you get something playable early, then each phase adds one feature you can see. Some ordering is forced by dependencies (shown as ⛓).

| # | Phase | You'll be able to… | Why here | 🎓 What you'll learn |
|---|---|---|---|---|
| 1 | **Foundation, Spec & CI Skeleton** | Open a PR and get CI checks plus a Vercel preview URL | ⛓ Everything else ships through this pipeline. SPEC.md settles the streak edge cases *before* code | Vite scaffolding, TypeScript config, ESLint flat config, Prettier, GitHub Actions basics, Vercel Git integration |
| 2 | **Playable Normal Game** | Play a real game at 4/5/6 letters | Core value first. ⛓ Scoring must be right before anything builds on it | Test-first pure functions (two-pass scoring), a build-time data script, lazy `import()`, CSS animations, reduced motion |
| 3 | **Wordubado Mode & Slang** | Switch to slang mode | Needs your review of slang.json (a *human gate*), which started in Phase 2 | Weighted randomness with an injectable RNG, statistical tests (75/25 over 10k draws), data validation tests |
| 4 | **Six Boards & Persistence** | Refresh or switch Boards without losing anything | ⛓ The save format must be fixed *before* streaks write into it | localStorage, schema versioning and migrations, defensive parsing, the `storage` event, a Zustand store |
| 5 | **Stats, Streaks & Restore** | See streaks, get the Restore prompt | The hardest logic; it sits on the settled storage | Date maths without DST bugs, state machines, table-driven tests, injecting "today" |
| 6 | **Result, Share & Definitions** | Finish a game, read the definition, share | Needs stats (5) and Wordubado (3) to exist | `fetch` with timeouts, the Web Share and Clipboard APIs, feature detection |
| 7 | **Themes, Accessibility & Polish** | Use dark or colour-blind mode, play with a screen reader or keyboard only | Polishing works best on finished screens | CSS custom properties, aria-live, focus traps, Open Graph metadata |
| 8 | **E2E, CI Hardening & Docs** | Trust that every change is tested end-to-end | Tests the whole flow once it exists; finishes this guide | Playwright, fake clocks, axe accessibility checks, CI gates, branch protection |

---

## 4. The code pipeline

### 4.1 From your editor to the live site

```
 ┌────────────┐   ┌──────────────┐   ┌───────────────┐   ┌──────────────┐   ┌─────────────┐
 │ words build│──►│ write code   │──►│ local checks  │──►│ push / PR    │──►│ GitHub      │
 │ (script)   │   │ + unit tests │   │ lint·tsc·test │   │              │   │ Actions CI  │
 └────────────┘   └──────────────┘   └───────────────┘   └──────────────┘   └──────┬──────┘
                                                                                    │ all green
                                                     ┌──────────────┐   ┌──────────▼──────┐
                                                     │ PRODUCTION   │◄──│ Vercel preview  │
                                                     │ (merge→main) │   │ URL on the PR   │
                                                     └──────────────┘   └─────────────────┘
```

### 4.2 Each stage explained

| Stage | Tool | What it does | Catches | Phase |
|---|---|---|---|---|
| **Words build** | `node scripts/build-words.mjs` | Turns `wordlist-english` into `src/data/answers-N.json` and `guesses-N.json`; removes blocklisted words, plurals and inflections | Swear words or plurals as answers, answers missing from the guess list | 2 |
| **Type check** | `tsc` (TypeScript 6.0) | Checks types across the whole project | Typos in property names, wrong argument types | 1 |
| **Lint** | ESLint 10 | Code-quality rules, React hooks rules | Unused variables, broken hook usage | 1 |
| **Format** | Prettier | One consistent code style | Style arguments, noisy diffs | 1 |
| **Unit tests** | Vitest | Tests pure logic in milliseconds | Scoring bugs (SPEED vs ERASE), streak and Restore edge cases, bad saved data | 1 → 5 |
| **Build** | Vite | Bundles and minifies into `dist/`; word lists become separate lazy chunks | Import errors, oversized bundle | 1 |
| **E2E tests** ✅ | Playwright | Runs the *built* site in real Chromium (desktop + phone) and plays full games | Things that only break when everything is joined together | 2 → 8 |
| **Word drift** ✅ | CI job | Re-runs the words build and fails if the result differs from what's committed | Someone editing the JSON by hand | 2 → 8 |
| **CI** | GitHub Actions | Runs all of the above on every PR and push to `main` | Merging something that only worked on your machine | 1 → 8 |
| **Preview deploy** | Vercel | A unique URL for every PR | Lets you click-test before merging | 1 |
| **Production deploy** | Vercel | Merging to `main` publishes the live site | n/a | 1 |

### 4.3 Commands you'll use

```bash
npm run dev          # local dev server with hot reload
npm run build:words  # ✅ regenerate word lists (Phase 2)
npm run lint         # ESLint
npm run format       # Prettier (write)  /  npm run format:check
npm run typecheck    # tsc -b
npm test             # Vitest, runs once  /  npm run test:watch (watch mode)
npm run build        # production build to dist/
npm run preview      # serve dist/ locally (what E2E tests run against)
npm run test:e2e     # ✅ Playwright against the production build (Phase 2)
npm run check:bundle # ✅ after build: proves word lists stay out of the entry chunk
```

CI runs the same commands in `.github/workflows/ci.yml` on every PR and push to main. It has three jobs that run in parallel:

- **`check`** runs lint, format, typecheck, unit tests, the build and `check:bundle`. It catches broken code and any change that accidentally pulls the word lists into the first download.
- **`words`** re-runs `npm run build:words` and fails if any generated file differs from what is committed (or a new file appears). It catches hand-edited word files.
- **`e2e`** installs Chromium, runs Playwright against the production build and uploads the `playwright-report` artifact. It catches things that only break when the whole game is joined together.

> 🎓 **Key idea: the "shift-left" ladder.** Each stage is cheaper and faster than the next: the type checker catches in 1 s what a unit test catches in 1 ms of runtime, what E2E catches in 30 s, and what a user catches after it's live. Push every check as far *left* (early) as you can.

---

## 5. How the code is layered (the architecture)

```
  UI components (React)        ← only displays things and sends user actions down
        │
  gameStore (Zustand)          ← orchestrates; the only place that touches clock, RNG, storage
        │
  logic/* (pure TypeScript)    ← evaluate, pickAnswer, streaks, dates, share, storage parsing
                                  no Date.now(), no Math.random(), no localStorage inside
```

**Why:** pure functions are trivial to test. If `streaks.ts` receives `today = "2026-03-08"` as a parameter instead of reading the clock, a test can check daylight-saving day in one line.

> 🎓 **What you'll learn:** *dependency injection* in its simplest form: pass in the things that change (time, randomness, storage) instead of reaching out for them.

---

## 6. Things you'll need to do yourself (human gates)

| When | What | Why it can't be automated |
|---|---|---|
| Phase 1 | Create a GitHub repo, push, connect it to Vercel | Needs your accounts |
| Phase 1 | Read and approve SPEC.md | It's your game's rules |
| Phase 2-3 | Review `slang.json` (~80-150 words per length) and skim the answer lists | Content taste: mild is OK, slurs never |
| Every phase | Answer discuss-phase questions and do the manual checks during verify | You decide what "feels right" (minimal, soft, light) |
| Phase 7-8 | Pick the production domain | Needed for share links and link previews |

---

## 7. Where to look when you're lost

| Question | File |
|---|---|
| What is this project, and what matters most? | `.planning/PROJECT.md` |
| What exactly must v1 do? | `.planning/REQUIREMENTS.md` |
| What's the phase order and what does "done" mean? | `.planning/ROADMAP.md` |
| Where are we right now? | `.planning/STATE.md` (or run `/gsd-progress`) |
| Why was this tool chosen? What could go wrong? | `.planning/research/` |
| What are the exact game rules? | `SPEC.md` (Phase 1) and `plan.txt` |
| What does "Board" / "Restore" mean? | `GLOSSARY.md` (Phase 1) |
| Where is the live site? | https://wordyday.vercel.app (also linked in `README.md`) |
