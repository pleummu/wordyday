import { expect, test, type BrowserContext } from '@playwright/test'
import {
  cell,
  fixAnswers,
  fixAnswersWith,
  guess,
  selectLength,
  waitForReady,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

const OTHER = 'Updated from your other tab.'

type TabBOption = 'same' | 'none' | Partial<Record<4 | 5 | 6, string>>

async function twoTabs(context: BrowserContext, opts: { b?: TabBOption } = {}) {
  const bOpt = opts.b ?? 'same'
  const a = await context.newPage()
  const b = await context.newPage()
  await fixAnswers(a)
  if (bOpt === 'same') await fixAnswers(b)
  else if (bOpt !== 'none') await fixAnswersWith(b, bOpt)
  await a.goto('/')
  await waitForReady(a)
  await b.goto('/')
  await waitForReady(b)
  return { a, b }
}

test('a guess in one tab updates the other tab on the same Board', async ({
  context,
}) => {
  const { a, b } = await twoTabs(context)
  await guess(a, 'house', 1)
  await expect(b.getByText(OTHER)).toBeVisible()
  await expect(cell(b, 1, 1)).toHaveAccessibleName(
    /^Row 1, column 1, letter H, /,
  )
})

test('changes to another Board are silent', async ({ context }) => {
  const { a, b } = await twoTabs(context)
  await selectLength(a, 4)
  await guess(a, 'word', 1)
  await expect(
    b.getByRole('radio', { name: '4 letters, game in progress' }),
  ).toBeAttached()
  // Positive condition: the in-progress dot and any toast come from the same
  // store set, so once the dot is attached the event has been handled.
  await expect(b.getByText(OTHER)).toHaveCount(0)
  await expect(b.getByRole('radio', { name: /^5 letters/ })).toBeChecked()
})

test('a reset in one tab resets the other', async ({ context }) => {
  const { a, b } = await twoTabs(context)
  await guess(a, 'house', 1)
  await expect(cell(b, 1, 1)).toHaveAccessibleName(
    /^Row 1, column 1, letter H, /,
  )
  await a.getByRole('button', { name: 'Settings' }).click()
  await a.getByRole('button', { name: 'Reset my data' }).click()
  await a
    .getByRole('dialog', { name: 'Reset all data?' })
    .getByRole('button', { name: 'Reset', exact: true })
    .click()
  await expect(cell(b, 1, 1)).toHaveAccessibleName(/^Row 1, column 1, empty/)
  await expect(b.getByText(OTHER)).toBeVisible()
})

test('a finished game is not re-finished', async ({ context }) => {
  const { a, b } = await twoTabs(context)
  await guess(a, 'crane', 1)
  await expect(b.getByText('You got it in 1 of 6')).toBeVisible()
  await expect(b.getByRole('button', { name: 'Play again' })).not.toBeFocused()
})

test('Play again in one tab moves the other tab to the same new game', async ({
  context,
}) => {
  const { a, b } = await twoTabs(context, { b: 'none' })
  await guess(a, 'crane', 1)
  await expect(b.getByText('You got it in 1 of 6')).toBeVisible()
  await a.getByRole('button', { name: 'Play again' }).click()
  await waitForReady(a)
  await expect(a.getByText(OTHER)).toHaveCount(0)
  await expect(b.getByText(OTHER)).toBeVisible()
  await expect(cell(b, 1, 1)).toHaveAccessibleName(/^Row 1, column 1, empty/)
  await waitForReady(b)
  await guess(a, 'crane', 1)
  await expect(a.getByText('You got it in 1 of 6')).toBeVisible()
  await expect(b.getByText('You got it in 1 of 6')).toBeVisible()
})

test('New game in one tab moves the other tab to the same new game', async ({
  context,
}) => {
  const { a, b } = await twoTabs(context, { b: 'none' })
  for (const [i, w] of ['house', 'ghost', 'plant', 'brick'].entries()) {
    await guess(a, w, i + 1)
  }
  await a.getByRole('button', { name: 'New game' }).click()
  await a
    .getByRole('dialog', { name: 'New game?' })
    .getByRole('button', { name: 'New game' })
    .click()
  await waitForReady(a)
  await expect(cell(b, 1, 1)).toHaveAccessibleName(/^Row 1, column 1, empty/)
  await waitForReady(b)
  await expect(a.getByText(OTHER)).toHaveCount(0)
  await guess(a, 'crane', 1)
  await expect(a.getByText('You got it in 1 of 6')).toBeVisible()
  await expect(b.getByText('You got it in 1 of 6')).toBeVisible()
})

test('a reset in one tab leaves both tabs on the same game', async ({
  context,
}) => {
  const { a, b } = await twoTabs(context, { b: { 5: 'slate' } })
  await guess(a, 'house', 1)
  await expect(cell(b, 1, 1)).toHaveAccessibleName(
    /^Row 1, column 1, letter H, /,
  )
  await a.getByRole('button', { name: 'Settings' }).click()
  await a.getByRole('button', { name: 'Reset my data' }).click()
  await a
    .getByRole('dialog', { name: 'Reset all data?' })
    .getByRole('button', { name: 'Reset', exact: true })
    .click()
  await expect(cell(b, 1, 1)).toHaveAccessibleName(/^Row 1, column 1, empty/)
  await expect(b.getByText(OTHER)).toBeVisible()
  await waitForReady(a)
  await waitForReady(b)
  await expect
    .poll(() =>
      a.evaluate(
        () =>
          JSON.parse(localStorage.getItem('unlimited-wordle')!).state.boards[
            'normal-5'
          ].answer as string,
      ),
    )
    .toBe('crane')
  // Closing Settings returns focus to its button, so Enter would reopen
  // Settings instead of submitting. Move focus off it, as a user would.
  await a.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await guess(a, 'crane', 1)
  await expect(a.getByText('You got it in 1 of 6')).toBeVisible()
  await expect(b.getByText('You got it in 1 of 6')).toBeVisible()
})
