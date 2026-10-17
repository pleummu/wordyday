// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { stubDialog } from '../test/stubDialog'
import { useGameStore } from '../state/gameStore'
import { localDateKey } from '../state/clock'
import { prevDay } from '../logic/streaks'
import RestorePrompt from './RestorePrompt'
import StreakBreakModal from './StreakBreakModal'

beforeAll(() => {
  stubDialog()
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
})
afterEach(cleanup)

function seed(over: Record<string, unknown> = {}) {
  const dismissBreak = vi.fn()
  useGameStore.setState({
    breakNotice: true,
    pendingRestore: null,
    status: 'playing',
    dismissBreak,
    ...over,
  } as never)
  return dismissBreak
}

const isOpen = () => document.querySelector('dialog')!.hasAttribute('open')

it('renders when breakNotice is set and no prompt is pending', () => {
  seed()
  render(<StreakBreakModal />)
  expect(isOpen()).toBe(true)
  expect(document.querySelector('dialog')!.textContent).toContain(
    'Your streak ended. Start a new one today!',
  )
})

it('stays closed while a prompt is pending', () => {
  seed({ pendingRestore: { streak: 5, missed: 1, creditDate: null } })
  render(<StreakBreakModal />)
  expect(isOpen()).toBe(false)
})

it('OK and Esc call dismissBreak', () => {
  const dismissBreak = seed()
  render(<StreakBreakModal />)
  fireEvent.click(screen.getByRole('button', { name: 'OK', hidden: true }))
  expect(dismissBreak).toHaveBeenCalledTimes(1)
  document.querySelector('dialog')!.dispatchEvent(new Event('cancel'))
  expect(dismissBreak).toHaveBeenCalledTimes(2)
})

function daysAgo(n: number): string {
  let d = localDateKey(new Date())
  for (let i = 0; i < n; i++) d = prevDay(d)
  return d
}

let gameSeq = 100

async function submitWin(missedAgo: number) {
  useGameStore.setState({
    breakNotice: false,
    pendingRestore: null,
    dialog: null,
    infoOpen: false,
    answer: 'crane',
    rows: [],
    current: 'crane',
    gameId: ++gameSeq,
    status: 'playing',
    pools: { answers: ['crane'], slang: [], guesses: new Set(['crane']) },
    dayStreak: {
      current: 5,
      longest: 5,
      lastActiveDate: daysAgo(missedAgo),
    },
    restores: { month: localDateKey(new Date()).slice(0, 7), used: 0 },
  } as never)
  // Real actions: reset the stubs set by seed().
  useGameStore.setState({
    dismissBreak: useGameStore.getInitialState().dismissBreak,
  })
  useGameStore.getState().submit()
}

const dialogs = () => Array.from(document.querySelectorAll('dialog'))
const openHeadings = () =>
  dialogs()
    .filter((d) => d.hasAttribute('open'))
    .map((d) => d.querySelector('h2')?.textContent)

it('D-21 EC-40 dialogs wait for the reveal', () => {
  render(
    <>
      <RestorePrompt />
      <StreakBreakModal />
    </>,
  )
  act(() => {
    void submitWin(3)
  })
  expect(useGameStore.getState().status).toBe('revealing')
  expect(useGameStore.getState().pendingRestore).not.toBeNull()
  expect(openHeadings()).toEqual([])
  act(() => {
    useGameStore.getState().finishReveal()
  })
  expect(openHeadings()).toEqual(['Streak broke'])
})

it('D-21 EC-05 the Fresh start dialog waits for the reveal too', () => {
  render(
    <>
      <RestorePrompt />
      <StreakBreakModal />
    </>,
  )
  act(() => {
    void submitWin(10)
  })
  expect(useGameStore.getState().status).toBe('revealing')
  expect(useGameStore.getState().breakNotice).toBe(true)
  expect(openHeadings()).toEqual([])
  act(() => {
    useGameStore.getState().finishReveal()
  })
  expect(openHeadings()).toEqual(['Fresh start'])
})
