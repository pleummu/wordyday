import { describe, expect, it } from 'vitest'
import { BOARD_CONFIG } from './boards'

describe('R-LEN-1 BOARD_CONFIG', () => {
  it('gives 5, 6 and 7 attempts for 4, 5 and 6 letters', () => {
    expect(BOARD_CONFIG[4].attempts).toBe(5)
    expect(BOARD_CONFIG[5].attempts).toBe(6)
    expect(BOARD_CONFIG[6].attempts).toBe(7)
  })

  it('always allows length + 1 attempts', () => {
    for (const [length, { attempts }] of Object.entries(BOARD_CONFIG)) {
      expect(attempts).toBe(Number(length) + 1)
    }
  })
})
