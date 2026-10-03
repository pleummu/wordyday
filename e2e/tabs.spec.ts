import { expect, test, type BrowserContext } from '@playwright/test'
import {
  cell,
  fixAnswers,
  guess,
  selectLength,
  waitForReady,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

const OTHER = 'Updated from your other tab.'

async function twoTabs(context: BrowserContext) {
  const a = await context.newPage()
  const b = await context.newPage()
  await fixAnswers(a)
  await fixAnswers(b)
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
  await b.waitForTimeout(300)
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
