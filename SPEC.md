# Unlimited Wordle: Spec

> This file is the source of truth for the game rules. It supersedes `plan.txt`, which is kept only as the history of the Q&A that settled the rules (D-09). Terms such as Board, Mode and Restore are defined in `GLOSSARY.md`.

## 0. How to read this spec

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
