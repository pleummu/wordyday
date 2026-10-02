// Build the word pools: `npm run build:words`.
//
// Inputs
//   - wordlist-english (devDependency, build-time only; never imported by src/)
//   - scripts/words/slang.json      slang entries { word, definition, crude, reviewed }
//                                   (JSON cannot hold comments, so it is documented here;
//                                   slang is merged into guesses and never a Normal answer)
//   - scripts/words/slang-cuts.txt  cut slang words with reasons (parsed by parseCutList)
//   - scripts/words/blocklist.txt   words never allowed as answers (still valid guesses)
//   - scripts/words/exclude.txt     owner cut list, answers only (D-07)
//   - scripts/words/extra-guesses.txt  real words missing from the source, guesses only (D-10)
// Outputs (deterministic: sorted, no timestamps)
//   - src/data/words-{4,5,6}.json   { answers, guesses } as space-joined strings
//   - scripts/words/slang-review.md owner review sheet for slang
import { readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import wordlist from 'wordlist-english'
import {
  assertInvariants,
  buildPools,
  isPlainWord,
  parseCutList,
  parseList,
  renderSlangReview,
  serialisePools,
} from './words/lib.mjs'
import { isProfane } from './words/profanity.mjs'

const LENGTHS = [4, 5, 6]
const MIN_ANSWERS = 500 // D-06 (measured minimum 799)
const GZIP_BUDGET = { 4: 15 * 1024, 5: 30 * 1024, 6: 50 * 1024 } // D-11

// D-01: answer source is the union of these four lists. The owner CONFIRMED
// this union on 2026-10-01 during planning (recorded under D-01 in 02-CONTEXT.md).
const COMMON_KEYS = [
  'english/10',
  'english/20',
  'english/american/10',
  'english/american/20',
]

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')

// D-08: every key and tier in the package, a-z only (non a-z dropped, D-09).
const all = new Set(Object.values(wordlist).flat().filter(isPlainWord))
const common = new Set(
  COMMON_KEYS.flatMap((k) => wordlist[k]).filter(isPlainWord),
)

const blocklist = new Set(parseList(read('./words/blocklist.txt')))
const exclude = new Set(parseList(read('./words/exclude.txt')))
const extra = parseList(read('./words/extra-guesses.txt'))
const cuts = parseCutList(read('./words/slang-cuts.txt'))
const slangEntries = JSON.parse(read('./words/slang.json'))
const slang = slangEntries.map((e) => e.word)

for (const w of blocklist) {
  if (!isPlainWord(w)) throw new Error(`blocklist entry "${w}" is not a-z only`)
}
for (const w of extra) {
  if (!isPlainWord(w) || w.length < 4 || w.length > 6) {
    throw new Error(`extra-guesses entry "${w}" must be a-z, 4-6 letters`)
  }
}

for (const length of LENGTHS) {
  const { answers, guesses, dropped } = buildPools({
    length,
    common,
    all,
    slang,
    extra,
    blocklist,
    exclude,
    isProfane,
  })
  assertInvariants({
    length,
    answers,
    guesses,
    slang,
    blocklist,
    exclude,
    minAnswers: MIN_ANSWERS,
  })
  const text = serialisePools({ answers, guesses })
  const gzip = gzipSync(Buffer.from(text)).length
  console.log(
    `length ${length}: answers ${answers.length}, guesses ${guesses.length} (gzip ${(gzip / 1024).toFixed(1)} KB)`,
  )
  for (const w of dropped.profanity) console.log(`obscenity drop: ${w}`)
  console.log(
    `  dropped: inflection ${dropped.inflection.length}, profanity ${dropped.profanity.length}, blocklist ${dropped.blocklist.length}, exclude ${dropped.exclude.length}, slang ${dropped.slang.length}, noVowel ${dropped.noVowel.length}`,
  )
  console.log(
    `  inflection sample: ${dropped.inflection.slice(0, 30).join(' ')}`,
  )
  if (gzip > GZIP_BUDGET[length]) {
    throw new Error(
      `words-${length}.json is ${gzip} bytes gzipped, over budget ${GZIP_BUDGET[length]}`,
    )
  }
  writeFileSync(
    new URL(`../src/data/words-${length}.json`, import.meta.url),
    text,
    'utf8',
  )
}

const commonByLength = Object.fromEntries(
  LENGTHS.map((n) => [n, new Set([...common].filter((w) => w.length === n))]),
)
writeFileSync(
  new URL('./words/slang-review.md', import.meta.url),
  renderSlangReview(slangEntries, {
    isProfane,
    blocklist,
    commonByLength,
    cuts,
  }),
  'utf8',
)
