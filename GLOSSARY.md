# Glossary

This glossary gives one word to each idea in Unlimited Wordle. The same word is used in `SPEC.md`, in code, in tests and in on-screen text, so nobody has to guess whether two words mean the same thing. `SPEC.md` holds the rules. This file only says what the words mean.

## Play

### Board

One of the six independent saved games. A Board is a Mode and a word length (4, 5 or 6) together, and each Board keeps its own game, stats and Win Streak. In code the Board key is `${mode}-${len}`.

Avoid saying: "level" or "game slot".
Example: `normal-5` is the Normal Board with 5-letter words.
See: R-BOARD-1, R-BOARD-2, R-LEN-1

### Mode

Normal or Wordubado. The Mode decides which words can be the answer. The player can switch Mode at any time.

Avoid saying: "difficulty" (there is no hard mode).
See: R-MODE-1, R-MODE-3

### Normal

The Mode whose answers are common English words only. Slang is a valid guess in Normal but is never the answer.

Avoid saying: "easy mode".
See: R-POOL-1, R-POOL-2, R-POOL-7

### Wordubado

The slang Mode. Each game's answer is slang 75% of the time and a common word 25% of the time, chosen when the game starts.

Avoid saying: "slang mode" in on-screen text (it is fine in prose).
See: R-POOL-3, R-MODE-2

### Answer Pool

The words that can be drawn as the secret answer, for one Mode and one length. It is always a subset of the Guess Pool.

Avoid saying: "word list" when you mean this.
See: R-POOL-1, R-POOL-3, R-POOL-6

### Guess Pool

The words a player may submit as a guess for one length: a large vocabulary plus all slang words. It is a superset of every Answer Pool for that length.

Avoid saying: "dictionary".
See: R-GUESS-1, R-POOL-5

### Forfeit

Abandoning a game in progress by pressing New game, allowed only when exactly 2 tries are left. A Forfeit counts as a loss and as a finished game for the Day Streak. A Forfeit starts a new game and does not reveal the answer.

Avoid saying: "Give Up" for this (Give Up reveals the answer, Forfeit does not), or "skip".
See: R-FORFEIT-2, R-FORFEIT-3, R-FORFEIT-4

### Give Up

Choosing to reveal the answer on purpose, allowed only when exactly 2 tries are left. A Give Up counts as a loss and as a finished game for the Day Streak. Unlike a Forfeit, it shows the answer and the finished Board stays on screen.

Avoid saying: "Forfeit" for this (Forfeit is pressing New game mid-game), or "quit".
See: R-FORFEIT-1, R-FORFEIT-3, R-FORFEIT-4

## Streaks

### Win Streak

The number of wins in a row on one Board. It resets to 0 on a loss, a Give Up or a Forfeit on that Board, and on any Missed Day. A Restore never brings it back.

Avoid saying: "streak" on its own, or "winning streak".
See: R-WIN-1, R-WIN-2, R-WIN-3

### Day Streak

The one global count of consecutive local calendar days on which at least one game was finished. It goes up by 1 at most once per day. A win, a loss, a Give Up and a Forfeit all count.

Avoid saying: "daily streak" or "streak" on its own, because that could mean a Win Streak.
See: R-DAY-1, R-DAY-2, R-DAY-4

### Missed Day

A local calendar day with no finished game, counted strictly between the last active date and today. Yesterday counts as active for the purpose of today's check.

Avoid saying: "skipped day" or "lost day".
Example: last active Mon 1 June and today Thu 4 June means 2 Missed Days (Tue and Wed).
See: R-DAY-3, R-RESTORE-4

### Restore

One of 3 per calendar month, spent to keep the Day Streak number after up to 4 Missed Days. One Restore covers the whole gap. It never touches Win Streaks, and the player is asked to use it in a blocking prompt.

Avoid saying: "freeze", "revive" or "second chance".
See: R-RESTORE-1, R-RESTORE-4, R-RESTORE-6, R-RESTORE-13
