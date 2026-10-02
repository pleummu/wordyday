// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { stubDialog } from '../test/stubDialog'
import type { Pools } from '../data/wordData'

const pools: Pools = {
  answers: ['crane'],
  slang: ['bruhs'],
  guesses: new Set(['crane', 'house', 'bruhs']),
}

const loadPools = vi.hoisted(() => vi.fn())
vi.mock('../data/wordData', () => ({ loadPools }))

import App from '../App'
import { useGameStore } from '../state/gameStore'

beforeAll(stubDialog)

beforeEach(async () => {
  useGameStore.setState({ pendingSwitch: null, infoOpen: false })
  loadPools.mockReset()
  loadPools.mockImplementation(() => Promise.resolve(pools))
  await useGameStore.getState().startGame(5, 'normal')
})

afterEach(cleanup)

function getSwitch(): HTMLElement {
  return screen.getByRole('switch', { name: 'Wordubado' })
}

it('renders an off Wordubado switch by default', () => {
  render(<App />)
  expect(getSwitch().getAttribute('aria-checked')).toBe('false')
  expect(document.querySelector('.app')?.getAttribute('data-mode')).toBe(
    'normal',
  )
})

it('toggles Wordubado on and off', async () => {
  render(<App />)
  await act(async () => {
    fireEvent.click(getSwitch())
  })
  expect(getSwitch().getAttribute('aria-checked')).toBe('true')
  expect(useGameStore.getState().mode).toBe('wordubado')
  expect(document.querySelector('.app')?.getAttribute('data-mode')).toBe(
    'wordubado',
  )
  await act(async () => {
    fireEvent.click(getSwitch())
  })
  expect(getSwitch().getAttribute('aria-checked')).toBe('false')
  expect(useGameStore.getState().mode).toBe('normal')
})

it('ignores clicks while revealing', () => {
  render(<App />)
  act(() => {
    useGameStore.setState({ status: 'revealing' })
  })
  expect(getSwitch().getAttribute('aria-disabled')).toBe('true')
  fireEvent.click(getSwitch())
  expect(useGameStore.getState().mode).toBe('normal')
})

it('shows no help, stats or settings buttons and keeps an empty actions slot', () => {
  render(<App />)
  expect(
    screen.queryByRole('button', { name: /help|stats|settings/i }),
  ).toBeNull()
  const slot = document.querySelector('.header-actions')
  expect(slot).toBeTruthy()
  expect(slot?.childElementCount).toBe(0)
})

it('does not submit a guess when Enter is pressed on the focused switch', () => {
  render(<App />)
  for (const k of 'crane') fireEvent.keyDown(window, { key: k })
  const sw = getSwitch()
  expect(sw.hasAttribute('data-own-enter')).toBe(true)
  sw.focus()
  fireEvent.keyDown(sw, { key: 'Enter' })
  expect(useGameStore.getState().rows).toHaveLength(0)
})

it('(i) button opens the Wordubado info popup', () => {
  render(<App />)
  const info = screen.getByRole('button', { name: 'About Wordubado' })
  expect(info.getAttribute('aria-haspopup')).toBe('dialog')
  fireEvent.click(info)
  expect(document.querySelectorAll('dialog[open]')).toHaveLength(1)
  expect(
    screen.getByRole('heading', { name: "What's Wordubado?" }),
  ).toBeTruthy()
  expect(
    screen.getByText('Heads up: some words are mildly crude.'),
  ).toBeTruthy()
  expect(screen.getByText(/Wordle with the slang turned up/)).toBeTruthy()
})

it('Got it closes the popup', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'About Wordubado' }))
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
  expect(useGameStore.getState().infoOpen).toBe(false)
})
