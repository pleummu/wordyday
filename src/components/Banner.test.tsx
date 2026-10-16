// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import Banner from './Banner'
import { winStreakLine } from '../state/copy'

afterEach(cleanup)

function renderBanner(autoFocus: boolean) {
  render(
    <Banner
      status="won"
      autoFocus={autoFocus}
      answer="crane"
      attemptsUsed={3}
      maxAttempts={6}
      onPlayAgain={() => {}}
    />,
  )
}

it('does not steal focus when autoFocus is false', () => {
  renderBanner(false)
  expect(document.activeElement).not.toBe(
    screen.getByRole('button', { name: /play again/i }),
  )
})

it('focuses Play again when autoFocus is true', () => {
  renderBanner(true)
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: /play again/i }),
  )
})

it('renders the streak line and marks the section', () => {
  render(
    <Banner
      status="won"
      autoFocus={false}
      answer="crane"
      attemptsUsed={3}
      maxAttempts={6}
      onPlayAgain={() => {}}
      streakLine="Win streak: 3"
    />,
  )
  const line = screen.getByText('Win streak: 3')
  expect(line.className).toBe('banner-streak')
  expect(line.closest('section')?.hasAttribute('data-streak')).toBe(true)
})

it('renders no streak line when it is null', () => {
  const { container } = render(
    <Banner
      status="lost"
      autoFocus={false}
      answer="crane"
      attemptsUsed={6}
      maxAttempts={6}
      onPlayAgain={() => {}}
      streakLine={null}
    />,
  )
  expect(container.querySelector('.banner-streak')).toBeNull()
  expect(container.querySelector('[data-streak]')).toBeNull()
})

it('winStreakLine words the win and the reset', () => {
  expect(winStreakLine({ won: true, winStreak: 3, prev: 2 })).toBe(
    'Win streak: 3',
  )
  expect(winStreakLine({ won: false, winStreak: 0, prev: 2 })).toBe(
    'Win streak reset',
  )
  expect(winStreakLine({ won: false, winStreak: 0, prev: 0 })).toBeNull()
})
