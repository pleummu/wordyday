import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFINITION_TIMEOUT_MS,
  cachedDefinition,
  clearDefinitionCache,
  lookupDefinition,
  parseEntries,
} from './definition'

const entry = (meanings: unknown) => [{ word: 'crane', meanings }]
const meaning = (pos: unknown, ...defs: unknown[]) => ({
  partOfSpeech: pos,
  definitions: defs.map((definition) => ({ definition })),
})

const okFetch = (body: unknown) =>
  vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(body) }))

beforeEach(() => clearDefinitionCache())

describe('parseEntries', () => {
  it('takes the first definition of the first two meanings', () => {
    expect(
      parseEntries(
        entry([
          meaning('noun', 'a bird', 'second'),
          meaning('verb', 'to stretch'),
        ]),
      ),
    ).toEqual([
      { pos: 'noun', text: 'a bird' },
      { pos: 'verb', text: 'to stretch' },
    ])
  })

  it('uses two definitions of a single meaning', () => {
    expect(
      parseEntries(entry([meaning('noun', 'one', 'two', 'three')])),
    ).toEqual([
      { pos: 'noun', text: 'one' },
      { pos: 'noun', text: 'two' },
    ])
  })

  it('ignores meanings beyond two senses', () => {
    const out = parseEntries(
      entry([meaning('noun', 'a'), meaning('verb', 'b'), meaning('adj', 'c')]),
    )
    expect(out).toHaveLength(2)
  })

  it('skips entries without a usable pos or definition', () => {
    expect(
      parseEntries(
        entry([
          meaning('', 'x'),
          meaning('noun', 5, ''),
          meaning('verb', 'ok'),
        ]),
      ),
    ).toEqual([{ pos: 'verb', text: 'ok' }])
  })

  it.each([
    [{ title: 'No Definitions Found' }],
    [null],
    ['str'],
    [[]],
    [[{ meanings: 'x' }]],
  ])('returns [] for unusable shape %#', (input) => {
    expect(parseEntries(input)).toEqual([])
  })

  it('cuts long text at a word boundary with an ellipsis', () => {
    const out = parseEntries(
      entry([meaning('noun', 'lengthy words '.repeat(11))]),
    )
    expect(out[0].text.length).toBeLessThanOrEqual(101)
    expect(out[0].text.endsWith('…')).toBe(true)
    expect(out[0].text).not.toMatch(/ …$/)
  })

  it('leaves exactly 100 characters unchanged and trims', () => {
    const hundred = 'a'.repeat(100)
    expect(
      parseEntries(entry([meaning('noun', `  ${hundred} `)]))[0].text,
    ).toBe(hundred)
  })
})

describe('lookupDefinition', () => {
  const body = entry([meaning('noun', 'a bird')])

  it('fetches once with only a signal, parses and caches', async () => {
    const f = okFetch(body)
    const out = await lookupDefinition('crane', { fetchFn: f as never })
    expect(out).toEqual([{ pos: 'noun', text: 'a bird' }])
    expect(f).toHaveBeenCalledTimes(1)
    const calls = f.mock.calls as unknown as [string, { signal: AbortSignal }][]
    expect(calls[0][0]).toBe(
      'https://api.dictionaryapi.dev/api/v2/entries/en/crane',
    )
    expect(Object.keys(calls[0][1])).toEqual(['signal'])
    expect(cachedDefinition('crane')).toEqual(out)
    await lookupDefinition('crane', { fetchFn: f as never })
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('encodes the word', async () => {
    const f = okFetch(body)
    await lookupDefinition('a b/c', { fetchFn: f as never })
    expect((f.mock.calls as unknown as [string][])[0][0]).toMatch(
      /en\/a%20b%2Fc$/,
    )
  })

  it.each([
    [
      '404',
      () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
    ],
    [
      'bad json',
      () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new Error('x')),
        }),
    ],
    [
      'empty array',
      () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
    ],
    ['network', () => Promise.reject(new TypeError('offline'))],
  ])('rejects and caches nothing on %s', async (_n, fn) => {
    await expect(
      lookupDefinition('crane', { fetchFn: fn as never }),
    ).rejects.toBeDefined()
    expect(cachedDefinition('crane')).toBeUndefined()
  })

  describe('abort paths', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    const hanging = (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_res, rej) => {
        init.signal.addEventListener('abort', () =>
          rej(new DOMException('aborted', 'AbortError')),
        )
      })

    it('times out after 5000 ms and not before', async () => {
      expect(DEFINITION_TIMEOUT_MS).toBe(5000)
      let settled = false
      const p = lookupDefinition('crane', { fetchFn: hanging as never })
      p.catch(() => {}).finally(() => (settled = true))
      await vi.advanceTimersByTimeAsync(4999)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      await expect(p).rejects.toBeDefined()
      expect(cachedDefinition('crane')).toBeUndefined()
    })

    it('rejects when the external signal aborts', async () => {
      const ctl = new AbortController()
      const p = lookupDefinition('crane', {
        fetchFn: hanging as never,
        signal: ctl.signal,
      })
      ctl.abort()
      await expect(p).rejects.toBeDefined()
      expect(cachedDefinition('crane')).toBeUndefined()
    })
  })
})
