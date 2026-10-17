// Bundle check (QA-06, WORD-09, D-12): after `npm run build`, prove that no
// word-pool text sits in the entry chunk (or anything preloaded with it) and
// that each length's pool lives in exactly one separate chunk.
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

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
const defSentinels = {}
const defCounts = {}
for (const n of [4, 5, 6]) {
  const { answers, slang, defs } = JSON.parse(
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
  const defValues = Object.values(defs ?? {})
  defCounts[n] = defValues.length
  if (defValues.length === 0) {
    fail(`no curated definitions for ${n} letters.`)
  } else {
    // Skip text that JSON-to-JS escaping could change.
    defSentinels[n] = defValues.find((d) => !/["\\]/.test(d))
    if (!defSentinels[n])
      fail(`no escape-free curated definition for ${n} letters.`)
  }
}

for (const name of startNames) {
  const text = readFileSync(join(dist, name), 'utf8')
  for (const n of [4, 5, 6]) {
    if (text.includes(sentinels[n]))
      fail(`${name} (loaded at start) contains the ${n}-letter word pool.`)
    if (slangSentinels[n] && text.includes(slangSentinels[n]))
      fail(`${name} (loaded at start) contains the ${n}-letter slang list.`)
    if (defSentinels[n] && text.includes(defSentinels[n]))
      fail(`${name} (loaded at start) contains ${n}-letter definitions.`)
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
for (const n of [4, 5, 6]) {
  if (
    found[n] &&
    defSentinels[n] &&
    !readFileSync(join(dist, 'assets', found[n]), 'utf8').includes(
      defSentinels[n],
    )
  )
    fail(`the ${n}-letter definitions are missing from ${found[n]}.`)
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

// Gzip budget (D-10, D-11). Level 9 matches Vite's own size report.
const BUDGET_KB = { js: 100, css: 10 }
const gz = (rel) => gzipSync(readFileSync(join(dist, rel)), { level: 9 }).length
const kb = (bytes) => (bytes / 1024).toFixed(1)

const entryCss = new Set()
for (const tag of html.match(/<link\b[^>]*>/g) ?? []) {
  if (!/rel="stylesheet"/.test(tag)) continue
  const m = tag.match(/\bhref="([^"]+)"/)
  if (m) entryCss.add(m[1].replace(/^\.?\//, ''))
}
const entryJs = [...startNames].filter((n) => n.endsWith('.js'))
const sum = (names) => names.reduce((t, n) => t + gz(n), 0)
const entryJsGz = sum(entryJs)
const entryCssGz = sum([...entryCss])
if (entryJsGz / 1024 > BUDGET_KB.js)
  fail(`entry JS is ${kb(entryJsGz)} KB gzip, budget ${BUDGET_KB.js} KB.`)
if (entryCssGz / 1024 > BUDGET_KB.css)
  fail(`entry CSS is ${kb(entryCssGz)} KB gzip, budget ${BUDGET_KB.css} KB.`)

// Size table, printed on pass and fail.
const poolTag = Object.fromEntries(
  [4, 5, 6].map((n) => [found[n], `${n}-letter pool`]),
)
console.log('Bundle sizes (KB):')
for (const f of readdirSync(join(dist, 'assets')).sort()) {
  if (!/\.(js|css)$/.test(f)) continue
  const rel = `assets/${f}`
  const raw = readFileSync(join(dist, rel)).length
  const tag =
    poolTag[f] ?? (startNames.has(rel) || entryCss.has(rel) ? 'entry' : 'lazy')
  console.log(`  ${rel}: raw ${kb(raw)}, gzip ${kb(gz(rel))}, ${tag}`)
}
console.log(`  entry JS ${kb(entryJsGz)} KB gzip / ${BUDGET_KB.js} KB`)
console.log(`  entry CSS ${kb(entryCssGz)} KB gzip / ${BUDGET_KB.css} KB`)

if (failed) process.exit(1)

console.log('check:bundle OK')
for (const n of [4, 5, 6])
  console.log(`  ${n}-letter slang: ${slangCounts[n]} words`)
for (const n of [4, 5, 6])
  console.log(`  ${n}-letter definitions: ${defCounts[n]}`)
