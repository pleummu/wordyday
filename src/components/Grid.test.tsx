// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import Grid from './Grid'

afterEach(cleanup)

it.each([
  [4, 5],
  [5, 6],
  [6, 7],
] as const)(
  'length %i renders %i rows of that many cells',
  (length, attempts) => {
    render(<Grid length={length} rows={[]} current="" status="playing" />)
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(attempts)
    for (const row of rows) {
      expect(within(row).getAllByRole('gridcell')).toHaveLength(length)
    }
  },
)

it('shows typed letters in the active row', () => {
  render(<Grid length={5} rows={[]} current="h" status="playing" />)
  expect(
    screen.getByRole('gridcell', { name: 'Row 1, column 1, letter H' }),
  ).toBeTruthy()
})

it('labels empty cells', () => {
  render(<Grid length={5} rows={[]} current="" status="playing" />)
  expect(
    screen.getByRole('gridcell', { name: 'Row 3, column 2, empty' }),
  ).toBeTruthy()
})

const row = {
  letters: 'crane',
  states: ['correct', 'absent', 'present', 'absent', 'absent'] as (
    'correct' | 'present' | 'absent'
  )[],
}

it('shows states for a submitted row once revealed', () => {
  render(<Grid length={5} rows={[row]} current="" status="playing" />)
  const cell = screen.getByRole('gridcell', {
    name: 'Row 1, column 1, letter C, correct',
  })
  expect(cell.getAttribute('data-state')).toBe('correct')
})

it('omits the state from labels while the last row is revealing', () => {
  render(<Grid length={5} rows={[row]} current="" status="revealing" />)
  expect(
    screen.getByRole('gridcell', { name: 'Row 1, column 1, letter C' }),
  ).toBeTruthy()
})
