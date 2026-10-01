// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

it('shows the product name as the level-1 heading', () => {
  render(<App />)
  expect(
    screen.getByRole('heading', { level: 1, name: 'Unlimited Wordle' }),
  ).toBeTruthy()
})

it('shows a coming-soon line', () => {
  render(<App />)
  expect(screen.getByText(/Coming soon/)).toBeTruthy()
})
