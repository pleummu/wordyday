// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import Banner from './Banner'

afterEach(cleanup)

function renderBanner(
  props: Partial<React.ComponentProps<typeof Banner>> = {},
) {
  const onSeeResult = vi.fn()
  const onPlayAgain = vi.fn()
  const view = render(
    <Banner
      status="won"
      answer="crane"
      attemptsUsed={4}
      busy={false}
      onSeeResult={onSeeResult}
      onPlayAgain={onPlayAgain}
      {...props}
    />,
  )
  return { ...view, onSeeResult, onPlayAgain }
}

it('win says Solved in n with no body', () => {
  const { container } = renderBanner()
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
    'Solved in 4',
  )
  expect(container.querySelector('.banner-body')).toBeNull()
})

it('loss says The word was ANSWER', () => {
  renderBanner({ status: 'lost', answer: 'crane' })
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
    'The word was CRANE',
  )
})

it('gave-up has a heading and the answer body', () => {
  const { container } = renderBanner({ status: 'gave-up' })
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
    'You gave up',
  )
  expect(container.querySelector('.banner-body')!.textContent).toBe(
    'The word was CRANE',
  )
})

it('has See result then Play again, each calling its prop once', () => {
  const { onSeeResult, onPlayAgain } = renderBanner()
  const buttons = screen.getAllByRole('button')
  expect(buttons.map((b) => b.textContent)).toEqual([
    'See result',
    'Play again',
  ])
  expect(buttons[0].hasAttribute('data-see-result')).toBe(true)
  expect(buttons[0].hasAttribute('data-own-enter')).toBe(true)
  expect(buttons[1].hasAttribute('data-own-enter')).toBe(true)
  fireEvent.click(buttons[0])
  expect(onSeeResult).toHaveBeenCalledTimes(1)
  expect(onPlayAgain).not.toHaveBeenCalled()
  fireEvent.click(buttons[1])
  expect(onPlayAgain).toHaveBeenCalledTimes(1)
})

it('busy disables both buttons', () => {
  renderBanner({ busy: true })
  for (const b of screen.getAllByRole('button')) {
    expect((b as HTMLButtonElement).disabled).toBe(true)
  }
})

it('is not a live region and takes no focus on mount', () => {
  const { container } = renderBanner()
  expect(container.querySelector('section')!.hasAttribute('aria-live')).toBe(
    false,
  )
  expect(document.activeElement).toBe(document.body)
})
