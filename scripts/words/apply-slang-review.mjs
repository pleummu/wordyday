// Apply the slang review: `npm run review:slang [-- --mark-reviewed]`.
//
// Deterministic and idempotent.
//   - auto-cuts blocklist hits (D-03) by appending them to slang-cuts.txt
//   - removes every cut word from slang.json (D-02)
//   - with --mark-reviewed, also sets reviewed: true on every remaining entry
// Without --mark-reviewed the `reviewed` flags are never touched.
import { readFileSync, writeFileSync } from 'node:fs'
import {
  findBlocklistHits,
  markReviewed,
  parseCutList,
  parseList,
  removeCut,
} from './lib.mjs'
import { isProfane } from './profanity.mjs'

const url = (rel) => new URL(rel, import.meta.url)
const read = (rel) => readFileSync(url(rel), 'utf8')
const mark = process.argv.includes('--mark-reviewed')

const entries = JSON.parse(read('./slang.json'))
const blocklist = new Set(parseList(read('./blocklist.txt')))
let cutsText = read('./slang-cuts.txt')
const cuts = parseCutList(cutsText)
const cutWords = new Set(cuts.map((c) => c.word))

const newHits = findBlocklistHits(entries, { isProfane, blocklist }).filter(
  (w) => !cutWords.has(w),
)
if (newHits.length > 0) {
  if (!cutsText.endsWith('\n')) cutsText += '\n'
  cutsText += newHits.map((w) => `${w}  # blocklist hit`).join('\n') + '\n'
  writeFileSync(url('./slang-cuts.txt'), cutsText, 'utf8')
  for (const w of newHits) cutWords.add(w)
}

const count = (list) =>
  [4, 5, 6]
    .map((n) => `${n}: ${list.filter((e) => e.word.length === n).length}`)
    .join(', ')
console.log(`before  ${count(entries)}`)
let next = removeCut(entries, cutWords)
if (mark) next = markReviewed(next)
console.log(`after   ${count(next)}`)
if (newHits.length > 0) console.log(`auto-cut: ${newHits.join(', ')}`)
writeFileSync(url('./slang.json'), JSON.stringify(next, null, 2) + '\n', 'utf8')
