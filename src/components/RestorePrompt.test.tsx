// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { stubDialog } from '../test/stubDialog'
import { useGameStore } from '../state/gameStore'
import RestorePrompt from './RestorePrompt'

beforeAll(() => {
  stubDialog()
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
})
afterEach(cleanup)

function seed(status = 'playing') {
  const restore = vi.fn()
  const declineRestore = vi.fn()
  useGameStore.setState({
    pendingRestore: { streak: 12, missed: 1, creditDeferred: false },
    restores: { month: '2026-06', used: 1 },
    today: '2026-06-03',
    status,
    restore,
    declineRestore,
  } as never)
  return { restore, declineRestore }
}

it('EC-43 prompt text counts the Restores left before use', () => {
  seed()
  render(<RestorePrompt />)
  const dialog = document.querySelector('dialog')!
  expect(dialog.hasAttribute('open')).toBe(true)
  expect(dialog.textContent).toContain(
    'Your 12-day streak broke. Restore it? (2 left this month)',
  )
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Restore', hidden: true }),
  )
})

it('Esc does not answer; each button calls its action', () => {
  const { restore, declineRestore } = seed()
  render(<RestorePrompt />)
  const dialog = document.querySelector('dialog')!
  const cancel = new Event('cancel', { cancelable: true })
  dialog.dispatchEvent(cancel)
  expect(cancel.defaultPrevented).toBe(true)
  expect(restore).not.toHaveBeenCalled()
  expect(declineRestore).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'No', hidden: true }))
  expect(declineRestore).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Restore', hidden: true }))
  expect(restore).toHaveBeenCalledTimes(1)
})

it('D-21 not rendered while revealing, shown once the reveal ends', () => {
  seed('revealing')
  render(<RestorePrompt />)
  expect(document.querySelector('dialog')!.hasAttribute('open')).toBe(false)
  act(() => {
    useGameStore.setState({ status: 'playing' })
  })
  expect(document.querySelector('dialog')!.hasAttribute('open')).toBe(true)
})
