// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { stubDialog } from '../test/stubDialog'
import Modal from './Modal'

beforeAll(() => {
  stubDialog()
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
})
afterEach(cleanup)

function Sample({
  open,
  onClose = () => {},
  fallbackFocus,
}: {
  open: boolean
  onClose?: () => void
  fallbackFocus?: () => HTMLElement | null
}) {
  return (
    <>
      <button>opener</button>
      <Modal
        open={open}
        onClose={onClose}
        titleId="t"
        bodyId="b"
        fallbackFocus={fallbackFocus}
      >
        <h2 id="t">Title</h2>
        <p id="b">Body</p>
        <button data-initial-focus>first</button>
        <button>last</button>
      </Modal>
    </>
  )
}

it('opens, labels itself and focuses the initial control', () => {
  render(<Sample open />)
  const dialog = document.querySelector('dialog')!
  expect(dialog.hasAttribute('open')).toBe(true)
  expect(dialog.getAttribute('aria-labelledby')).toBe('t')
  expect(dialog.getAttribute('aria-describedby')).toBe('b')
  expect(document.activeElement).toBe(screen.getByText('first'))
})

it('Esc and backdrop clicks close; card clicks do not', () => {
  const onClose = vi.fn()
  render(<Sample open onClose={onClose} />)
  const dialog = document.querySelector('dialog')!
  const cancel = new Event('cancel', { cancelable: true })
  dialog.dispatchEvent(cancel)
  expect(cancel.defaultPrevented).toBe(true)
  expect(onClose).toHaveBeenCalledTimes(1)
  fireEvent.click(dialog)
  expect(onClose).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByText('Body'))
  expect(onClose).toHaveBeenCalledTimes(2)
})

it('wraps Tab and Shift+Tab', () => {
  render(<Sample open />)
  const first = screen.getByText('first')
  const last = screen.getByText('last')
  last.focus()
  fireEvent.keyDown(last, { key: 'Tab' })
  expect(document.activeElement).toBe(first)
  fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
  expect(document.activeElement).toBe(last)
})

it('closes and returns focus to the opener', () => {
  const { rerender } = render(<Sample open={false} />)
  const opener = screen.getByText('opener')
  opener.focus()
  rerender(<Sample open />)
  expect(document.activeElement).toBe(screen.getByText('first'))
  rerender(<Sample open={false} />)
  expect(document.querySelector('dialog')!.hasAttribute('open')).toBe(false)
  expect(document.activeElement).toBe(opener)
})

it('uses fallbackFocus when the opener was body', () => {
  const fb = () => screen.getByText('opener')
  const { rerender } = render(<Sample open={false} fallbackFocus={fb} />)
  rerender(<Sample open fallbackFocus={fb} />)
  rerender(<Sample open={false} fallbackFocus={fb} />)
  expect(document.activeElement).toBe(screen.getByText('opener'))
})

it('does not steal focus when focus has moved elsewhere', () => {
  const { rerender } = render(<Sample open={false} />)
  rerender(<Sample open />)
  const opener = screen.getByText('opener')
  opener.focus()
  rerender(<Sample open={false} />)
  expect(document.activeElement).toBe(opener)
})
