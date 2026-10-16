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
import { emptyStats } from '../logic/save'
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
    stats: emptyStats(),
    storageOk: true,
    finishedInSession: false,
    dayStreak: { current: 0, longest: 0, lastActiveDate: null },
    restores: { month: '', used: 0 },
    today: '2026-06-03',
  })
  loadPools.mockReset()
  loadPools.mockImplementation(() => Promise.resolve(pools))
  await useGameStore.getState().startGame(5, 'normal')
})

afterEach(cleanup)

it('empty state renders dashes and the empty message, never NaN', () => {
  render(<App />)
  act(() => useGameStore.getState().openStats())
  const dlg = screen.getByRole('dialog', { name: 'Statistics' })
  expect(dlg.textContent).toContain('—')
  expect(dlg.textContent).toContain('No wins yet. Go play one!')
  expect(dlg.textContent).toContain('Avg guesses: —')
  expect(dlg.textContent).not.toMatch(/NaN|Infinity/)
})

it('All tab renders exactly two stat cells', () => {
  render(<App />)
  act(() => useGameStore.getState().openStats())
  fireEvent.click(screen.getByRole('tab', { name: 'All lengths' }))
  expect(document.querySelectorAll('.stat')).toHaveLength(2)
})

it('ArrowRight on the selected tab moves aria-selected', () => {
  render(<App />)
  act(() => useGameStore.getState().openStats())
  const five = screen.getByRole('tab', { name: '5 letters' })
  expect(five.getAttribute('aria-selected')).toBe('true')
  fireEvent.keyDown(five, { key: 'ArrowRight' })
  expect(
    screen
      .getByRole('tab', { name: '6 letters' })
      .getAttribute('aria-selected'),
  ).toBe('true')
})

it('reopening resets the view to the current Board', () => {
  render(<App />)
  act(() => useGameStore.getState().openStats())
  fireEvent.click(screen.getByRole('tab', { name: '4 letters' }))
  fireEvent.click(screen.getByRole('radio', { name: 'Wordubado' }))
  act(() => useGameStore.getState().closeDialog())
  act(() => useGameStore.getState().openStats())
  expect(
    screen
      .getByRole('tab', { name: '5 letters' })
      .getAttribute('aria-selected'),
  ).toBe('true')
  expect(
    screen.getByRole('radio', { name: 'Normal' }).getAttribute('aria-checked'),
  ).toBe('true')
})

it('shows the global footer on a fresh store', () => {
  render(<App />)
  act(() => useGameStore.getState().openStats())
  const dlg = screen.getByRole('dialog', { name: 'Statistics' })
  expect(dlg.textContent).toContain('Day streak 0 · Best 0')
  expect(dlg.textContent).toContain('Restores left: 3/3')
})

it('shows the seeded Day Streak and remaining Restores on every tab', () => {
  useGameStore.setState({
    dayStreak: { current: 5, longest: 9, lastActiveDate: '2026-06-03' },
    restores: { month: '2026-06', used: 1 },
  })
  render(<App />)
  act(() => useGameStore.getState().openStats())
  fireEvent.click(screen.getByRole('tab', { name: 'All lengths' }))
  const dlg = screen.getByRole('dialog', { name: 'Statistics' })
  expect(dlg.textContent).toContain('Day streak 5 · Best 9')
  expect(dlg.textContent).toContain('Restores left: 2/3')
})
