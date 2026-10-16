import { expect, test } from '@playwright/test'
import {
  fixAnswers,
  guess,
  guessAll,
  selectLength,
  waitForReady,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
})

test('refresh keeps submitted guesses and drops the half-typed row', async ({
  page,
}) => {
  await guess(page, 'house', 1)
  await page.keyboard.type('cr')
  await page.reload()
  await waitForReady(page)
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, letter H, / }),
  ).toBeVisible()
  await expect(
    page.getByRole('gridcell', { name: /^Row 2, column 1, empty/ }),
  ).toBeVisible()
  await guess(page, 'crane', 2)
  await expect(page.getByText('You got it in 2 of 6')).toBeVisible()
})

test('a finished Board comes back finished after refresh', async ({ page }) => {
  await guess(page, 'crane', 1)
  await expect(page.getByText('You got it in 1 of 6')).toBeVisible()
  await page.reload()
  await expect(page.getByText('You got it in 1 of 6')).toBeVisible()
  const again = page.getByRole('button', { name: 'Play again' })
  await expect(again).toBeVisible()
  await expect(again).not.toBeFocused()
  await expect(
    page.getByRole('gridcell', {
      name: /^Row 1, column 5, letter E, correct$/,
    }),
  ).toBeVisible()
  await again.click()
  await waitForReady(page)
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, empty/ }),
  ).toBeVisible()
})

test('a refresh reopens the last Board played', async ({ page }) => {
  await selectLength(page, 4)
  await guess(page, 'word', 1)
  await page.reload()
  await expect(page.getByRole('radio', { name: '4 letters' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, letter W, / }),
  ).toBeVisible()
})

test('a refresh mid-loss cannot dodge the loss', async ({ page }) => {
  await guessAll(page, ['house', 'ghost', 'plant', 'mouse', 'light', 'sound'])
  await page.reload()
  await expect(page.getByText('The word was CRANE')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible()
})
