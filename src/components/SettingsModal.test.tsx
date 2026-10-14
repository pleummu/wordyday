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
  expect(buttons.map((b) => b.textContent)).toEqual([
    'System',
    'Light',
    'Dark',
    'Colour-blind friendly colours',
    'Reset my data',
    'Close',
  ])
  expect(buttons[5].hasAttribute('data-initial-focus')).toBe(true)
  expect(buttons[4].hasAttribute('data-initial-focus')).toBe(false)
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
  expect(dlg.textContent).toContain("This can't be undone.")
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

it('Appearance comes before the browser-only note and uses only buttons', () => {
  render(<App />)
  act(() => useGameStore.getState().openSettings())
  const dlg = screen.getByRole('dialog', { name: 'Settings' })
  const heading = screen.getByRole('heading', { name: 'Appearance' })
  const note = screen.getByText(/saved in this browser only/)
  expect(
    heading.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
  expect(dlg.querySelector('input')).toBeNull()
  for (const el of dlg.querySelectorAll('[role=radio],[role=switch]')) {
    expect(el.tagName).toBe('BUTTON')
  }
})

it('theme radios use a roving tabindex and arrow/End keys', () => {
  useGameStore.setState({ theme: 'system', colourBlind: false })
  render(<App />)
  act(() => useGameStore.getState().openSettings())
  const [system, light, dark] = ['System', 'Light', 'Dark'].map((n) =>
    screen.getByRole('radio', { name: n }),
  )
  expect([system, light, dark].map((r) => r.tabIndex)).toEqual([0, -1, -1])
  system.focus()
  fireEvent.keyDown(system, { key: 'ArrowRight' })
  expect(useGameStore.getState().theme).toBe('light')
  expect(document.activeElement).toBe(light)
  fireEvent.keyDown(light, { key: 'End' })
  expect(useGameStore.getState().theme).toBe('dark')
  expect(document.activeElement).toBe(dark)
})

it('the colour-blind switch toggles the store', () => {
  useGameStore.setState({ colourBlind: false })
  render(<App />)
  act(() => useGameStore.getState().openSettings())
  const sw = screen.getByRole('switch', {
    name: 'Colour-blind friendly colours',
  })
  fireEvent.click(sw)
  expect(useGameStore.getState().colourBlind).toBe(true)
  expect(sw.getAttribute('aria-checked')).toBe('true')
})
