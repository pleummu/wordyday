// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Pools } from './data/wordData'
import type { WordLength } from './logic/boards'

const pools5: Pools = {
  answers: ['crane'],
  slang: ['bruhs'],
  guesses: new Set(['crane', 'house', 'bruhs']),
}
const pools4: Pools = {
  answers: ['kind'],
  slang: ['yeet'],
  guesses: new Set(['kind', 'gold', 'yeet']),
}

const loadPools = vi.hoisted(() => vi.fn())
vi.mock('./data/wordData', () => ({ loadPools }))

import App from './App'
import { useGameStore } from './state/gameStore'

beforeEach(async () => {
  loadPools.mockReset()
  loadPools.mockImplementation((length: WordLength) =>
    Promise.resolve(length === 4 ? pools4 : pools5),
  )
  await useGameStore.getState().startGame(5)
  loadPools.mockClear()
})

afterEach(cleanup)

it('shows the heading, picker and a 5-letter grid', () => {
  render(<App />)
  expect(
    screen.getByRole('heading', { level: 1, name: 'Unlimited Wordle' }),
  ).toBeTruthy()
  expect(screen.getByRole('radiogroup', { name: 'Word length' })).toBeTruthy()
  expect(
    screen
      .getByRole('radio', { name: '5 letters' })
      .getAttribute('aria-checked'),
  ).toBe('true')
  expect(screen.getAllByRole('gridcell')).toHaveLength(30)
})

it('switches to a 4-letter grid', async () => {
  render(<App />)
  await act(async () => {
    fireEvent.click(screen.getByRole('radio', { name: '4 letters' }))
  })
  expect(screen.getAllByRole('gridcell')).toHaveLength(20)
})

it('pointer-selecting a length then pressing Enter submits and does not restart', async () => {
  render(<App />)
  const radio = screen.getByRole('radio', { name: '4 letters' })
  radio.focus()
  await act(async () => {
    fireEvent.click(radio, { detail: 1 })
  })
  expect(document.activeElement).not.toBe(radio)
  for (const k of 'gold') fireEvent.keyDown(window, { key: k })
  fireEvent.keyDown(radio, { key: 'Enter' })
  const s = useGameStore.getState()
  expect(s.rows).toHaveLength(1)
  expect(s.length).toBe(4)
  expect(loadPools).toHaveBeenCalledTimes(1)
  expect(loadPools).toHaveBeenCalledWith(4)
})

it('shows Loading words... only after 400 ms of loading', async () => {
  vi.useFakeTimers()
  try {
    loadPools.mockImplementation(() => new Promise(() => {}))
    render(<App />)
    act(() => {
      void useGameStore.getState().startGame(5)
    })
    expect(
      (screen.getByRole('button', { name: 'Enter' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    act(() => {
      vi.advanceTimersByTime(399)
    })
    expect(screen.queryByText('Loading words...')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(2)
    })
    expect(screen.getByText('Loading words...')).toBeTruthy()
  } finally {
    vi.useRealTimers()
  }
})

it('shows a load error with Try again that recovers', async () => {
  loadPools.mockImplementation(() => Promise.reject(new Error('boom')))
  render(<App />)
  await act(async () => {
    await useGameStore.getState().startGame(5)
  })
  expect(
    screen.getByText(
      "Couldn't load the word list. Check your connection and try again.",
    ),
  ).toBeTruthy()
  expect(screen.getAllByRole('gridcell')).toHaveLength(30)
  expect(screen.queryByRole('button', { name: 'Enter' })).toBeNull()

  loadPools.mockImplementation(() => Promise.resolve(pools5))
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  })
  expect(
    (screen.getByRole('button', { name: 'Enter' }) as HTMLButtonElement)
      .disabled,
  ).toBe(false)
})
