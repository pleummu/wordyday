// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGameStore } from '../state/gameStore'
import LiveRegion from './LiveRegion'

afterEach(() => {
  cleanup()
  useGameStore.setState({ announcement: null })
})

describe('LiveRegion', () => {
  it('is always mounted with live attributes and shows the text', () => {
    const { container } = render(<LiveRegion raiseKey={null} />)
    const el = container.querySelector('[role=status]')!
    expect(el.id).toBe('live-region')
    expect(el.getAttribute('popover')).toBe('manual')
    expect(el.getAttribute('aria-live')).toBe('polite')
    expect(el.getAttribute('aria-atomic')).toBe('true')
    expect(el.textContent).toBe('')
    act(() => useGameStore.setState({ announcement: { id: 1, text: 'Hi' } }))
    expect(el.textContent).toBe('Hi')
  })

  it('re-raises on raiseKey change', () => {
    const show = vi.fn()
    const hide = vi.fn()
    Object.assign(HTMLElement.prototype, {
      showPopover: show,
      hidePopover: hide,
    })
    const { rerender } = render(<LiveRegion raiseKey={null} />)
    expect(show).toHaveBeenCalledTimes(1)
    rerender(<LiveRegion raiseKey="result" />)
    expect(show).toHaveBeenCalledTimes(2)
    // jsdom lacks :popover-open, so the guard falls through without throwing.
    delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover
    delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover
  })
})
