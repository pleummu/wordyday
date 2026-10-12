// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { stubDialog } from './test/stubDialog'
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

beforeAll(stubDialog)

beforeEach(async () => {
  loadPools.mockReset()
  loadPools.mockImplementation((length: WordLength) =>
    Promise.resolve(length === 4 ? pools4 : pools5),
  )
  localStorage.clear()
  useGameStore.setState({
    infoOpen: false,
    boards: {},
    finishedInSession: false,
  })
  await useGameStore.getState().startGame(5, 'normal')
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

it('switching mid-game keeps the Normal game and shows only the popup', async () => {
  render(<App />)
  for (const k of 'house') fireEvent.keyDown(window, { key: k })
  fireEvent.keyDown(window, { key: 'Enter' })
  act(() => {
    useGameStore.getState().finishReveal()
  })
  act(() => {
    useGameStore.getState().switchBoard({ mode: 'wordubado' })
  })
  expect(useGameStore.getState().boards['normal-5']?.guesses).toEqual(['house'])
  const dialogs = screen.getAllByRole('dialog')
  expect(dialogs).toHaveLength(1)
  expect(dialogs[0].getAttribute('aria-labelledby')).toBeTruthy()
  expect(screen.getByText("What's Wordubado?")).toBeTruthy()
})

it('ignores physical keys while the info popup is open', async () => {
  render(<App />)
  for (const k of 'ho') fireEvent.keyDown(window, { key: k })
  act(() => {
    useGameStore.getState().openInfo()
  })
  fireEvent.keyDown(window, { key: 'a' })
  fireEvent.keyDown(window, { key: 'Enter' })
  const s = useGameStore.getState()
  expect(s.current).toBe('ho')
  expect(s.rows).toHaveLength(0)
})

function playFour() {
  for (const w of ['house', 'bruhs', 'house', 'bruhs']) {
    for (const k of w) fireEvent.keyDown(window, { key: k })
    fireEvent.keyDown(window, { key: 'Enter' })
    act(() => {
      useGameStore.getState().finishReveal()
    })
  }
}

it('Give up confirm reveals the answer with the gave-up banner', () => {
  const { container } = render(<App />)
  playFour()
  fireEvent.click(screen.getByRole('button', { name: 'Give up' }))
  expect(screen.getByText('Give up?')).toBeTruthy()
  expect(
    screen.getByText('This counts as a loss. Reveal the answer?'),
  ).toBeTruthy()
  const dialog = screen.getByText('Give up?').closest('dialog')!
  fireEvent.click(
    Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Give up',
    )!,
  )
  const banner = container.querySelector('section.banner') as HTMLElement
  expect(
    within(banner).getByRole('heading', { name: 'You gave up' }),
  ).toBeTruthy()
  expect(within(banner).getByText('The word was CRANE')).toBeTruthy()
  // Give Up opens the Result modal in the same update.
  const result = container
    .querySelector('.result-heading')!
    .closest('dialog') as HTMLElement
  expect(
    within(result).getByRole('heading', { level: 2, name: 'You gave up' }),
  ).toBeTruthy()
})

it('New game confirm starts a fresh playing game', async () => {
  render(<App />)
  playFour()
  fireEvent.click(screen.getByRole('button', { name: 'New game' }))
  expect(
    screen.getByText('This counts as a loss. Start a new game?'),
  ).toBeTruthy()
  const dialog = screen.getByText('New game?').closest('dialog')!
  await act(async () => {
    fireEvent.click(
      Array.from(dialog.querySelectorAll('button')).find(
        (b) => b.textContent === 'New game',
      )!,
    )
  })
  const s = useGameStore.getState()
  expect(s.rows).toHaveLength(0)
  expect(s.status).toBe('playing')
})
