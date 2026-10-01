declare global {
  var __WORDLE_TEST__:
    { answers?: Partial<Record<4 | 5 | 6, string>> } | undefined
}

export {}
