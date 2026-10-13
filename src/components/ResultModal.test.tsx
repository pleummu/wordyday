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
import { stubDialog } from '../test/stubDialog'
import type { Pools } from '../data/wordData'
import { score } from '../logic/score'

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
    resultPending: false,
    resultFlourish: false,
    dayStreak: { current: 0, longest: 0, lastActiveDate: null },
    restores: { month: '', used: 0 },
    today: '2026-06-03',
  })
  loadPools.mockReset()
  loadPools.mockImplementation(() => Promise.resolve(pools))
  await useGameStore.getState().startGame(5, 'normal')
})

afterEach(cleanup)

function row(word: string) {
  return { letters: word, states: score('crane', word) }
}

function finish(
  status: 'won' | 'lost' | 'gave-up',
  rows: string[],
  extra: Record<string, unknown> = {},
) {
  const stats = emptyStats()
  stats['normal-5'] = {
    ...stats['normal-5'],
    played: 3,
    wins: 2,
    dist: [0, 1, 1, 0, 0, 0],
    winStreak: 2,
    bestWinStreak: 2,
    last: { won: true, guesses: 2, seq: 1 },
  }
  useGameStore.setState({
    status,
    rows: rows.map(row),
    stats,
    dialog: 'result',
    ...extra,
  })
}

function dialog() {
  return document
    .querySelector('.result-heading')!
    .closest('dialog') as HTMLElement
}

it('win shows heading, answer, stats, highlighted row and focused Play again', () => {
  render(<App />)
  act(() => finish('won', ['house', 'crane']))
  const dlg = within(dialog())
  const h = dlg.getByRole('heading', { level: 2 })
  expect(h.textContent).toBe('You got it in 2/6!')
  expect(h.getAttribute('data-result')).toBe('won')
  expect(dialog().querySelector('.result-answer')!.textContent).toBe(
    'The word was crane',
  )
  expect(
    Array.from(dialog().querySelectorAll('.stat-value')).map(
      (e) => e.textContent,
    ),
  ).toEqual(['3', '67%', '2', '2'])
  expect(
    dialog().querySelector('li[aria-label="2 guesses: 1 win, latest win"]'),
  ).not.toBeNull()
  expect(document.activeElement).toBe(
    dlg.getByRole('button', { name: 'Play again' }),
  )
})

it('loss shows Out of guesses with no highlight', () => {
  render(<App />)
  act(() =>
    finish('lost', ['house', 'house', 'house', 'house', 'house', 'house']),
  )
  expect(dialog().querySelector('.result-heading')!.textContent).toBe(
    'Out of guesses',
  )
  expect(dialog().querySelector('[data-highlight]')).toBeNull()
})

it('gave-up shows You gave up', () => {
  render(<App />)
  act(() => finish('gave-up', ['house', 'house', 'house', 'house', 'house']))
  expect(dialog().querySelector('.result-heading')!.textContent).toBe(
    'You gave up',
  )
})

it('no wins shows the empty line and no chart', () => {
  render(<App />)
  act(() => {
    finish('lost', ['house'])
    useGameStore.setState({ stats: emptyStats() })
  })
  expect(dialog().textContent).toContain('No wins yet. Go play one!')
  expect(dialog().querySelector('ol.dist')).toBeNull()
})

it('chart has one row per attempt at 4 and 6 letters', async () => {
  render(<App />)
  for (const [n, rows] of [
    [4, 5],
    [6, 7],
  ] as const) {
    await act(async () => {
      await useGameStore.getState().startGame(n, 'normal')
    })
    const stats = emptyStats()
    const key = `normal-${n}` as const
    stats[key] = {
      ...stats[key],
      played: 1,
      wins: 1,
      dist: new Array<number>(rows).fill(0),
    }
    stats[key].dist[0] = 1
    act(() => {
      useGameStore.setState({ status: 'lost', stats, dialog: 'result' })
    })
    expect(dialog().querySelectorAll('.dist-row')).toHaveLength(rows)
    act(() => useGameStore.getState().closeDialog())
  }
})

it('flourish attribute follows resultFlourish', () => {
  render(<App />)
  act(() => finish('won', ['crane'], { resultFlourish: true }))
  expect(
    dialog().querySelector('.result-panel')!.hasAttribute('data-flourish'),
  ).toBe(true)
  act(() => useGameStore.setState({ resultFlourish: false }))
  expect(
    dialog().querySelector('.result-panel')!.hasAttribute('data-flourish'),
  ).toBe(false)
})

it('a held Enter is default-prevented, a single Enter is not', () => {
  render(<App />)
  act(() => finish('won', ['crane']))
  const btn = within(dialog()).getByRole('button', { name: 'Play again' })
  expect(fireEvent.keyDown(btn, { key: 'Enter', repeat: true })).toBe(false)
  expect(fireEvent.keyDown(btn, { key: 'Enter' })).toBe(true)
})

function streakCell() {
  return dialog().querySelectorAll('.stat')[2] as HTMLElement
}

it('Streak cell reads reset after a loss that ended a streak', () => {
  render(<App />)
  act(() =>
    finish('lost', ['house'], {
      stats: emptyStats(),
      finishedInSession: true,
      finishNote: { won: false, winStreak: 0, prev: 3 },
    }),
  )
  const cell = streakCell()
  expect(cell.querySelector('.visually-hidden')!.textContent).toBe(
    'Current win streak 0, reset',
  )
  expect(cell.querySelector('.stat-value')!.getAttribute('aria-hidden')).toBe(
    'true',
  )
})

it('Streak cell has no reset when there was no streak, on a win, or when restored', () => {
  render(<App />)
  act(() =>
    finish('lost', ['house'], {
      finishedInSession: true,
      finishNote: { won: false, winStreak: 0, prev: 0 },
    }),
  )
  expect(streakCell().querySelector('.visually-hidden')!.textContent).toBe(
    'Current win streak 2',
  )
  act(() =>
    useGameStore.setState({
      finishNote: { won: true, winStreak: 2, prev: 1 },
    }),
  )
  expect(streakCell().querySelector('.visually-hidden')!.textContent).toBe(
    'Current win streak 2',
  )
  act(() =>
    useGameStore.setState({
      finishedInSession: false,
      finishNote: { won: false, winStreak: 0, prev: 3 },
    }),
  )
  expect(streakCell().querySelector('.visually-hidden')!.textContent).toBe(
    'Current win streak 2',
  )
})

it('Play again starts a new game and closes the modal', async () => {
  render(<App />)
  act(() => finish('won', ['crane']))
  await act(async () => {
    fireEvent.click(
      within(dialog()).getByRole('button', { name: 'Play again' }),
    )
  })
  expect(useGameStore.getState().dialog).toBeNull()
  expect(useGameStore.getState().rows).toEqual([])
  screen.getByRole('button', { name: 'Enter' })
})

function stubClipboard(writeText: (t: string) => Promise<void>) {
  vi.stubGlobal('navigator', {
    ...navigator,
    share: undefined,
    maxTouchPoints: 0,
    clipboard: { writeText },
  })
}

const flushAsync = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

it('actions row is Share then Play again, Play again keeps initial focus', () => {
  render(<App />)
  act(() => finish('won', ['crane']))
  const btns = Array.from(
    dialog().querySelectorAll('.result-actions button'),
  ) as HTMLElement[]
  expect(
    btns.map((b) => b.getAttribute('aria-label') ?? b.textContent),
  ).toEqual(['Share', 'Play again'])
  expect(btns[1].hasAttribute('data-initial-focus')).toBe(true)
  expect(btns[0].hasAttribute('data-initial-focus')).toBe(false)
})

it('Share copies the grid, shows Copied then reverts', async () => {
  vi.useFakeTimers()
  try {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    render(<App />)
    act(() => finish('won', ['house', 'crane']))
    const btn = within(dialog()).getByRole('button', { name: 'Share' })
    fireEvent.click(btn)
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toBe(
      `Wordle 5 - 2/6

${score('crane', 'house')
  .map((s) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬜'))
  .join('')}
🟩🟩🟩🟩🟩

${window.location.origin}`,
    )
    await flushAsync()
    expect(btn.textContent).toBe('Copied ✓')
    expect(btn.getAttribute('aria-label')).toBe('Share')
    expect(useGameStore.getState().toast?.text).toBe('Copied')
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(btn.textContent).toBe('Share')
  } finally {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  }
})

it('copy failure shows the note and a focused readonly textarea, cleared on close', async () => {
  stubClipboard(() => Promise.reject(new Error('blocked')))
  render(<App />)
  act(() => finish('won', ['crane']))
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Share' }))
  await flushAsync()
  const box = within(dialog()).getByRole('textbox', {
    name: 'Share text',
  }) as HTMLTextAreaElement
  expect(dialog().textContent).toContain(
    "Couldn't copy. Select the text and copy it.",
  )
  expect(box.readOnly).toBe(true)
  expect(box.value.startsWith('Wordle 5 - 1/6')).toBe(true)
  expect(document.activeElement).toBe(box)
  expect(box.getAttribute('aria-describedby')).toBe('share-note')
  act(() => useGameStore.setState({ dialog: null }))
  act(() => useGameStore.setState({ dialog: 'result' }))
  expect(screen.queryByRole('textbox', { name: 'Share text' })).toBeNull()
  vi.unstubAllGlobals()
})

it('Play again removes the fallback box', async () => {
  stubClipboard(() => Promise.reject(new Error('blocked')))
  render(<App />)
  act(() => finish('won', ['crane']))
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Share' }))
  await flushAsync()
  await act(async () => {
    fireEvent.click(
      within(dialog()).getByRole('button', { name: 'Play again' }),
    )
  })
  expect(screen.queryByRole('textbox', { name: 'Share text' })).toBeNull()
  vi.unstubAllGlobals()
})

it('colour-blind flag switches the squares', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  stubClipboard(writeText)
  render(<App />)
  act(() => finish('won', ['crane'], { colourBlind: true }))
  fireEvent.click(within(dialog()).getByRole('button', { name: 'Share' }))
  expect(writeText.mock.calls[0][0]).toContain('🟧')
  act(() => useGameStore.setState({ colourBlind: false }))
  vi.unstubAllGlobals()
})
