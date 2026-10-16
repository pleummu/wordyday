// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const lookupDefinition = vi.hoisted(() => vi.fn())
const cachedDefinition = vi.hoisted(() => vi.fn())
vi.mock('../logic/definition', () => ({ lookupDefinition, cachedDefinition }))

import DefinitionPanel from './DefinitionPanel'

const SENSES = [
  { pos: 'noun', text: 'A large bird.' },
  { pos: 'verb', text: 'To stretch.' },
]

beforeEach(() => {
  lookupDefinition.mockReset()
  cachedDefinition.mockReset()
  cachedDefinition.mockReturnValue(undefined)
})
afterEach(cleanup)

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

it('curated text renders alone with no lookup (D-08)', () => {
  render(
    <DefinitionPanel
      word="aight"
      focusOnMount={true}
      curated="A casual way of saying all right."
    />,
  )
  const r = screen.getByRole('region', { name: 'Definition' })
  const p = r.querySelectorAll('p.definition-curated')
  expect(p).toHaveLength(1)
  expect(p[0].textContent).toBe('A casual way of saying all right.')
  expect(r.querySelector('dl')).toBeNull()
  expect(r.textContent).not.toContain('Source: dictionaryapi.dev')
  expect(r.getAttribute('aria-busy')).toBeNull()
  expect(lookupDefinition).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(r)
})

it('shows loading with aria-busy while pending', () => {
  lookupDefinition.mockReturnValue(new Promise(() => {}))
  render(<DefinitionPanel word="crane" focusOnMount={false} />)
  const r = screen.getByRole('region', { name: 'Definition' })
  expect(r.getAttribute('aria-busy')).toBe('true')
  expect(r.textContent).toContain('Looking it up...')
})

it('renders senses and the credit on success', async () => {
  lookupDefinition.mockResolvedValue(SENSES)
  render(<DefinitionPanel word="crane" focusOnMount={false} />)
  expect(await screen.findByText('A large bird.')).toBeTruthy()
  expect(screen.getByText('noun').tagName).toBe('DT')
  expect(screen.getByText('To stretch.').tagName).toBe('DD')
  expect(screen.getByText('Source: dictionaryapi.dev')).toBeTruthy()
})

it('shows unavailable and Try again re-runs the lookup and focuses the region', async () => {
  const d = deferred<unknown>()
  lookupDefinition.mockRejectedValueOnce(new Error('x'))
  lookupDefinition.mockReturnValueOnce(d.promise)
  render(<DefinitionPanel word="crane" focusOnMount={false} />)
  expect(await screen.findByText('Definition unavailable')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(lookupDefinition).toHaveBeenCalledTimes(2)
  const r = screen.getByRole('region', { name: 'Definition' })
  expect(r.textContent).toContain('Looking it up...')
  expect(document.activeElement).toBe(r)
  await act(async () => d.resolve(SENSES))
  expect(screen.getByText('A large bird.')).toBeTruthy()
})

it('renders a cached result on first paint without a lookup', () => {
  cachedDefinition.mockReturnValue(SENSES)
  render(<DefinitionPanel word="crane" focusOnMount={false} />)
  expect(screen.getByText('A large bird.')).toBeTruthy()
  expect(lookupDefinition).not.toHaveBeenCalled()
})

it('focusOnMount controls whether the region takes focus', () => {
  lookupDefinition.mockReturnValue(new Promise(() => {}))
  const { unmount } = render(<DefinitionPanel word="crane" focusOnMount />)
  expect(document.activeElement).toBe(
    screen.getByRole('region', { name: 'Definition' }),
  )
  unmount()
  render(<DefinitionPanel word="crane" focusOnMount={false} />)
  expect(document.activeElement).toBe(document.body)
})

it('aborts the lookup signal on unmount', () => {
  lookupDefinition.mockReturnValue(new Promise(() => {}))
  const { unmount } = render(
    <DefinitionPanel word="crane" focusOnMount={false} />,
  )
  const signal = (
    lookupDefinition.mock.calls[0] as [string, { signal: AbortSignal }]
  )[1].signal
  expect(signal.aborted).toBe(false)
  unmount()
  expect(signal.aborted).toBe(true)
})
