// Pure helpers for the word-data pipeline (no fs, no package imports).

export function parseList(text) {
  return text
    .split('\n')
    .map((line) => line.split('#')[0].trim().toLowerCase())
    .filter((line) => line.length > 0)
}

export function isPlainWord(word) {
  return /^[a-z]+$/.test(word)
}

export function hasVowel(word) {
  return /[aeiouy]/.test(word)
}

const MIN_STEM = 3

// D-02: a word is an inflection when a plausible stem is also in the list.
export function isInflection(word, all) {
  const has = (stem) => stem.length >= MIN_STEM && all.has(stem)
  const doubled = (base) =>
    base.length >= 2 && base[base.length - 1] === base[base.length - 2]

  // -s (but not -ss)
  if (word.endsWith('s') && !word.endsWith('ss') && has(word.slice(0, -1))) {
    return true
  }
  // -es
  if (word.endsWith('es') && has(word.slice(0, -2))) return true
  // -ies
  if (word.endsWith('ies') && has(word.slice(0, -3) + 'y')) return true
  // -ed (never -eed: NEED, SEED, FEED)
  if (word.endsWith('ed') && !word.endsWith('eed')) {
    const base = word.slice(0, -2)
    if (has(base)) return true
    if (doubled(base) && has(base.slice(0, -1))) return true
    if (base.length >= 3 && has(base + 'e')) return true
  }
  // -ing (base must be 3+ letters: protects THING, BRING, KING, RING)
  if (word.endsWith('ing')) {
    const base = word.slice(0, -3)
    if (base.length >= 3) {
      if (has(base)) return true
      if (doubled(base) && has(base.slice(0, -1))) return true
      if (has(base + 'e')) return true
    }
  }
  return false
}

export function buildPools({
  length,
  common,
  all,
  slang,
  extra,
  blocklist,
  exclude,
  isProfane,
}) {
  const dropped = {
    inflection: [],
    profanity: [],
    blocklist: [],
    exclude: [],
    slang: [],
    noVowel: [],
  }
  const slangSet = new Set(slang)
  const answers = []
  for (const word of common) {
    if (word.length !== length || !isPlainWord(word)) continue
    if (!hasVowel(word)) dropped.noVowel.push(word)
    else if (isInflection(word, all)) dropped.inflection.push(word)
    else if (slangSet.has(word)) dropped.slang.push(word)
    else if (blocklist.has(word)) dropped.blocklist.push(word)
    else if (exclude.has(word)) dropped.exclude.push(word)
    else if (isProfane(word)) dropped.profanity.push(word)
    else answers.push(word)
  }
  answers.sort()
  for (const key of Object.keys(dropped)) dropped[key].sort()

  const answerSet = new Set(answers)
  const pool = new Set()
  const fits = (w) => w.length === length && isPlainWord(w)
  for (const w of all) if (fits(w)) pool.add(w)
  for (const w of slang) if (fits(w)) pool.add(w)
  for (const w of extra) if (fits(w)) pool.add(w)
  for (const w of common) if (fits(w)) pool.add(w)
  const guesses = [...pool].filter((w) => !answerSet.has(w)).sort()
  return { answers, guesses, dropped }
}

export function assertInvariants({
  length,
  answers,
  guesses,
  slang,
  slangAnswers = [],
  isProfane = () => false,
  blocklist,
  exclude,
  minAnswers,
}) {
  const fail = (msg) => {
    throw new Error(`Invariant violated (length ${length}): ${msg}`)
  }
  const seen = new Set()
  for (const w of [...answers, ...guesses]) {
    if (!isPlainWord(w)) fail(`"${w}" is not a-z only`)
    if (w.length !== length) fail(`"${w}" has wrong length`)
    if (seen.has(w))
      fail(`"${w}" is duplicated (or in both answers and guesses)`)
    seen.add(w)
  }
  const slangSet = new Set(slang)
  for (const w of answers) {
    if (blocklist.has(w)) fail(`answer "${w}" is in blocklist`)
    if (exclude.has(w)) fail(`answer "${w}" is in exclude`)
    if (slangSet.has(w)) fail(`answer "${w}" is a slang word`)
  }
  for (const w of slang) {
    if (w.length === length && !seen.has(w)) {
      fail(`slang "${w}" missing from the guess pool`)
    }
  }
  const answerSet = new Set(answers)
  for (const w of slangAnswers) {
    if (w.length !== length) fail(`slang answer "${w}" has wrong length`)
    if (!seen.has(w)) fail(`slang answer "${w}" missing from the guess pool`)
    if (answerSet.has(w)) fail(`slang answer "${w}" is a Normal answer`)
    if (blocklist.has(w)) fail(`slang answer "${w}" is in blocklist`)
    if (isProfane(w)) fail(`slang answer "${w}" is profane`)
  }
  if (answers.length < minAnswers) {
    fail(`only ${answers.length} answers, need at least ${minAnswers}`)
  }
}

export function reviewedSlang(entries, length) {
  return entries
    .filter((e) => e.reviewed === true && e.word.length === length)
    .map((e) => e.word)
    .sort()
}

export function reviewedDefs(entries, length) {
  const out = {}
  for (const e of entries
    .filter((x) => x.reviewed === true && x.word.length === length)
    .sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0))) {
    out[e.word] = e.definition
  }
  return out
}

export function serialisePools({ answers, guesses, slang, defs }) {
  return (
    JSON.stringify({
      answers: answers.join(' '),
      guesses: guesses.join(' '),
      slang: slang.join(' '),
      defs,
    }) + '\n'
  )
}

export function parseCutList(text) {
  const out = []
  for (const raw of text.split('\n')) {
    const idx = raw.indexOf('#')
    const word = (idx === -1 ? raw : raw.slice(0, idx)).trim().toLowerCase()
    if (!word) continue
    const comment = idx === -1 ? '' : raw.slice(idx + 1).trim()
    out.push({ word, reason: comment || 'owner cut' })
  }
  return out
}

export function findBlocklistHits(entries, { isProfane, blocklist }) {
  return entries
    .map((e) => e.word)
    .filter((w) => isProfane(w) || blocklist.has(w))
    .sort()
}

export function removeCut(entries, cutWords) {
  return entries.filter((e) => !cutWords.has(e.word))
}

export function markReviewed(entries) {
  return entries.map((e) => ({ ...e, reviewed: true }))
}

export function renderSlangReview(
  entries,
  { isProfane, blocklist, commonByLength, cuts = [] },
) {
  const lines = [
    '# Slang review sheet',
    '',
    'Generated by `npm run build:words`; do not edit by hand. Reply with the words to cut (one per line or comma-separated). Every word you do not cut becomes reviewed and can be a Wordubado answer. Blocklist hits were cut automatically (D-03) and are listed under Already cut. `crude` words are allowed in Wordubado if you keep them. `common word` means the word is also a common English word: it stays out of Normal answers while it is slang, and if you cut it, it is added to exclude.txt so it does not become a Normal answer unless you say so.',
    '',
  ]
  for (const length of [4, 5, 6]) {
    const rows = entries
      .filter((e) => e.word.length === length)
      .sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0))
    lines.push(`## ${length}-letter slang (${rows.length})`, '')
    lines.push('| word | length | definition | crude | flags |')
    lines.push('| --- | --- | --- | --- | --- |')
    for (const e of rows) {
      const flags = []
      if (isProfane(e.word) || blocklist.has(e.word))
        flags.push('blocklist hit')
      if (commonByLength[length]?.has(e.word)) flags.push('common word')
      const def = String(e.definition).replace(/\|/g, '\\|')
      lines.push(
        `| ${e.word} | ${length} | ${def} | ${e.crude ? 'yes' : 'no'} | ${flags.join(', ')} |`,
      )
    }
    lines.push('')
  }
  const sorted = [...cuts].sort((a, b) =>
    a.word < b.word ? -1 : a.word > b.word ? 1 : 0,
  )
  lines.push(`## Already cut (${sorted.length})`, '')
  lines.push('| word | length | reason |')
  lines.push('| --- | --- | --- |')
  for (const c of sorted) {
    lines.push(`| ${c.word} | ${c.word.length} | ${c.reason} |`)
  }
  lines.push('')
  return lines.join('\n')
}
