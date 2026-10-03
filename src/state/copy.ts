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
export const LOSS_BODY = 'Better luck next time.'
export const WIN_BODY = 'Ready for another?'

export function lossHeading(answer: string): string {
  return `The word was ${answer.toUpperCase()}`
}

export function winHeading(n: number, max: number): string {
  return `You got it in ${n} of ${max}`
}

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
export const GAVE_UP_BODY = 'You gave up. Ready for another?'
export const SETTINGS = 'Settings'
export const SETTINGS_NOTE =
  'Your progress is saved in this browser only. Clearing site data or using another device starts fresh.'
export const STORAGE_OFF_NOTE =
  "Saving isn't working in this browser right now, so this session won't be kept."
export const RESET_MY_DATA = 'Reset my data'
export const CLOSE = 'Close'
export const RESET_HEADING = 'Reset all data?'
export const RESET_BODY =
  "This clears every game, your stats, streaks and Restores. It can't be undone."
export const CANCEL = 'Cancel'
export const RESET = 'Reset'
export const ALL_DATA_RESET = 'All data reset'

export const CORRUPT_TOAST =
  "We couldn't read your saved games, so we started fresh."
export const STORAGE_FAILED_TOAST =
  "Saving isn't working in this browser. Your progress will be lost when you close this tab."
export const OTHER_TAB_TOAST = 'Updated from your other tab.'
export const LONG_TOAST_MS = 4000
