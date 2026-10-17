# Pipeline Guide: How Unlimited Wordle Gets Built

This is a learning guide. It explains **what happens, in what order, and why**: both the way the project is *planned* (the GSD workflow) and the way code *travels* from your editor to a live website (the build pipeline).

> Updated 2026-10-16, after the project shipped. This guide describes the pipeline as it really runs today, including what went wrong along the way (section 8).

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

### 2.1 What was set up first

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

The roadmap was a **vertical MVP**: something playable early, then each phase added one feature you can see. Some ordering was forced by dependencies (shown as ⛓). All eight phases are now done.

| # | Phase | You'll be able to… | Why here | 🎓 What you'll learn |
|---|---|---|---|---|
| 1 | **Foundation, Spec & CI Skeleton** | Opened a PR and get CI checks plus a Vercel preview URL | ⛓ Everything else ships through this pipeline. SPEC.md settles the streak edge cases *before* code | Vite scaffolding, TypeScript config, ESLint flat config, Prettier, GitHub Actions basics, Vercel Git integration |
| 2 | **Playable Normal Game** | Played a real game at 4/5/6 letters | Core value first. ⛓ Scoring must be right before anything builds on it | Test-first pure functions (two-pass scoring), a build-time data script, lazy `import()`, CSS animations, reduced motion |
| 3 | **Wordubado Mode & Slang** | Switched to slang mode | Needed your review of slang.json (a *human gate*), which started in Phase 2 | Weighted randomness with an injectable RNG, statistical tests (75/25 over 10k draws), data validation tests |
| 4 | **Six Boards & Persistence** | Refreshed or switched Boards without losing anything | ⛓ The save format had to be fixed *before* streaks write into it | localStorage, schema versioning and migrations, defensive parsing, the `storage` event, a Zustand store |
| 5 | **Stats, Streaks & Restore** | Saw streaks, got the Restore prompt | The hardest logic; it sits on the settled storage | Date maths without DST bugs, state machines, table-driven tests, injecting "today" |
| 6 | **Result, Share & Definitions** | Finished a game, read the definition, shared | Needed stats (5) and Wordubado (3) to exist | `fetch` with timeouts, the Web Share and Clipboard APIs, feature detection |
| 7 | **Themes, Accessibility & Polish** | Used dark or colour-blind mode, play with a screen reader or keyboard only | Polishing works best on finished screens | CSS custom properties, aria-live, focus traps, Open Graph metadata |
| 8 | **E2E, CI Hardening & Docs** | Trusted that every change is tested end-to-end | Tests the whole flow once it exists; finishes this guide | Playwright, fake clocks, axe accessibility checks, CI gates, branch protection |

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
| **Words build** | `node scripts/build-words.mjs` | Turns `wordlist-english` into `src/data/words-N.json` (answers and guesses per length); removes blocklisted words, plurals and inflections | Swear words or plurals as answers, answers missing from the guess list | 2 |
| **Type check** | `tsc` (TypeScript 6.0) | Checks types across the whole project | Typos in property names, wrong argument types | 1 |
| **Lint** | ESLint 10 | Code-quality rules, React hooks rules | Unused variables, broken hook usage | 1 |
| **Format** | Prettier | One consistent code style | Style arguments, noisy diffs | 1 |
| **Unit tests** | Vitest | Tests pure logic in milliseconds | Scoring bugs (SPEED vs ERASE), streak and Restore edge cases, bad saved data | 1 |
| **Build** | Vite | Bundles and minifies into `dist/`; word lists become separate lazy chunks | Import errors | 1 |
| **E2E build** | `npm run build:e2e` | `vite build --mode e2e`: the same build but it keeps the `__WORDLE_TEST__` hook that tests use to fix the answer | Tests that cannot control randomness | 8 |
| **Bundle budget** | `npm run check:bundle` | Fails if the first-load JS is over 100 KB gzip or the CSS over 10 KB gzip, and prints a size table every run. Today: JS 85.9 KB, CSS 4.4 KB | A heavy dependency or the word lists sneaking into the first download | 8 |
| **E2E tests** | Playwright | Runs the *built* site in real Chromium (desktop + phone) and plays full games | Things that only break when everything is joined together | 2 |
| **Word drift** | CI job | Re-runs the words build and fails if the result differs from what's committed | Someone editing the JSON by hand | 2 |
| **Browser cache** | `actions/cache` | Keeps the downloaded Playwright browser between runs, keyed on the Playwright version | Slow CI (only the system libraries are reinstalled on a hit) | 8 |
| **CI** | GitHub Actions | Runs all of the above on every PR and push to `main` | Merging something that only worked on your machine | 1 |
| **Branch protection** | GitHub | `main` requires the checks `check`, `words` and `e2e` to pass before a PR can merge (strict is off, so a PR does not need to be re-run after every other merge); force pushes and deletion are off | Merging red code | 8 |
| **Preview deploy** | Vercel | A unique URL for every PR | Lets you click-test before merging | 1 |
| **Production deploy** | Vercel | Merging to `main` publishes the live site | n/a | 1 |

### 4.3 Commands you'll use

```bash
npm run dev          # local dev server with hot reload
npm run build:words  # regenerate word lists
npm run lint         # ESLint
npm run format       # Prettier (write)  /  npm run format:check
npm run typecheck    # tsc -b
npm test             # Vitest, runs once  /  npm run test:watch (watch mode)
npm run build        # production build to dist/
npm run preview      # serve dist/ locally (what E2E tests run against)
npm run build:e2e     # production build that keeps the test hook (needed before E2E)
npm run test:e2e     # Playwright (it builds and serves the e2e build itself)
npm run check:bundle # after build: size budget plus word lists stay out of the entry chunk
npm run review:slang # apply the owner slang review to slang.json
```

CI runs the same commands in `.github/workflows/ci.yml` on every PR and push to main. It has three jobs that run in parallel:

- **`check`** runs lint, format, typecheck, unit tests, the build and `check:bundle` (the 100 KB / 10 KB gzip budget). It catches broken code and any change that makes the first download too big.
- **`words`** re-runs `npm run build:words` and fails if any generated file differs from what is committed (or a new file appears). It catches hand-edited word files.
- **`e2e`** restores the cached Chromium (or installs it on a miss), runs Playwright against the production build and uploads the `playwright-report` artifact. It catches things that only break when the whole game is joined together.

> **Test hook and builds.** The production build excludes the `__WORDLE_TEST__` hook (a build-time `import.meta.env.MODE` gate), so players cannot fix the answer from the console, and `check:bundle` fails if the string appears in `dist/`. Playwright builds with `npm run build:e2e` (`vite build --mode e2e`), which keeps the hook. After an E2E run, run `npm run build` again before `npm run check:bundle`, and stop any already-running preview server before E2E (a reused server would serve a build without the hook).

> 🎓 **Key idea: the "shift-left" ladder.** Each stage is cheaper and faster than the next: the type checker catches in 1 s what a unit test catches in 1 ms of runtime, what E2E catches in 30 s, and what a user catches after it's live. Push every check as far *left* (early) as you can.

> 🧪 Try it: **word drift.** Open `src/data/words-5.json`, change one word, push to a branch and open a PR. The `words` job re-generates the files, sees a difference and fails. Undo: `git checkout -- src/data/words-5.json` (or revert the commit) and push again.

> 🧪 Try it: **a broken unit test.** In any `*.test.ts` file change an expected value (for example make a scoring test expect the wrong colour) and push. The `check` job fails at `npm test`. Undo: revert the edit.

> 🧪 Try it: **bundle over budget.** Set `js: 50` in `BUDGET_KB` inside `scripts/check-bundle.mjs`, then run `npm run build && npm run check:bundle`. It exits with an error such as "entry JS is 85.9 KB gzip, budget 50 KB" and still prints the size table. Undo: set it back to `100`.

> 🧪 Try it: **a red E2E blocking a merge.** On a throwaway branch change one assertion in `e2e/game.spec.ts`, push, and open a PR. The `e2e` check goes red and the merge button says the required checks have not passed. Undo: close the PR and delete the branch.

### 4.4 Landing a phase

Each phase is one branch and one pull request (`phase-NN/short-name`), merged with a normal merge commit (no squash, so the per-task commits stay readable). Phases 2 to 7 were built as a stacked chain, each branch based on the previous one, and were only opened as PRs at the end. Branch protection came first: the repo was scanned for secrets, made public, and `main` was protected, so every PR then had to prove itself with the three required checks. The six PRs were each green on their own, then merged in order, with each child PR re-pointed at `main` just before its parent merged. A PR whose required check was still running showed as blocked, which is exactly the gate doing its job. Phase 8 itself went through the same flow.

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

## 6. Things you needed to do yourself (human gates)

| When | What | Why it can't be automated |
|---|---|---|
| Phase 1 | Create a GitHub repo, push, connect it to Vercel | Needs your accounts |
| Phase 1 | Read and approve SPEC.md | It's your game's rules |
| Phase 2-3 | Review `slang.json` and skim the answer lists | Content taste: mild is OK, slurs never |
| Every phase | Answer discuss-phase questions and do the manual checks during verify (screen reader, iPhone Safari, link preview in Phase 7) | You decide what "feels right" (minimal, soft, light) |
| Phase 8 | Make the repo public after the secret scan | Visibility is an owner decision |
| Later | Pick a custom production domain | Deferred: the site runs on the free `wordyday.vercel.app` address for now |

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

---

## 8. What actually happened

Plans are tidy; projects are not. Here is the honest version, phase by phase, drawn from each phase's verification and summary files.

- **Phase 1, foundation.** Passed 4/4. Lesson: getting CI and the Vercel preview working on an almost empty app first meant every later phase shipped through a pipeline that already worked.
- **Phase 2, playable game.** Passed, but the build only removes an inflected word (like "used") when its stem is also in the list, so about 60 such words stayed in the answer pools. The owner accepted it. Lesson: a deliberate heuristic is a decision, so record it.
- **Phase 3, Wordubado.** Passed. The owner's slang review was a real human gate, and statistical tests (75/25 over 10k draws) made the weighted pick checkable.
- **Phase 4, persistence.** Needed gap-closure plans 04-08 to 04-12 after the first verification. The big one: a save from a *newer* app version was treated as corrupt and could be wiped. Lesson: verification against the goal found what the green tasks missed.
- **Phase 5, streaks.** Verification ended as "gaps found". The deferred Restore credit is stored as a yes/no flag, not a date, so a Restore answered a day or more after the game can credit a day with no game (CR-01). It is **still open** and is a known defect, not a finished item.
- **Phase 6, result and share.** Landed with its plan 06-07 owner checks (iPhone share sheet, live dictionary, win feel) not done and no 06-VERIFICATION.md. The owner chose to land it as-is. Lesson: skipping a gate is allowed, but only if it is written down.
- **Phase 7, themes and accessibility.** Passed 5/5 and the owner approved the screen-reader and iPhone checks. Four review warnings (such as the reset text not saying that games and Restores are erased) were left as follow-ups.
- **Phase 8, E2E and CI hardening.** The QA-03 audit found all eight promised journeys already covered in both projects, so no new spec was needed. Six stacked PRs were each green with 0 flaky tests (slowest E2E job 5m45s). The new gzip budget (JS 85.9 of 100 KB) and the browser cache were added, and sharding was not, because the run was under ten minutes. Lesson: measure before optimising.
