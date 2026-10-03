// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { stubDialog } from '../test/stubDialog'
import type { Pools } from '../data/wordData'

const pools: Pools = {
  answers: ['crane'],
  slang: ['bruhs'],
  guesses: new Set(['crane', 'house', 'bruhs']),
}

const loadPools = vi.hoisted(() => vi.fn())
vi.mock('../data/wordData', () => ({ loadPools }))

import App from '../App'
import { useGameStore } from '../state/gameStore'

beforeAll(() => {
  stubDialog()
  globalThis.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as typeof matchMedia
})

beforeEach(async () => {
  localStorage.clear()
  useGameStore.setState({
    infoOpen: false,
    dialog: null,
    boards: {},
    storageOk: true,
    settingsFocus: 'close',
    finishedInSession: false,
  })
  loadPools.mockReset()
  loadPools.mockImplementation(() => Promise.resolve(pools))
  await useGameStore.getState().startGame(5, 'normal')
})

afterEach(cleanup)

it('Settings shows heading, note and buttons in order with Close focused', () => {
  render(<App />)
  act(() => useGameStore.getState().openSettings())
  const dlg = screen.getByRole('dialog', { name: 'Settings' })
  expect(dlg.textContent).toContain('saved in this browser only')
  const buttons = Array.from(dlg.querySelectorAll('button'))
  expect(buttons.map((b) => b.textContent)).toEqual(['Reset my data', 'Close'])
  expect(buttons[1].hasAttribute('data-initial-focus')).toBe(true)
  expect(buttons[0].hasAttribute('data-initial-focus')).toBe(false)
})

it('shows the storage-off note only when storage is failing', () => {
  render(<App />)
  act(() => useGameStore.getState().openSettings())
  expect(screen.queryByText(/Saving isn't working/)).toBeNull()
  act(() => useGameStore.setState({ storageOk: false }))
  expect(screen.getByText(/Saving isn't working/)).toBeTruthy()
})

it('Reset my data opens the confirm with Cancel focused and a danger Reset', () => {
  render(<App />)
  act(() => useGameStore.getState().openSettings())
  fireEvent.click(screen.getByRole('button', { name: 'Reset my data' }))
  expect(useGameStore.getState().dialog).toBe('reset')
  const dlg = screen.getByRole('dialog', { name: 'Reset all data?' })
  expect(dlg.textContent).toContain("It can't be undone.")
  const cancel = screen.getByRole('button', { name: 'Cancel' })
  expect(cancel.hasAttribute('data-initial-focus')).toBe(true)
  expect(
    screen.getByRole('button', { name: 'Reset' }).getAttribute('data-variant'),
  ).toBe('danger')
})

it('Cancel returns to Settings with Reset my data focused', () => {
  render(<App />)
  act(() => useGameStore.getState().openSettings())
  fireEvent.click(screen.getByRole('button', { name: 'Reset my data' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(useGameStore.getState().dialog).toBe('settings')
  expect(
    screen
      .getByRole('button', { name: 'Reset my data' })
      .hasAttribute('data-initial-focus'),
  ).toBe(true)
})

it('Reset calls resetAll', () => {
  const resetAll = vi.fn()
  useGameStore.setState({ resetAll })
  render(<App />)
  act(() => useGameStore.getState().openSettings())
  fireEvent.click(screen.getByRole('button', { name: 'Reset my data' }))
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  expect(resetAll).toHaveBeenCalledTimes(1)
})
