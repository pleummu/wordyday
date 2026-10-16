// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Toast from './Toast'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('renders an error toast inside role alert', () => {
  render(
    <Toast
      toast={{ id: 1, text: 'Not in word list', kind: 'error' }}
      onDismiss={() => {}}
    />,
  )
  expect(screen.getByRole('alert').textContent).toBe('Not in word list')
})

it('renders an info toast inside role status', () => {
  render(
    <Toast
      toast={{ id: 1, text: 'Great', kind: 'info' }}
      onDismiss={() => {}}
    />,
  )
  expect(screen.getByRole('status').textContent).toBe('Great')
})

it('renders nothing for null', () => {
  const { container } = render(<Toast toast={null} onDismiss={() => {}} />)
  expect(container.querySelector('.toast')).toBeNull()
})

it('dismisses after 1860 ms with the toast id', () => {
  const onDismiss = vi.fn()
  render(
    <Toast toast={{ id: 7, text: 'Hi', kind: 'info' }} onDismiss={onDismiss} />,
  )
  act(() => {
    vi.advanceTimersByTime(1859)
  })
  expect(onDismiss).not.toHaveBeenCalled()
  act(() => {
    vi.advanceTimersByTime(1)
  })
  expect(onDismiss).toHaveBeenCalledWith(7)
})

it('a new toast id resets the timer and replaces the text', () => {
  const onDismiss = vi.fn()
  const { rerender } = render(
    <Toast
      toast={{ id: 1, text: 'One', kind: 'info' }}
      onDismiss={onDismiss}
    />,
  )
  act(() => {
    vi.advanceTimersByTime(1000)
  })
  rerender(
    <Toast
      toast={{ id: 2, text: 'Two', kind: 'info' }}
      onDismiss={onDismiss}
    />,
  )
  expect(screen.getByRole('status').textContent).toBe('Two')
  act(() => {
    vi.advanceTimersByTime(1000)
  })
  expect(onDismiss).not.toHaveBeenCalled()
  act(() => {
    vi.advanceTimersByTime(860)
  })
  expect(onDismiss).toHaveBeenCalledTimes(1)
  expect(onDismiss).toHaveBeenCalledWith(2)
})

it('uses lifeMs for the dismiss timer and the --toast-life variable', () => {
  const onDismiss = vi.fn()
  render(
    <Toast
      toast={{ id: 3, text: 'Long', kind: 'info', lifeMs: 4000 }}
      onDismiss={onDismiss}
    />,
  )
  act(() => {
    vi.advanceTimersByTime(1860)
  })
  expect(onDismiss).not.toHaveBeenCalled()
  act(() => {
    vi.advanceTimersByTime(2140)
  })
  expect(onDismiss).toHaveBeenCalledWith(3)
})

it('sets --toast-life from the default life', () => {
  render(
    <Toast toast={{ id: 4, text: 'Hi', kind: 'info' }} onDismiss={() => {}} />,
  )
  expect(
    (screen.getByRole('status') as HTMLElement).style.getPropertyValue(
      '--toast-life',
    ),
  ).toBe('1860')
})
