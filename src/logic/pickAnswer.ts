export function pickAnswer(
  answers: readonly string[],
  rng: () => number = Math.random,
): string {
  if (answers.length === 0) throw new Error('empty answer pool')
  return answers[
    Math.min(answers.length - 1, Math.floor(rng() * answers.length))
  ]
}

export const SLANG_SHARE = 0.75

// Wordubado: about 75% slang, 25% Normal Answer Pool. Always consumes exactly
// two rng draws so seeded tests stay predictable.
export function pickWordubadoAnswer(
  pools: { answers: readonly string[]; slang: readonly string[] },
  rng: () => number = Math.random,
): string {
  const r = rng()
  const chosen =
    pools.slang.length > 0 && r < SLANG_SHARE ? pools.slang : pools.answers
  return pickAnswer(chosen, rng)
}
