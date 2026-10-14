export const NOT_ENOUGH_LETTERS = 'Not enough letters'
export const NOT_IN_WORD_LIST = 'Not in word list'
export const PRAISE = [
  'Unbelievable!',
  'Brilliant!',
  'Great!',
  'Nice!',
  'Good one',
  'Phew, got it',
  'Just in time',
] as const
export const LOADING_WORDS = 'Loading words...'
export const LOAD_ERROR =
  "Couldn't load the word list. Check your connection and try again."
export const TRY_AGAIN = 'Try again'
export const PLAY_AGAIN = 'Play again'
export const SHOW_DEFINITION = 'Show definition'
export const DEFINITION_REGION = 'Definition'
export const DEFINITION_LOADING = 'Looking it up...'
export const DEFINITION_UNAVAILABLE = 'Definition unavailable'
export const DEFINITION_CREDIT = 'Source: dictionaryapi.dev'
export const SEE_RESULT = 'See result'
export const solvedIn = (n: number) => `Solved in ${n}`
export const wordWasLine = (answer: string) =>
  `The word was ${answer.toUpperCase()}`

export const CONFIRM_KEEP = 'Keep playing'

export const ABOUT_WORDUBADO = 'About Wordubado'
export const INFO_HEADING = "What's Wordubado?"
export const INFO_BODY = [
  'Wordle with the slang turned up. Most answers are slang, meme and Gen Z words, with a few everyday ones mixed in.',
  'Heads up: some words are mildly crude.',
] as const
export const INFO_GOT_IT = 'Got it'

export const GIVE_UP = 'Give up'
export const NEW_GAME = 'New game'
export const GIVE_UP_HEADING = 'Give up?'
export const GIVE_UP_BODY = 'This counts as a loss. Reveal the answer?'
export const NEW_GAME_HEADING = 'New game?'
export const NEW_GAME_BODY = 'This counts as a loss. Start a new game?'
export const SETTINGS = 'Settings'
export const SETTINGS_NOTE =
  'Your progress is saved in this browser only. Clearing site data or using another device starts fresh.'
export const STORAGE_OFF_NOTE =
  "Saving isn't working in this browser right now, so this session won't be kept."
export const RESET_MY_DATA = 'Reset my data'
export const CLOSE = 'Close'
export const RESET_HEADING = 'Reset all data?'
export const RESET_BODY =
  "This clears your stats and streaks and puts your settings back to the defaults. This can't be undone."
export const APPEARANCE = 'Appearance'
export const THEME = 'Theme'
export const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const
export const COLOUR_BLIND = 'Colour-blind friendly colours'
export const COLOUR_BLIND_HINT = 'Orange and blue instead of green and yellow.'
export const CANCEL = 'Cancel'
export const RESET = 'Reset'
export const ALL_DATA_RESET = 'All data reset'

export const CORRUPT_TOAST =
  "We couldn't read your saved games, so we started fresh."
export const STORAGE_FAILED_TOAST =
  "Saving isn't working in this browser. Your progress will be lost when you close this tab."
export const OTHER_TAB_TOAST = 'Updated from your other tab.'
export const LONG_TOAST_MS = 4000

export const STATISTICS = 'Statistics'
export const MODE_LABEL = 'Mode'
export const WORD_LENGTH = 'Word length'
export const ALL_TAB = 'All'
export const ALL_LENGTHS = 'All lengths'
export const PLAYED = 'Played'
export const WIN_PCT = 'Win %'
export const STREAK = 'Streak'
export const BEST = 'Best'
export const WIN_PCT_FULL = 'Win percentage'
export const STREAK_FULL = 'Current win streak'
export const BEST_FULL = 'Best win streak'
export const streakFull = (n: number, reset: boolean) =>
  `${STREAK_FULL} ${n}${reset ? ', reset' : ''}`
export const GUESS_DISTRIBUTION = 'Guess distribution'
export const NO_WINS_YET = 'No wins yet. Go play one!'
export const EM_DASH = '—'
export const gaveUpLine = (n: number) => `Gave up: ${n}`
export const avgLine = (x: number | null) =>
  `Avg guesses: ${x === null ? EM_DASH : x.toFixed(1)}`
export const distRowLabel = (n: number, count: number, latest: boolean) =>
  `${n} ${n === 1 ? 'guess' : 'guesses'}: ${count} ${count === 1 ? 'win' : 'wins'}${latest ? ', latest win' : ''}`

export const TOAST_LIFE_MS = 1860
export const dayStreakToast = (n: number) => `Day streak: ${n}`
export const dayStreakFooter = (n: number, m: number) =>
  `Day streak ${n} · Best ${m}`
export const restoresLeftLine = (r: number) => `Restores left: ${r}/3`

export function chipName(n: number, creditedToday: boolean): string {
  return creditedToday
    ? `Day streak ${n}, open statistics`
    : `Day streak ${n}, play today to keep it, open statistics`
}

export const RESTORE_HEADING = 'Streak broke'
export const restorePromptBody = (streak: number, left: number) =>
  `Your ${streak}-day streak broke. Restore it? (${left} left this month)`
export const RESTORE = 'Restore'
export const NO = 'No'
export const BREAK_HEADING = 'Fresh start'
export const BREAK_BODY = 'Your streak ended. Start a new one today!'
export const OK = 'OK'
export const restoreToast = (n: number) =>
  `Streak restored. ${n} left this month.`

export const resultWinHeading = (n: number, max: number) =>
  `You got it in ${n}/${max}!`
export const OUT_OF_GUESSES = 'Out of guesses'
export const YOU_GAVE_UP = 'You gave up'
export const WORD_WAS_PREFIX = 'The word was '

export const SHARE = 'Share'
export const COPIED_LABEL = 'Copied'
export const COPIED_TOAST = 'Copied'
export const COPY_FAILED_NOTE = "Couldn't copy. Select the text and copy it."
export const SHARE_TEXT_LABEL = 'Share text'
export const COPIED_MS = 2000

export const HELP = 'How to play'
export const HELP_RULES =
  'Guess the word in as few tries as you can. Every guess must be a real word.'
export const HELP_MODES =
  'Pick 4, 5 or 6 letters. Normal uses everyday words; Wordubado uses slang.'
export const HELP_STREAKS =
  'Win Streak counts wins in a row on each board. Day Streak counts days you play, and Restores can save a missed day.'
export const HELP_GOT_IT = 'Got it'
export const HELP_EXAMPLES = [
  {
    word: 'CRANE',
    index: 0,
    state: 'correct',
    caption: 'C is in the word and in the right spot.',
  },
  {
    word: 'PILOT',
    index: 2,
    state: 'present',
    caption: 'L is in the word but in the wrong spot.',
  },
  {
    word: 'FUNGI',
    index: 3,
    state: 'absent',
    caption: 'G is not in the word at all.',
  },
] as const

export const triesLeftLine = (n: number) =>
  n === 1 ? '1 try left.' : `${n} tries left.`
export const wonLine = (n: number) => `You won in ${n}.`
export const lostLine = (word: string) =>
  `Out of tries. The word was ${word.toUpperCase()}.`
export const forfeitLine = (word: string) =>
  `You gave up. The word was ${word.toUpperCase()}.`
