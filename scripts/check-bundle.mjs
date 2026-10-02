// Bundle check (QA-06, WORD-09, D-12): after `npm run build`, prove that no
// word-pool text sits in the entry chunk (or anything preloaded with it) and
// that each length's pool lives in exactly one separate chunk.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const indexPath = join(dist, 'index.html')
if (!existsSync(indexPath)) {
  console.error(
    'check:bundle FAILED: dist/index.html is missing. Run `npm run build` first.',
  )
  process.exit(1)
}

const html = readFileSync(indexPath, 'utf8')
const startFiles = new Set()
for (const tag of html.match(/<script\b[^>]*>/g) ?? []) {
  if (!/type="module"/.test(tag)) continue
  const m = tag.match(/\bsrc="([^"]+)"/)
  if (m) startFiles.add(m[1])
}
for (const tag of html.match(/<link\b[^>]*>/g) ?? []) {
  if (!/rel="modulepreload"/.test(tag)) continue
  const m = tag.match(/\bhref="([^"]+)"/)
  if (m) startFiles.add(m[1])
}
// Normalise "/assets/x.js" or "./assets/x.js" to "assets/x.js".
const startNames = new Set([...startFiles].map((p) => p.replace(/^\.?\//, '')))

if (startNames.size === 0) {
  console.error(
    'check:bundle FAILED: no entry script found in dist/index.html.',
  )
  process.exit(1)
}

let failed = false
const fail = (msg) => {
  console.error(`check:bundle FAILED: ${msg}`)
  failed = true
}

const sentinels = {}
const slangSentinels = {}
const slangCounts = {}
for (const n of [4, 5, 6]) {
  const { answers, slang } = JSON.parse(
    readFileSync(join('src', 'data', `words-${n}.json`), 'utf8'),
  )
  sentinels[n] = answers.split(' ').filter(Boolean).slice(0, 20).join(' ')
  const slangWords = (slang ?? '').split(' ').filter(Boolean)
  slangCounts[n] = slangWords.length
  if (slangWords.length === 0) {
    fail(`no reviewed slang for ${n} letters.`)
    slangSentinels[n] = undefined
  } else {
    slangSentinels[n] = slangWords.slice(0, 10).join(' ')
  }
}

for (const name of startNames) {
  const text = readFileSync(join(dist, name), 'utf8')
  for (const n of [4, 5, 6]) {
    if (text.includes(sentinels[n]))
      fail(`${name} (loaded at start) contains the ${n}-letter word pool.`)
    if (slangSentinels[n] && text.includes(slangSentinels[n]))
      fail(`${name} (loaded at start) contains the ${n}-letter slang list.`)
  }
}

const assets = readdirSync(join(dist, 'assets')).filter((f) =>
  f.endsWith('.js'),
)
const found = {}
for (const n of [4, 5, 6]) {
  const hits = assets.filter((f) =>
    readFileSync(join(dist, 'assets', f), 'utf8').includes(sentinels[n]),
  )
  if (hits.length !== 1)
    fail(
      `the ${n}-letter pool appears in ${hits.length} chunks (expected exactly 1).`,
    )
  else found[n] = hits[0]
}
const names = Object.values(found)
if (new Set(names).size !== names.length)
  fail('two lengths share one chunk; each needs its own.')
for (const f of names) {
  if (startNames.has(`assets/${f}`)) fail(`${f} is an entry/preload chunk.`)
}

for (const f of assets) {
  if (readFileSync(join(dist, 'assets', f), 'utf8').includes('__WORDLE_TEST__'))
    fail(
      `the E2E test hook is in the production build (${f}); run npm run build, not build:e2e, before check:bundle.`,
    )
}

if (failed) process.exit(1)

console.log('check:bundle OK')
for (const n of [4, 5, 6])
  console.log(`  ${n}-letter slang: ${slangCounts[n]} words`)
for (const n of [4, 5, 6]) {
  const kb = (statSync(join(dist, 'assets', found[n])).size / 1024).toFixed(1)
  console.log(`  ${n}-letter pool: assets/${found[n]} (${kb} KB)`)
}
