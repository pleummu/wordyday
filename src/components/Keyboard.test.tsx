// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Keyboard from './Keyboard'
import { usePhysicalKeyboard } from './usePhysicalKeyboard'
import { useGameStore } from '../state/gameStore'

afterEach(cleanup)

it('renders 28 type=button keys', () => {
  render(<Keyboard keyStates={{}} disabled={false} onKey={() => {}} />)
  const buttons = screen.getAllByRole('button')
  expect(buttons).toHaveLength(28)
  for (const b of buttons) expect(b.getAttribute('type')).toBe('button')
})

it('calls onKey with letters, enter and backspace', () => {
  const onKey = vi.fn()
  render(<Keyboard keyStates={{}} disabled={false} onKey={onKey} />)
  fireEvent.click(screen.getByRole('button', { name: 'Q' }))
  fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
  fireEvent.click(screen.getByRole('button', { name: 'Backspace' }))
  expect(onKey.mock.calls.map((c) => c[0])).toEqual(['q', 'enter', 'backspace'])
})

it('shows key state in label and data-state', () => {
  render(
    <Keyboard keyStates={{ a: 'correct' }} disabled={false} onKey={() => {}} />,
  )
  const key = screen.getByRole('button', { name: 'A, correct' })
  expect(key.getAttribute('data-state')).toBe('correct')
})

it('disables every key when disabled', () => {
  render(<Keyboard keyStates={{}} disabled={true} onKey={() => {}} />)
  for (const b of screen.getAllByRole('button')) {
    expect((b as HTMLButtonElement).disabled).toBe(true)
  }
})

function Harness() {
  usePhysicalKeyboard()
  return (
    <div>
      <button type="button" role="radio" aria-checked="true">
        r
      </button>
      <button type="button" data-own-enter>
        again
      </button>
      <button type="button">other</button>
    </div>
  )
}

beforeEach(() => {
  useGameStore.setState({
    status: 'playing',
    length: 5,
    current: '',
    rows: [],
    answer: 'crane',
    pools: {
      answers: ['crane'],
      slang: [],
      guesses: new Set(['crane', 'house']),
    },
  })
})

it('types, deletes and ignores modified keys', () => {
  render(<Harness />)
  fireEvent.keyDown(window, { key: 'a' })
  expect(useGameStore.getState().current).toBe('a')
  fireEvent.keyDown(window, { key: 'a', ctrlKey: true })
  expect(useGameStore.getState().current).toBe('a')
  fireEvent.keyDown(window, { key: 'Backspace' })
  expect(useGameStore.getState().current).toBe('')
})

it('ignores repeated Enter', () => {
  useGameStore.setState({ current: 'house' })
  render(<Harness />)
  fireEvent.keyDown(window, { key: 'Enter', repeat: true })
  expect(useGameStore.getState().rows).toHaveLength(0)
})

it('ignores Enter from a data-own-enter button', () => {
  useGameStore.setState({ current: 'house' })
  render(<Harness />)
  fireEvent.keyDown(screen.getByText('again'), { key: 'Enter' })
  expect(useGameStore.getState().rows).toHaveLength(0)
})

it('submits on Enter from a radio and prevents default', () => {
  useGameStore.setState({ current: 'house' })
  render(<Harness />)
  const notPrevented = fireEvent.keyDown(screen.getByRole('radio'), {
    key: 'Enter',
  })
  expect(notPrevented).toBe(false)
  expect(useGameStore.getState().rows).toHaveLength(1)
})

it('submits on Enter from any other button', () => {
  useGameStore.setState({ current: 'house' })
  render(<Harness />)
  const notPrevented = fireEvent.keyDown(screen.getByText('other'), {
    key: 'Enter',
  })
  expect(notPrevented).toBe(false)
  expect(useGameStore.getState().rows).toHaveLength(1)
})

it('removes the listener on unmount', () => {
  const remove = vi.spyOn(window, 'removeEventListener')
  const { unmount } = render(<Harness />)
  unmount()
  expect(remove.mock.calls.some((c) => c[0] === 'keydown')).toBe(true)
  remove.mockRestore()
  fireEvent.keyDown(window, { key: 'a' })
  expect(useGameStore.getState().current).toBe('')
})
