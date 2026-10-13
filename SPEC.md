# Unlimited Wordle: Spec

> This file is the source of truth for the game rules. It supersedes `plan.txt`, which is kept only as the history of the Q&A that settled the rules (D-09). Terms such as Board, Mode and Restore are defined in `GLOSSARY.md`.

## 0. How to read this spec

- The capitalised terms (Board, Mode, Normal, Wordubado, Answer Pool, Guess Pool, Win Streak, Day Streak, Missed Day, Restore, Forfeit and Give Up) are defined in [GLOSSARY.md](GLOSSARY.md). Use them exactly as written.
- Every rule has a stable ID of the form `R-<AREA>-<n>`, for example `R-SCORE-1` or `R-RESTORE-3`. Tests, plans and code comments cite these IDs.
- IDs are stable. They are never renumbered. A rule that is removed stays in the file marked "Retired" so old references still make sense.
- MUST means the game is wrong without it. SHOULD means a strong default that an owner decision can change.
- Each rule ends with a `Covers:` line naming the `REQUIREMENTS.md` IDs it implements, or `Covers: -` when it is a supporting rule with no requirement of its own.
- A short `Why:` note explains rules that are not obvious. This project is a learning project, so the reasons matter as much as the rules.
- Edge cases for the streak and Restore logic live in the table in section 8 (`EC-01` to `EC-44`). Phase 5 turns those rows into table-driven tests.

## 1. Overview and scope

Unlimited Wordle is a public, endless Wordle game on the web. A player picks a Mode (Normal or Wordubado) and a word length (4, 5 or 6 letters) and can play as many games as they like. There is no daily shared puzzle. The game tracks a Win Streak per Board and one global Day Streak that can be protected by a limited number of monthly Restores.

- R-SCOPE-1: The site name shown to players is "Unlimited Wordle". (The repo name is only a repo name.) Covers: UI-10
- R-SCOPE-2: The game is a static web app. All saved data lives in the browser (localStorage). There are no accounts, no server and no cross-device sync. Covers: SAVE-01
- R-SCOPE-3: What is out of scope is listed in section 13. Covers: -

## 2. Modes, lengths and attempts

- R-MODE-1: There are two Modes: Normal and Wordubado. The player can switch between them at any time. Covers: WORD-01
- R-MODE-2: Wordubado has an (i) info popup. It explains the mode and warns that the content can be mildly crude. Covers: WORD-06
- R-MODE-3: There is no hard mode. Covers: -
- R-LEN-1: Word lengths are 4, 5 and 6 letters, and the number of attempts is the length plus one: 5 attempts for 4 letters, 6 attempts for 5 letters, 7 attempts for 6 letters. Covers: PLAY-01
  - Why: `attempts = length + 1` keeps the difficulty feel the same across lengths. The code constant `BOARD_CONFIG` mirrors this rule.

## 3. Word pools

Two pools exist per length. The **Answer Pool** is what the game can pick as a secret word. The **Guess Pool** is what the player is allowed to type. Splitting them lets the game accept a very large vocabulary while keeping answers fair.

- R-POOL-1: In Normal, every answer is a common English word. Slang, meme and Gen Z words are never a Normal answer. Covers: WORD-02, WORD-03
- R-POOL-2: In Normal, slang, meme and Gen Z words are valid guesses. Covers: WORD-03
- R-POOL-3: In Wordubado, each game's answer is drawn from slang with 75% probability and from common words with 25% probability. The choice is made per game, when the game starts. Covers: WORD-04
- R-POOL-4: Answers are fully random. The same answer may appear twice in a row. Covers: WORD-05
- R-POOL-5: The Guess Pool for a length is a superset of every Answer Pool for that length and includes all slang words. Covers: WORD-07
  - Why: if an answer were missing from the Guess Pool, a player could be unable to type the correct word.
- R-POOL-6: The profanity blocklist applies to answers only. Guesses stay permissive, so a crude real word can be typed as a guess but is never an answer. Covers: WORD-02, WORD-07
- R-POOL-7: Plurals and inflections (-s, -ed, -ing) are excluded from Normal answers. They remain valid guesses. Covers: WORD-02
  - Why: "BOATS" as an answer feels unfair, but a player must still be able to try it as a guess.
- R-POOL-8: No answer anywhere is a slur or a hate term. Slang may be mildly crude. Covers: WORD-08
- R-POOL-9: Answer and Guess Pools are generated at build time from a word source plus the blocklist and the curated slang file. The generated files are committed and CI checks they have not drifted. The pools are loaded per length and are not part of the initial page load. Covers: WORD-07, WORD-09

## 4. Guesses and scoring

- R-GUESS-1: A guess MUST have exactly the Board's word length and MUST be in the Guess Pool for that length. Covers: PLAY-03
- R-GUESS-2: An invalid or too-short guess shakes the row and shows a toast. It does NOT use an attempt. Covers: PLAY-03
- R-GUESS-3: Input is blocked while a row is revealing (the flip animation). Covers: PLAY-05
- R-GUESS-4: The player can type with the on-screen keyboard and the physical keyboard. Covers: PLAY-04
- R-GUESS-5: A player who uses all attempts without finding the word loses, and the answer is revealed. Covers: PLAY-06
- R-SCORE-1: Each letter of a guess is scored `correct` (green), `present` (yellow) or `absent` (gray) using two passes. Covers: PLAY-02
  1. Pass 1: mark every position where the guess letter equals the answer letter as `correct`, and remove that answer letter from the pool of unmatched answer letters.
  2. Pass 2: walk the remaining guess letters left to right. If the letter still has an unmatched copy in the answer, mark it `present` and use up one copy. Otherwise mark it `absent`.
  - Why: scoring greens first stops a yellow from stealing a letter that a later green needs. The pool of answer letters is limited by how many copies of each letter the answer really has.
- R-SCORE-2: Worked example, answer ABBEY, guess BABES. Covers: PLAY-02
  - Pass 1 (greens): position 3 B = B, position 4 E = E. Position 1 B vs A, position 2 A vs B, position 5 S vs Y are not green.
  - Unmatched answer letters after pass 1: A, B, Y.
  - Pass 2: position 1 B has a B left, so `present`. Position 2 A has an A left, so `present`. Position 5 S has no S, so `absent`.
  - Result, tile by tile: B yellow, A yellow, B green, E green, S gray.
- R-SCORE-3: Worked example, answer SPEED, guess ERASE. Covers: PLAY-02
  - Pass 1 (greens): none. E vs S, R vs P, A vs E, S vs E, E vs D.
  - Unmatched answer letters: S, P, E, E, D.
  - Pass 2: position 1 E takes the first E, so `present`. Position 2 R is `absent`. Position 3 A is `absent`. Position 4 S takes the S, so `present`. Position 5 E takes the second E, so `present`.
  - Result, tile by tile: E yellow, R gray, A gray, S yellow, E yellow.
  - Why: both E tiles are yellow because SPEED really has two Es. If the answer had only one E, the second guess E would be gray.
- R-GUESS-6: Each on-screen key keeps its best state seen so far: green is better than yellow, and yellow is better than gray. A key never goes backwards. Key colours update after the flip animation finishes, not before. Covers: PLAY-04, PLAY-05

## 5. Boards and persistence

- R-BOARD-1: A Board is one Mode and one length together, so there are 6 Boards (2 Modes x 3 lengths). Each Board has its own saved game. In code the Board key is `${mode}-${len}`, for example `wordubado-5`. Covers: SAVE-01
- R-BOARD-2: Switching Mode or length never forfeits a game. The player returns to the same game later. Covers: SAVE-02
- R-BOARD-3: Refreshing the page resumes the in-progress game. Only submitted guesses are saved. A half-typed row is discarded. Covers: SAVE-03
- R-BOARD-4: A Board whose game is finished shows the finished grid, a result banner and a Play again button. A new game on that Board starts only when the player presses Play again. Covers: SAVE-04
  - Why: it lets the player look at the result they just earned, instead of the board vanishing the moment they return.
- R-SAVE-1: All saved data is one versioned document with a version number and a migration chain that starts at the first release. Covers: SAVE-05
  - Why: once real players have saved data, every later change to its shape needs a migration, or their progress is lost.
- R-SAVE-2: Saved data is validated on load. If it is corrupt or hand-edited into an invalid shape, the raw text is backed up under a separate key (the main key plus `:corrupt`), and the app starts fresh. It never shows a blank page. Covers: SAVE-06
- R-SAVE-3: If localStorage is unavailable, blocked or full, the app keeps working in memory for that session. Covers: SAVE-07
- R-SAVE-4: Two tabs of the game stay in sync through the browser `storage` event. Covers: SAVE-08
- R-SAVE-5: Settings has a reset that clears games, stats, streaks and Restores after a confirm. Covers: SAVE-09
- R-SAVE-6: Settings shows a note that progress is stored in this browser only. Covers: UI-11
- R-DATE-1: Dates are local calendar dates stored as `YYYY-MM-DD` strings. Covers: STRK-03
- R-DATE-2: The number of days between two dates is computed from the parsed year, month and day parts using `Date.UTC(y, m-1, d)` and then divided by 86,400,000. It is never computed as `(now - then) / 86400000` on local timestamps. Covers: STRK-03
  - Why: with daylight saving time, a local day can be 23 or 25 hours long, so dividing local timestamps gives the wrong day count. UTC day numbers are always exactly 24 hours apart.
- R-DATE-3: The logic functions receive `today` as an input. The clock is read only at the edge of the app (the store and event handlers), so tests can pass any date. Covers: STRK-03
- R-DATE-4: The missed-day check runs when the app opens, when the tab regains focus (`visibilitychange` and focus), and when the local date changes (for example the page stays open past midnight). Covers: STRK-04

## 6. Give Up, New game and Forfeit

- R-FORFEIT-1: Give Up is allowed only when exactly 2 tries are left, defined as `attemptsUsed === maxAttempts - 2`. For a 5-letter Board (6 attempts) that means 4 guesses used. Covers: PLAY-07
- R-FORFEIT-2: Pressing New game while a game is in progress is allowed only under the same rule (`attemptsUsed === maxAttempts - 2`). It is a Forfeit. Covers: PLAY-08
- R-FORFEIT-3: Both actions ask for confirmation. New game asks: "This counts as a loss. Start a new game?" Give Up uses the same confirm pattern, then reveals the answer. Covers: PLAY-07, PLAY-08
- R-FORFEIT-4: Both actions count as a loss and as a finished game. The Board's Win Streak resets to 0 and the game counts toward the Day Streak (see R-DAY-1). Covers: PLAY-07, PLAY-08, STRK-01, STRK-02
- R-FORFEIT-5: Once a game is finished (won, lost, Give Up or Forfeit), New game and Play again are always available. Covers: PLAY-08
- R-FORFEIT-6: A fresh Board with zero guesses cannot be abandoned. This is an intended consequence of the exactly-2-tries rule (see open question 4 in section 8). Covers: PLAY-07, PLAY-08
  - Why: if a player could abandon a fresh board at any time, they could reroll boards for free and farm the Day Streak with instant losses. Limiting it to exactly 2 tries left makes giving up cost real effort.

## 7. Streaks

- R-WIN-1: Each Board has its own Win Streak. It goes up by 1 on a win. Covers: STRK-01
- R-WIN-2: A Board's Win Streak resets to 0 on a loss, a Give Up or a Forfeit on that Board. A loss on one Board does not touch other Boards. Covers: STRK-01
- R-WIN-3: Any Missed Day resets every Board's Win Streak to 0, immediately, whether or not a Restore is later used. A Restore never brings Win Streaks back. Covers: STRK-05
- R-DAY-1: There is one global Day Streak. It goes up by 1 at most once per local calendar day, when any game finishes: a win, a loss, a Give Up or a Forfeit. More games on the same day add nothing. Covers: STRK-02
- R-DAY-2: A game counts for the local date on which it finishes, not the date it started. A game that starts at 23:59 and ends after midnight counts for the new day. Covers: STRK-02, STRK-03
- R-DAY-3: A Missed Day is a local calendar day with no finished game. The count of missed days is taken strictly between the last active date and today: `missed = max(0, days(today) - days(lastActiveDate) - 1)`. Covers: STRK-03
  - Why: if you last played on Monday and today is Wednesday, only Tuesday was missed, so missed is 1.
- R-DAY-4: The longest Day Streak only ever increases. It is updated when the current Day Streak exceeds it. Decline and Restore do not change it. Covers: STRK-02

## 8. Restore state machine

A Restore protects the Day Streak (never Win Streaks). The logic is written as a small state machine: `(state, event, today) -> state`. It is a pure function of its inputs, which is why `today` is injected (R-DATE-3) and why Phase 5 can test it with a table.

### Persisted state

The exact storage shape is finalised in Phase 4. The names below are the ones the rules use.

- `dayStreak { current, longest, lastActiveDate }` where `lastActiveDate` is `YYYY-MM-DD` or `null`.
- `restores { month: 'YYYY-MM', used: 0..3 }`.
- `pendingRestore: null | { streak, missed }`. It is persisted so a refresh shows the prompt again (D-02).
- Per Board: `winStreak`.

### Derived values (never stored)

- `restoresLeft = 3 - used`, evaluated after the monthly refill and clamped to the range 0 to 3.
- `missed = max(0, days(today) - days(lastActiveDate) - 1)`, with `days()` taken from `Date.UTC` parts (R-DATE-2).
- `missed = 0` when `lastActiveDate` is `null` or later than `today`.

### States

| State     | Meaning                                                                         |
| --------- | ------------------------------------------------------------------------------- |
| NO_STREAK | `current = 0`. Nothing to protect.                                              |
| ACTIVE    | `current > 0` and `missed = 0`. The streak is alive.                            |
| PENDING   | A Restore prompt is outstanding. `pendingRestore` is set. Waiting for an answer. |

### Events

All events take an injected `today`.

| #   | Event                          | Trigger                                                                           |
| --- | ------------------------------ | --------------------------------------------------------------------------------- |
| E1  | `CHECK(today)`                 | app open, tab focus or visibilitychange, local date change, and before every E4   |
| E2  | `RESTORE(today)`               | the player taps Restore in the prompt                                             |
| E3  | `DECLINE(today)`               | the player taps No in the prompt                                                  |
| E4  | `FINISH(today, board, outcome)` | a game ends: win, loss, Give Up or Forfeit                                        |
| E5  | `RESET_ALL`                    | Settings reset after a confirm                                                    |

### Transitions

- R-RESTORE-1: Refill first, and only forward. At the start of `CHECK`, `RESTORE` and `FINISH`: if `monthOf(today)` is later than `restores.month`, set `restores = { month: monthOf(today), used: 0 }`. The refill runs before any eligibility test (D-03). It never runs when the clock has moved backwards, and `restores.month` never moves to an earlier month. Covers: STRK-08
  - Why: a check on the 1st must already see 3 Restores. Doing the refill lazily, at the moment it matters, avoids needing a timer.
- R-RESTORE-2: `CHECK` with `missed = 0` changes nothing. This covers a `null` last active date, the same day, yesterday and a clock moved backwards. Covers: STRK-03, STRK-04
- R-RESTORE-3: `CHECK` with `missed >= 1` while PENDING re-evaluates eligibility using the current `today`, because the gap may have grown. If still eligible, nothing changes. If no longer eligible (missed is now above 4, or no Restore is left after the refill), apply R-RESTORE-5 (auto-decline). Win Streaks are already 0, so running this again is harmless (D-01). Covers: STRK-04
- R-RESTORE-4: `CHECK` with `missed >= 1` while not PENDING sets every Board's Win Streak to 0. Then, if `current > 0` AND `missed <= 4` AND `restoresLeft > 0`, the state becomes PENDING with `pendingRestore = { streak: current, missed }` and the prompt is shown. Otherwise `current` becomes 0 and no prompt is shown. Covers: STRK-05, STRK-06
- R-RESTORE-5: `DECLINE`, and the auto-decline from R-RESTORE-3, set `current = 0` and `pendingRestore = null`. `lastActiveDate`, `longest` and the Restore count do not change. A second `CHECK` for the same `today` then sees `current = 0` and does nothing, so the check is idempotent (D-01). Covers: STRK-04, STRK-07
- R-RESTORE-6: `RESTORE` is valid only in PENDING. It applies the refill first (R-RESTORE-1). If `restoresLeft` is then 0, it is treated as `DECLINE`. Otherwise it sets `used += 1`, counted in the month of `today`; sets `lastActiveDate` to yesterday (the day before `today`); leaves `current` and `longest` unchanged; and sets `pendingRestore = null`. One Restore covers the whole gap. A second `RESTORE` is a no-op because the state is no longer PENDING. Win Streaks stay 0. Covers: STRK-07, STRK-08
- R-RESTORE-7: `FINISH` runs `CHECK(today)` first. If that produced PENDING, the Board result (Win Streak and stats) is recorded now, and the Day Streak credit is deferred until the prompt is answered, after which R-RESTORE-8 is applied. If it did not produce PENDING, R-RESTORE-8 applies at once. This is a stated default; see open question 1. Covers: STRK-02, STRK-04
- R-RESTORE-8: Day Streak credit. If `lastActiveDate` is `null` or `today` is later than `lastActiveDate`: `current += 1`, `longest = max(longest, current)`, `lastActiveDate = today`. If `today` equals `lastActiveDate` (already credited today) or is earlier (clock moved backwards): no change. `lastActiveDate` never moves backwards (D-05). Covers: STRK-02, STRK-03
- R-RESTORE-9: Win Streak on `FINISH`: a win adds 1 to that Board's `winStreak`. A loss, Give Up or Forfeit sets that Board's `winStreak` to 0. The Day Streak credit of R-RESTORE-8 applies to all four outcomes (D-06). Covers: STRK-01, STRK-02
- R-RESTORE-10: `FINISH` uses the local date at the moment the game finishes, not the date it started (D-04). A game that crosses midnight triggers the date-change `CHECK` and then credits the new day. The check must not punish a player who was active yesterday. Covers: STRK-02, STRK-04
- R-RESTORE-11: `RESET_ALL` returns everything to the initial state: `current = 0`, `longest = 0`, `lastActiveDate = null`, `restores = { month: monthOf(today), used: 0 }`, `pendingRestore = null`, all Win Streaks 0. Covers: SAVE-09
- R-RESTORE-12: While PENDING, the game accepts no input. The Restore modal can only be closed by answering Restore or No. Esc and clicking outside do nothing (D-02). Covers: STRK-06
- R-RESTORE-13: The prompt text uses this template, with `{restoresLeft}` being the number left before this Restore is used: `Your {streak}-day streak broke. Restore it? ({restoresLeft} left this month)`. Example: `Your 12-day streak broke. Restore it? (2 left this month)`. Covers: STRK-06

### Worked example (the calendar case)

The last active day is Monday 1 June 2026, and the player has a Day Streak above 0 and at least one Restore left.

| Today        | missed | Result                                                   |
| ------------ | ------ | -------------------------------------------------------- |
| Mon 1 June   | 0      | nothing                                                  |
| Tue 2 June   | 0      | nothing (yesterday counts as active)                     |
| Wed 3 June   | 1      | Win Streaks reset, prompt shown                          |
| Sat 6 June   | 4      | prompt still offered (the last day it can be)            |
| Sun 7 June   | 5      | Day Streak resets to 0, no prompt                        |

### Transition diagram

```
              CHECK, missed>=1, current>0,
              missed<=4, restoresLeft>0
   ACTIVE ------------------------------------> PENDING
     ^  |                                        |  |  |
     |  | CHECK, missed>=1, not eligible         |  |  | CHECK, still eligible
     |  v                                        |  |  +--> PENDING (no change)
     | NO_STREAK <-------- DECLINE / auto-decline +  |
     |    ^                                         | RESTORE (lastActiveDate = yesterday)
     |    |                                         v
     +----+------------------------------------ ACTIVE
        FINISH credit (+1, lastActiveDate = today)
        NO_STREAK --FINISH credit--> ACTIVE (current = 1)
        any state --RESET_ALL--> NO_STREAK
```

### Edge-case table

Notation: `S` is `dayStreak.current`, `LAD` is `lastActiveDate`, `R` is `restores` as `month/used`, `WS` is the Win Streaks. All dates are in 2026 unless noted, and 1 June 2026 is a Monday. "Prompt" means the blocking Restore prompt. Phase 5 test titles cite the EC ID.

| ID    | Case                                  | Given                                               | Event + today                              | Expected                                                                                  | Covers                  |
| ----- | ------------------------------------- | --------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------- |
| EC-01 | Same day                              | S=5, LAD=Jun 3                                      | CHECK Jun 3                                | no change                                                                                 | STRK-03, STRK-04        |
| EC-02 | Yesterday                             | S=5, LAD=Jun 2                                      | CHECK Jun 3                                | no change, no prompt (missed 0)                                                           | STRK-03                 |
| EC-03 | One missed day                        | S=5, LAD=Jun 1, R=2026-06/0                         | CHECK Jun 3                                | WS all 0, prompt shown (3 left)                                                           | STRK-05, STRK-06        |
| EC-04 | Four missed days (boundary)           | S=5, LAD=Mon Jun 1                                  | CHECK Sat Jun 6                            | prompt offered                                                                            | STRK-06                 |
| EC-05 | Five missed days (boundary)           | S=5, LAD=Mon Jun 1                                  | CHECK Sun Jun 7                            | S=0, no prompt, WS all 0                                                                  | STRK-05, STRK-06        |
| EC-06 | Streak is already 0                   | S=0, LAD=Jun 1                                      | CHECK Jun 4                                | WS all 0, no prompt                                                                       | STRK-05, STRK-06        |
| EC-07 | No Restores left                      | S=5, LAD=Jun 1, R=2026-06/3                         | CHECK Jun 3                                | S=0, no prompt, WS all 0                                                                  | STRK-06, STRK-08        |
| EC-08 | New player                            | S=0, LAD=null                                       | CHECK any day                              | no change                                                                                 | STRK-03                 |
| EC-09 | Idempotent check while pending        | state after EC-03 (PENDING)                         | CHECK Jun 3 again                          | identical state, still one prompt                                                         | STRK-04                 |
| EC-10 | Idempotent check after a reset        | state after EC-05                                   | CHECK Jun 7 again                          | identical state                                                                           | STRK-04                 |
| EC-11 | Pending, then page refresh            | EC-03 pending, page reloaded                        | CHECK Jun 3                                | prompt shown again, `used` still 0                                                        | STRK-07                 |
| EC-12 | Gap grows while pending               | EC-03 pending                                       | CHECK Jun 8 (missed 6)                     | S=0, pending cleared, no prompt                                                           | STRK-04, STRK-06        |
| EC-13 | Restore accepted                      | EC-03 pending                                       | RESTORE Jun 3                              | S=5, LAD=Jun 2, R used=1, WS all 0, pending null                                          | STRK-07                 |
| EC-14 | Restore, then finish today            | state after EC-13                                   | FINISH win Jun 3                           | S=6, LAD=Jun 3                                                                            | STRK-02, STRK-07        |
| EC-15 | Restore, nothing played, next day     | state after EC-13, no game finished                 | CHECK Jun 4                                | LAD=Jun 2 so missed 1: prompt again if eligible (a Restore buys no free pass for today)   | STRK-06, STRK-07        |
| EC-16 | Decline                               | EC-03 pending                                       | DECLINE Jun 3                              | S=0, pending null, R unchanged                                                            | STRK-07                 |
| EC-17 | Decline, then finish                  | state after EC-16                                   | FINISH win Jun 3                           | S=1, LAD=Jun 3                                                                            | STRK-02, STRK-07        |
| EC-18 | Double RESTORE                        | state after EC-13                                   | RESTORE Jun 3                              | no-op, `used` stays 1                                                                     | STRK-07                 |
| EC-19 | One Restore covers the whole gap      | S=9, LAD=Jun 1, pending after CHECK Jun 5 (missed 3) | RESTORE Jun 5                              | `used` +1 only, LAD=Jun 4, S=9                                                            | STRK-07                 |
| EC-20 | Restore limit                         | S=5, LAD=Jun 1, R=2026-06/2, pending after CHECK Jun 3 | RESTORE Jun 3, later a new gap in June     | third Restore works (used=3); the next gap gives S=0 and no prompt (no Restore left)      | STRK-06, STRK-08        |
| EC-21 | Refill on the 1st                     | S=5, LAD=Jun 28, R=2026-06/3                        | CHECK Jul 1 (missed 2)                     | R=2026-07/0, then prompt shows "3 left"                                                   | STRK-08                 |
| EC-22 | Gap seen in a new month, answered then | S=5, LAD=Jun 28, R=2026-06/3, first CHECK on Jul 1  | RESTORE Jul 1                              | counted against 2026-07, used=1                                                           | STRK-07, STRK-08        |
| EC-23 | Month changes while prompt unanswered | S=5, LAD=Jun 27, R=2026-06/2, pending since CHECK Jun 30 (missed 2) | RESTORE Jul 1                  | refill first, then used=1 in 2026-07, LAD=Jun 30                                          | STRK-08                 |
| EC-24 | Year boundary                         | S=5, LAD=2026-12-30                                 | CHECK 2027-01-02 (missed 2)                | prompt shown; month key 2027-01 refills                                                   | STRK-03, STRK-08        |
| EC-25 | Leap day                              | S=5, LAD=2028-02-28                                 | CHECK 2028-03-01 (missed 1)                | prompt shown (29 Feb is a missed day). In 2027, 28 Feb to 1 Mar is missed 0               | STRK-03                 |
| EC-26 | DST spring forward                    | TZ America/Los_Angeles, S=5, LAD=2026-03-07         | CHECK 2026-03-09 (missed 1)                | prompt; day maths uses UTC parts, not a 23-hour day                                       | STRK-03                 |
| EC-27 | DST fall back                         | TZ America/Los_Angeles, S=5, LAD=2026-10-31         | CHECK 2026-11-02 (missed 1)                | prompt; day maths is unaffected by the 25-hour day                                        | STRK-03                 |
| EC-28 | Time zone variety                     | TZ Pacific/Auckland, Asia/Kolkata and UTC           | same dates as EC-03 and EC-05              | identical results in every zone                                                           | STRK-03                 |
| EC-29 | Clock moved backwards                 | S=5, LAD=Jun 10                                     | CHECK Jun 5                                | no change, no prompt, LAD stays Jun 10                                                    | STRK-03                 |
| EC-30 | Clock backwards, then finish          | S=5, LAD=Jun 10                                     | FINISH win Jun 5                           | no Day Streak credit, LAD stays Jun 10, S=5                                               | STRK-02, STRK-03        |
| EC-31 | Clock backwards across a month        | R=2026-07/2                                         | CHECK with today in June 2026              | no refill, `restores.month` does not regress                                              | STRK-03, STRK-08        |
| EC-32 | Several games in one day              | S=4, LAD=Jun 2                                      | FINISH x3 on Jun 3                         | S=5, LAD=Jun 3 (+1 once)                                                                  | STRK-02                 |
| EC-33 | A loss counts                         | S=4, LAD=Jun 2                                      | FINISH loss Jun 3                          | S=5                                                                                       | STRK-02                 |
| EC-34 | Give Up counts                        | S=4, LAD=Jun 2                                      | FINISH Give Up Jun 3                       | S=5                                                                                       | STRK-02                 |
| EC-35 | Forfeit counts                        | S=4, LAD=Jun 2                                      | FINISH Forfeit Jun 3                       | S=5 (owner decision 2026-10-01)                                                           | STRK-02                 |
| EC-36 | A loss resets only its own Board      | WS a=3, b=2                                         | FINISH loss on a                           | a=0, b=2                                                                                  | STRK-01                 |
| EC-37 | A missed day resets all Win Streaks   | WS a=3, b=2, S=5, LAD=Jun 1                         | CHECK Jun 3                                | a=0, b=0 at once, even if the player later declines or restores                           | STRK-05                 |
| EC-38 | Restore never revives Win Streaks     | state after EC-37                                   | RESTORE Jun 3                              | WS stay 0                                                                                 | STRK-05, STRK-07        |
| EC-39 | Midnight mid-game, active yesterday  | S=5, LAD=Jun 3, game started Jun 3 23:59            | FINISH win Jun 4                           | CHECK is a no-op (missed 0); credit for Jun 4: S=6, LAD=Jun 4                             | STRK-02, STRK-04        |
| EC-40 | Midnight mid-game, break found at finish | S=5, LAD=Jun 1, game started Jun 3, tab never rechecked | FINISH win Jun 4                  | CHECK first (missed 2): WS reset, PENDING. Board result recorded, Day Streak credit deferred (R-RESTORE-7) | STRK-02, STRK-04 |
| EC-41 | Longest only goes up                  | S=3, longest=8, LAD=Jun 2                           | FINISH win Jun 3                           | S=4, longest stays 8. Longest changes only when S exceeds it                              | STRK-02                 |
| EC-42 | Decline keeps `longest`               | S=5, longest=9, EC-03 pending                       | DECLINE Jun 3                              | S=0, longest=9                                                                            | STRK-07                 |
| EC-43 | Prompt text numbers                   | S=12, R=2026-06/1, LAD=Jun 1                        | CHECK Jun 3 produces PENDING               | text is "Your 12-day streak broke. Restore it? (2 left this month)"                       | STRK-06                 |
| EC-44 | Corrupt `used` value                  | R month matches today, used=7                       | CHECK                                      | `restoresLeft` clamps to 0, never negative. Phase 4 validation also rejects it            | STRK-06, STRK-08        |

### Open questions with stated defaults (owner may override)

These are cases where the settled rules did not decide the answer. The spec uses the default shown. The owner can change any of them, and then the affected EC rows change with them.

1. **A FINISH that itself reveals a broken streak (EC-40).** Default: record the Board result now, defer the Day Streak credit until the prompt is answered, then credit +1. Accepting gives LAD=yesterday and then today, so S+1. Declining gives S=0 and then S=1. Affects EC-40.
2. **"K left this month" in the prompt (EC-43).** Default: K is the number of Restores left before this Restore is used. Affects EC-43, EC-03, EC-21.
3. **A Restore answered in a later month than the gap (EC-22, EC-23).** Default: refill first on the answer date and count the Restore against the month of the answer date. Affects EC-22, EC-23.
4. **A fresh Board with zero guesses cannot be abandoned (R-FORFEIT-6).** Default: this is an intended anti-farming consequence of the exactly-2-tries rule. Note that the research summary once wrote "2 or fewer tries", while REQUIREMENTS PLAY-07 and PLAY-08 say "exactly 2". The spec follows REQUIREMENTS.

## 9. Statistics

- R-STAT-1: Stats show games played, win rate, current and longest Win Streak, the guess distribution and the average number of guesses over won games only. Covers: STAT-01
- R-STAT-2: Stats have tabs 4, 5, 6 and All. Normal and Wordubado are shown separately and are never mixed. Covers: STAT-02
- R-STAT-3: The All tab shows totals only. Win Streaks appear only on the 4, 5 and 6 tabs. Covers: STAT-02
- R-STAT-4: The Day Streak (current and longest) and "Restores left: N/3" are shown globally, not per tab. Covers: STAT-03
- R-STAT-5: With zero games, stats show clean empty values. There is no division by zero and no NaN anywhere. Covers: STAT-04
  - Why: win rate and average guesses divide by a count that is zero for a new player.

## 10. Result and share

- R-RESULT-1: When a game finishes the player sees whether they won or lost, the answer, attempts used, their stats and a Play again button. Covers: RSLT-01
- R-RESULT-2: A "Show definition" button is hidden until clicked, in both Modes. Slang words use the curated definition bundled with the app. Common words are looked up from dictionaryapi.dev. On timeout, error or offline, the text "Definition unavailable" is shown. Covers: RSLT-02
- R-SHARE-1: The share text starts with a header: Wordubado `Unlimited Wordle - Wordubado 5 - 4/6`, Normal `Wordle 5 - 4/6` (owner decision 2026-10-05, Phase 6 D-12). The emoji grid and the site URL follow. A loss shows `X/6` style, using the attempts of that Board (`X/5`, `X/6` or `X/7`). Covers: RSLT-03
- R-SHARE-2: In colour-blind mode the grid uses orange and blue squares instead of green and yellow. Covers: RSLT-03
- R-SHARE-3: On phones that support it, Share opens the Web Share sheet. Otherwise the text is copied to the clipboard and a "Copied" toast is shown. Covers: RSLT-04

## 11. Extras and UI rules

- R-UI-1: The How-to-play modal opens automatically on the first visit and can be reopened from the header. Covers: UI-04
- R-UI-2: Dark mode follows the system preference on the first visit, and there is no flash of the wrong theme while loading. Covers: UI-02
- R-UI-3: A colour-blind (high-contrast) palette can be turned on. Covers: UI-03
- R-UI-4: Under `prefers-reduced-motion`, the flip, pop and shake animations are disabled and reveal delays are shortened. The state change stays visible. Covers: UI-09
- R-UI-5: Screen readers hear each guess result through an aria-live region, and tiles and keys have accessible labels. Covers: UI-07
- R-UI-6: The whole game can be played with the keyboard alone. Covers: UI-08
- R-UI-7: Modals trap focus, close on Esc and return focus to where it was. The one exception is the blocking Restore prompt, which can only be closed by answering it (R-RESTORE-12). Covers: UI-08, STRK-06
- R-UI-8: The layout works at phone widths of 320 px and up, including the largest grid (6 letters by 7 rows). Covers: UI-06

## 12. Resolved decisions log

| Decision                                                                                       | Source                    | Date       |
| ---------------------------------------------------------------------------------------------- | ------------------------- | ---------- |
| Two Modes (Normal, Wordubado), three lengths with attempts = length + 1                        | plan.txt                  | 2026-10-01 |
| Normal answers are common words; slang is a valid guess but never a Normal answer              | plan.txt                  | 2026-10-01 |
| Wordubado answers are 75% slang and 25% common, chosen per game; answers fully random          | plan.txt                  | 2026-10-01 |
| 6 Boards, each with its own saved game; switching never forfeits; refresh resumes              | plan.txt                  | 2026-10-01 |
| Win Streak per Board; one global Day Streak; Missed Day definition                             | plan.txt                  | 2026-10-01 |
| Restore: 3 per month, up to 4 missed days, one Restore covers the gap, never restores Win Streaks | plan.txt               | 2026-10-01 |
| Clock moved backwards counts as 0 missed days                                                  | plan.txt                  | 2026-10-01 |
| Stats tabs 4 / 5 / 6 / All, separate per Mode; share format; definitions; extras               | plan.txt                  | 2026-10-01 |
| Give Up and Forfeit count as finished games for the Day Streak                                 | Owner decision            | 2026-10-01 |
| Plurals and inflections excluded from Normal answers, still valid guesses                      | Owner decision            | 2026-10-01 |
| A finished Board shows its grid with a result banner and Play again                            | Owner decision            | 2026-10-01 |
| Two open tabs sync through the `storage` event                                                 | Owner decision            | 2026-10-01 |
| Saved data uses explicit versioned storage with migrations (no Zustand persist middleware)     | Research resolution       | 2026-10-01 |
| The blocklist applies to answers only; guesses stay permissive                                 | Research resolution       | 2026-10-01 |
| Generated word JSON is committed and CI checks for drift                                       | Research resolution       | 2026-10-01 |
| D-01: the missed-day check is idempotent                                                       | Phase 1 context           | 2026-10-01 |
| D-02: a pending Restore prompt is blocking and persisted                                       | Phase 1 context           | 2026-10-01 |
| D-03: monthly refill is lazy and runs before any eligibility check                             | Phase 1 context           | 2026-10-01 |
| D-04: a game counts for the local date it finishes                                             | Phase 1 context           | 2026-10-01 |
| D-05: clock moved backwards means missed = 0 and the last active date never moves earlier      | Phase 1 context           | 2026-10-01 |
| D-06: Give Up and mid-game New game only at exactly 2 tries left, and they count for the Day Streak | Phase 1 context      | 2026-10-01 |
| D-07: Restore logic is an explicit state machine plus an edge-case table                       | Phase 1 context           | 2026-10-01 |

## 13. Out of scope

- Hard mode.
- Accounts, a server or a backend.
- Cross-device sync.
- PWA and offline install (planned for v2).
- A daily shared puzzle (the same word for everyone). The Day Streak covers the daily habit instead.
