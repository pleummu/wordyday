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
