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
  expect(screen.getByRole('alert', { hidden: true }).textContent).toBe(
    'Not in word list',
  )
})

it('renders an info toast inside role status', () => {
  render(
    <Toast
      toast={{ id: 1, text: 'Great', kind: 'info' }}
      onDismiss={() => {}}
    />,
  )
  expect(screen.getByRole('status', { hidden: true }).textContent).toBe('Great')
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
  expect(screen.getByRole('status', { hidden: true }).textContent).toBe('Two')
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
    (
      screen.getByRole('status', { hidden: true }) as HTMLElement
    ).style.getPropertyValue('--toast-life'),
  ).toBe('1860')
})

it('announce false drops role and aria-live', () => {
  const { container } = render(
    <Toast
      toast={{ id: 5, text: 'Quiet', kind: 'info' }}
      onDismiss={() => {}}
      announce={false}
    />,
  )
  const el = container.querySelector('.toast')!
  expect(el.hasAttribute('role')).toBe(false)
  expect(el.hasAttribute('aria-live')).toBe(false)
})

it('is a manual popover raised on show and re-raised when raiseKey changes', () => {
  const show = vi.fn()
  const hide = vi.fn()
  HTMLElement.prototype.showPopover = show
  HTMLElement.prototype.hidePopover = hide
  const matches = vi
    .spyOn(HTMLElement.prototype, 'matches')
    .mockImplementation((q) => q === ':popover-open')
  try {
    const toast = { id: 6, text: 'Hi', kind: 'info' as const }
    const { container, rerender } = render(
      <Toast toast={toast} onDismiss={() => {}} raiseKey={null} />,
    )
    expect(
      container.querySelector('.toast-layer')!.getAttribute('popover'),
    ).toBe('manual')
    expect(show).toHaveBeenCalledTimes(1)
    hide.mockClear()
    rerender(<Toast toast={toast} onDismiss={() => {}} raiseKey="result" />)
    expect(hide).toHaveBeenCalledTimes(1)
    expect(show).toHaveBeenCalledTimes(2)
    hide.mockClear()
    rerender(<Toast toast={null} onDismiss={() => {}} raiseKey="result" />)
    expect(hide).toHaveBeenCalled()
  } finally {
    matches.mockRestore()
    delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover
    delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover
  }
})

it('does not throw without the popover API', () => {
  expect(() =>
    render(
      <Toast
        toast={{ id: 8, text: 'Hi', kind: 'info' }}
        onDismiss={() => {}}
      />,
    ),
  ).not.toThrow()
})
