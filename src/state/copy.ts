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

export const CONFIRM_HEADING = 'End this game?'
export const CONFIRM_START = 'Start new game'
export const CONFIRM_KEEP = 'Keep playing'

type ModeLength = { mode: 'normal' | 'wordubado'; length: number }

export function switchConfirmBody(
  active: ModeLength,
  target: ModeLength,
): string {
  const tail = 'ends your current game and starts a new one.'
  if (target.mode !== active.mode) {
    const name = target.mode === 'wordubado' ? 'Wordubado' : 'Normal'
    return `Switching to ${name} ${tail}`
  }
  return `Switching to ${target.length} letters ${tail}`
}

export const ABOUT_WORDUBADO = 'About Wordubado'
export const INFO_HEADING = "What's Wordubado?"
export const INFO_BODY = [
  'Wordle with the slang turned up. Most answers are slang, meme and Gen Z words, with a few everyday ones mixed in.',
  'Heads up: some words are mildly crude.',
] as const
export const INFO_GOT_IT = 'Got it'
