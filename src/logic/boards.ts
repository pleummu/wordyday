export const BOARD_CONFIG = {
  4: { attempts: 5 },
  5: { attempts: 6 },
  6: { attempts: 7 },
} as const

export type WordLength = keyof typeof BOARD_CONFIG
