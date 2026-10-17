import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const script = resolve('scripts', 'check-bundle.mjs')
const dirs = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

// Minimal fake project: valid pools in their own chunks so only the budget can fail.
function makeProject(entryJs) {
  const root = mkdtempSync(join(tmpdir(), 'check-bundle-'))
  dirs.push(root)
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true })
  mkdirSync(join(root, 'src', 'data'), { recursive: true })
  writeFileSync(
    join(root, 'dist', 'index.html'),
    '<script type="module" crossorigin src="/assets/index-x.js"></script>' +
      '<link rel="stylesheet" crossorigin href="/assets/index-x.css">',
  )
  writeFileSync(join(root, 'dist', 'assets', 'index-x.js'), entryJs)
  writeFileSync(join(root, 'dist', 'assets', 'index-x.css'), 'a{color:red}')
  for (const n of [4, 5, 6]) {
    const answers = Array.from({ length: 25 }, (_, i) => `w${n}x${i}`).join(' ')
    const def = `definition for ${n}`
    writeFileSync(
      join(root, 'src', 'data', `words-${n}.json`),
      JSON.stringify({
        answers,
        slang: `slang${n}a slang${n}b`,
        defs: { a: def },
      }),
    )
    writeFileSync(
      join(root, 'dist', 'assets', `pool${n}-x.js`),
      `export default "${answers}" + "${def}"`,
    )
  }
  return root
}

const run = (cwd) =>
  spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' })

describe('check-bundle gzip budget', () => {
  it('fails and still prints the size table when entry JS is over budget', () => {
    // Random base64 is ~incompressible: ~150 KB gzip > 100 KB budget.
    const big = `/* ${randomBytes(150 * 1024).toString('base64')} */`
    const r = run(makeProject(big))
    const out = r.stdout + r.stderr
    expect(r.status).toBe(1)
    expect(out).toContain('check:bundle FAILED: entry JS is')
    expect(out).toContain('budget 100 KB')
    expect(out).toMatch(/entry JS [\d.]+ KB gzip \/ 100 KB/)
  })

  it('passes when entry JS is small', () => {
    const r = run(makeProject('console.log(1)'))
    expect(r.stderr).not.toContain('entry JS is')
    expect(r.status).toBe(0)
    expect(r.stdout).toMatch(/entry JS [\d.]+ KB gzip \/ 100 KB/)
  })
})
