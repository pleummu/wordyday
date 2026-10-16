// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import Banner from './Banner'

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
