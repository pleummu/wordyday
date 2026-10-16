// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { stubDialog } from '../test/stubDialog'
import type { Pools } from '../data/wordData'

const pools5: Pools = {
  answers: ['crane'],
  slang: ['bruhs'],
  guesses: new Set(['crane', 'house', 'bruhs']),
}

const loadPools = vi.hoisted(() => vi.fn())
vi.mock('../data/wordData', () => ({ loadPools }))

import { useGameStore } from '../state/gameStore'
import SwitchConfirm from './SwitchConfirm'

beforeAll(() => {
  stubDialog()
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
})

beforeEach(async () => {
  loadPools.mockReset()
  loadPools.mockImplementation(() => Promise.resolve(pools5))
  await useGameStore.getState().startGame(5, 'normal')
})

afterEach(cleanup)

it('keeps the mode-switch copy while the dialog closes after confirming', async () => {
  render(<SwitchConfirm />)
  const store = useGameStore.getState()
  store.typeLetter('h')
  for (const k of 'ouse') useGameStore.getState().typeLetter(k)
  useGameStore.getState().submit()
  act(() => {
    useGameStore.getState().finishReveal()
  })
  act(() => {
    useGameStore.getState().requestSwitch({ mode: 'wordubado' })
  })
  const copy =
    'Switching to Wordubado ends your current game and starts a new one.'
  expect(screen.getByText(copy)).toBeTruthy()
  await act(async () => {
    useGameStore.getState().confirmSwitch()
  })
  expect(useGameStore.getState().mode).toBe('wordubado')
  expect(screen.getByText(copy)).toBeTruthy()
})
