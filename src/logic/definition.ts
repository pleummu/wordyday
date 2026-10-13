export type Sense = { pos: string; text: string }

export const DEFINITION_TIMEOUT_MS = 5000
export const SENSE_MAX_CHARS = 100
const MAX_SENSES = 2
const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

// Only successful lookups are stored; a failure is retried on the next ask.
const cache = new Map<string, Sense[]>()

export function cachedDefinition(word: string): Sense[] | undefined {
  return cache.get(word)
}

export function clearDefinitionCache(): void {
  cache.clear()
}

function truncate(raw: string): string {
  const text = raw.trim()
  if (text.length <= SENSE_MAX_CHARS) return text
  const cut = text.slice(0, SENSE_MAX_CHARS)
  const space = cut.lastIndexOf(' ')
  const base = space > 0 ? cut.slice(0, space) : cut
  return `${base.trimEnd()}…`
}

function definitionsOf(meaning: unknown): Sense[] {
  if (typeof meaning !== 'object' || meaning === null) return []
  const m = meaning as { partOfSpeech?: unknown; definitions?: unknown }
  if (typeof m.partOfSpeech !== 'string' || m.partOfSpeech.trim() === '') {
    return []
  }
  if (!Array.isArray(m.definitions)) return []
  const out: Sense[] = []
  for (const d of m.definitions as unknown[]) {
    if (typeof d !== 'object' || d === null) continue
    const text = (d as { definition?: unknown }).definition
    if (typeof text !== 'string' || text.trim() === '') continue
    out.push({ pos: m.partOfSpeech.trim(), text: truncate(text) })
  }
  return out
}

export function parseEntries(json: unknown): Sense[] {
  if (!Array.isArray(json)) return []
  const meanings: Sense[][] = []
  for (const entry of json as unknown[]) {
    if (typeof entry !== 'object' || entry === null) continue
    const ms = (entry as { meanings?: unknown }).meanings
    if (!Array.isArray(ms)) continue
    for (const m of ms as unknown[]) {
      const defs = definitionsOf(m)
      if (defs.length > 0) meanings.push(defs)
    }
  }
  if (meanings.length === 0) return []
  const first = meanings[0]
  const picked: Sense[] = [first[0]]
  if (meanings.length > 1) picked.push(meanings[1][0])
  else if (first.length > 1) picked.push(first[1])
  return picked.slice(0, MAX_SENSES)
}

export async function lookupDefinition(
  word: string,
  opts: {
    fetchFn?: typeof fetch
    timeoutMs?: number
    signal?: AbortSignal
  } = {},
): Promise<Sense[]> {
  const hit = cache.get(word)
  if (hit) return hit
  const ctl = new AbortController()
  const timer = setTimeout(
    () => ctl.abort(),
    opts.timeoutMs ?? DEFINITION_TIMEOUT_MS,
  )
  const onExternal = () => ctl.abort()
  if (opts.signal?.aborted) ctl.abort()
  else opts.signal?.addEventListener('abort', onExternal, { once: true })
  try {
    const doFetch = opts.fetchFn ?? globalThis.fetch.bind(globalThis)
    const res = await doFetch(ENDPOINT + encodeURIComponent(word), {
      signal: ctl.signal,
    })
    if (!res.ok) throw new Error(`definition lookup failed: ${res.status}`)
    const senses = parseEntries(await res.json())
    if (senses.length === 0) throw new Error('definition lookup: no senses')
    if (ctl.signal.aborted) throw new Error('definition lookup aborted')
    cache.set(word, senses)
    return senses
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', onExternal)
  }
}
