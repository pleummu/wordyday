// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import StreakChip from './StreakChip'
import { useGameStore } from '../state/gameStore'

afterEach(cleanup)

function seed(current: number, last: string | null, status = 'playing') {
  useGameStore.setState({
    dayStreak: { current, longest: current, lastActiveDate: last },
    today: '2026-06-03',
    status,
  } as never)
}

it('renders nothing at 0', () => {
  seed(0, null)
  const { container } = render(<StreakChip />)
  expect(container.innerHTML).toBe('')
})

it('names the chip with and without the play-today hint', () => {
  seed(5, '2026-06-03')
  render(<StreakChip />)
  const b = screen.getByRole('button', {
    name: 'Day streak 5, open statistics',
  })
  expect(b.hasAttribute('data-dimmed')).toBe(false)
  cleanup()
  seed(5, '2026-06-02')
  render(<StreakChip />)
  expect(
    screen
      .getByRole('button', {
        name: 'Day streak 5, play today to keep it, open statistics',
      })
      .hasAttribute('data-dimmed'),
  ).toBe(true)
})

it('is disabled while revealing', () => {
  seed(5, '2026-06-03', 'revealing')
  render(<StreakChip />)
  expect(screen.getByRole<HTMLButtonElement>('button').disabled).toBe(true)
})

it('click calls openStats', () => {
  const openStats = vi.fn()
  seed(5, '2026-06-03')
  useGameStore.setState({ openStats } as never)
  render(<StreakChip />)
  fireEvent.click(screen.getByRole('button'))
  expect(openStats).toHaveBeenCalled()
})
