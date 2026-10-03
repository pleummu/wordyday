export function createMemoryStorage(
  initial: Record<string, string> = {},
): Storage & { dump(): Record<string, string> } {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => {
      map.delete(k)
    },
    setItem: (k: string, v: string) => {
      map.set(k, String(v))
    },
    dump: () => Object.fromEntries(map),
  }
}

export function createThrowingStorage(flags: {
  get?: boolean
  set?: boolean
}): Storage {
  const inner = createMemoryStorage()
  return {
    get length() {
      return inner.length
    },
    clear: () => inner.clear(),
    key: (i: number) => inner.key(i),
    removeItem: (k: string) => inner.removeItem(k),
    getItem: (k: string) => {
      if (flags.get) throw new DOMException('blocked', 'SecurityError')
      return inner.getItem(k)
    },
    setItem: (k: string, v: string) => {
      if (flags.set) throw new DOMException('full', 'QuotaExceededError')
      inner.setItem(k, v)
    },
  }
}
