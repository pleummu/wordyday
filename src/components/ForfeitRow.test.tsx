// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ForfeitRow from './ForfeitRow'
import { useGameStore, type GameStatus } from '../state/gameStore'

const openDialog = vi.fn()

function setup(status: GameStatus, n: number) {
  useGameStore.setState({
    status,
    length: 5,
    rows: Array.from({ length: n }, () => []) as never,
    openDialog,
  })
  return render(<ForfeitRow />)
}

beforeEach(() => openDialog.mockReset())
afterEach(cleanup)

it('renders nothing with 3 attempts used', () => {
  expect(setup('playing', 3).container.innerHTML).toBe('')
})
it('renders nothing with 5 attempts used', () => {
  expect(setup('playing', 5).container.innerHTML).toBe('')
})
it('renders nothing while revealing', () => {
  expect(setup('revealing', 4).container.innerHTML).toBe('')
})
it('renders nothing when finished or loading', () => {
  for (const s of ['won', 'lost', 'gave-up', 'loading'] as const) {
    expect(setup(s, 4).container.innerHTML).toBe('')
    cleanup()
  }
})
it('renders both buttons at 2 tries left, Give up first', () => {
  setup('playing', 4)
  const names = screen.getAllByRole('button').map((b) => b.textContent)
  expect(names).toEqual(['Give up', 'New game'])
})
it('opens the matching dialogs and marks own-enter', () => {
  setup('playing', 4)
  const giveUp = screen.getByRole('button', { name: 'Give up' })
  const newGame = screen.getByRole('button', { name: 'New game' })
  expect(giveUp.hasAttribute('data-own-enter')).toBe(true)
  expect(newGame.hasAttribute('data-own-enter')).toBe(true)
  fireEvent.click(giveUp)
  fireEvent.click(newGame)
  expect(openDialog).toHaveBeenNthCalledWith(1, 'giveUp')
  expect(openDialog).toHaveBeenNthCalledWith(2, 'newGame')
})
