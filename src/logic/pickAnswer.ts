export function pickAnswer(
  answers: readonly string[],
  rng: () => number = Math.random,
): string {
  if (answers.length === 0) throw new Error('empty answer pool')
  return answers[
    Math.min(answers.length - 1, Math.floor(rng() * answers.length))
  ]
}
