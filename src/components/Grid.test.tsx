// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Grid from './Grid'
import type { GameStatus } from '../state/gameStore'

afterEach(cleanup)

it.each([
  [4, 5],
  [5, 6],
  [6, 7],
] as const)(
  'length %i renders %i rows of that many cells',
  (length, attempts) => {
    render(
      <Grid
        length={length}
        rows={[]}
        current=""
        status="playing"
        shakeId={0}
        shakeRow={-1}
        celebrate={false}
      />,
    )
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(attempts)
    for (const row of rows) {
      expect(within(row).getAllByRole('gridcell')).toHaveLength(length)
    }
  },
)

it('shows typed letters in the active row', () => {
  render(
    <Grid
      length={5}
      rows={[]}
      current="h"
      status="playing"
      shakeId={0}
      shakeRow={-1}
      celebrate={false}
    />,
  )
  expect(
    screen.getByRole('gridcell', { name: 'Row 1, column 1, letter H' }),
  ).toBeTruthy()
})

it('labels empty cells', () => {
  render(
    <Grid
      length={5}
      rows={[]}
      current=""
      status="playing"
      shakeId={0}
      shakeRow={-1}
      celebrate={false}
    />,
  )
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
  render(
    <Grid
      length={5}
      rows={[row]}
      current=""
      status="playing"
      shakeId={0}
      shakeRow={-1}
      celebrate={false}
    />,
  )
  const cell = screen.getByRole('gridcell', {
    name: 'Row 1, column 1, letter C, correct',
  })
  expect(cell.getAttribute('data-state')).toBe('correct')
})

it('omits the state from labels while the last row is revealing', () => {
  render(
    <Grid
      length={5}
      rows={[row]}
      current=""
      status="revealing"
      shakeId={0}
      shakeRow={-1}
      celebrate={false}
    />,
  )
  expect(
    screen.getByRole('gridcell', { name: 'Row 1, column 1, letter C' }),
  ).toBeTruthy()
})

describe('shake scoping', () => {
  it('marks the active row when it was rejected', () => {
    const { container } = render(
      <Grid
        length={5}
        rows={[]}
        current="ab"
        status="playing"
        shakeId={1}
        shakeRow={0}
        celebrate={false}
      />,
    )
    expect(container.querySelectorAll('[data-shake]')).toHaveLength(1)
  })

  it('does not shake the new active row after a valid guess', () => {
    const { container } = render(
      <Grid
        length={5}
        rows={[row]}
        current=""
        status="playing"
        shakeId={1}
        shakeRow={0}
        celebrate={false}
      />,
    )
    expect(container.querySelectorAll('[data-shake]')).toHaveLength(0)
  })

  it('shakes again on a later rejection', () => {
    const { container } = render(
      <Grid
        length={5}
        rows={[row]}
        current="zz"
        status="playing"
        shakeId={2}
        shakeRow={1}
        celebrate={false}
      />,
    )
    expect(container.querySelectorAll('[data-shake]')).toHaveLength(1)
  })
})

const twoRows = [
  {
    letters: 'crane',
    states: ['absent', 'absent', 'absent', 'absent', 'correct'],
  },
  {
    letters: 'slate',
    states: ['absent', 'absent', 'absent', 'absent', 'correct'],
  },
] as never

function renderGrid(status: GameStatus, celebrate: boolean) {
  return render(
    <Grid
      length={5}
      rows={twoRows}
      current=""
      status={status}
      shakeId={0}
      shakeRow={-1}
      celebrate={celebrate}
    />,
  )
}

describe('restored vs live presentation', () => {
  it('no flip while playing', () => {
    const { container } = renderGrid('playing', false)
    expect(container.querySelectorAll('[data-flip]')).toHaveLength(0)
  })

  it('flips only the last row while revealing', () => {
    const { container } = renderGrid('revealing', false)
    const rows = container.querySelectorAll('.row')
    expect(rows[0].querySelectorAll('[data-flip]')).toHaveLength(0)
    expect(rows[1].querySelectorAll('[data-flip]')).toHaveLength(5)
  })

  it('bounces and flips the last row on a celebrated win', () => {
    const { container } = renderGrid('won', true)
    const rows = container.querySelectorAll('.row')
    expect(rows[1].getAttribute('data-bounce')).toBe('true')
    expect(rows[1].querySelectorAll('[data-flip]')).toHaveLength(5)
    expect(rows[0].querySelectorAll('[data-flip]')).toHaveLength(0)
  })

  it('is static for a restored win', () => {
    const { container } = renderGrid('won', false)
    expect(container.querySelectorAll('[data-bounce]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-flip]')).toHaveLength(0)
  })

  it.each(['lost', 'gave-up'] as const)('no flip for %s', (status) => {
    const { container } = renderGrid(status, true)
    expect(container.querySelectorAll('[data-flip]')).toHaveLength(0)
  })
})
