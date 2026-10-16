// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import LengthPicker from './LengthPicker'

afterEach(cleanup)

it('marks another in-progress length with a hidden dot and a screen reader label', () => {
  const { container } = render(
    <LengthPicker
      value={5}
      disabled={false}
      inProgress={{ 4: true }}
      onChange={() => {}}
    />,
  )
  expect(
    screen.getByRole('radio', { name: '4 letters, game in progress' }),
  ).toBeTruthy()
  expect(screen.getByRole('radio', { name: '5 letters' })).toBeTruthy()
  expect(screen.getByRole('radio', { name: '6 letters' })).toBeTruthy()
  const dots = container.querySelectorAll('.length-dot')
  expect(dots).toHaveLength(1)
  expect(dots[0].getAttribute('aria-hidden')).toBe('true')
})

it('never shows a dot on the selected length', () => {
  const { container } = render(
    <LengthPicker
      value={5}
      disabled={false}
      inProgress={{ 5: true }}
      onChange={() => {}}
    />,
  )
  expect(container.querySelectorAll('.length-dot')).toHaveLength(0)
  expect(screen.getByRole('radio', { name: '5 letters' })).toBeTruthy()
})

it('keeps aria-checked and roving tabIndex', () => {
  render(
    <LengthPicker
      value={6}
      disabled={false}
      inProgress={{}}
      onChange={() => {}}
    />,
  )
  const r6 = screen.getByRole('radio', { name: '6 letters' })
  const r4 = screen.getByRole('radio', { name: '4 letters' })
  expect(r6.getAttribute('aria-checked')).toBe('true')
  expect(r6.tabIndex).toBe(0)
  expect(r4.getAttribute('aria-checked')).toBe('false')
  expect(r4.tabIndex).toBe(-1)
})
