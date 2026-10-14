import { expect, test } from '@playwright/test'
import {
  fixAnswers,
  guess,
  guessAll,
  resultDialog,
  waitForReady,
  waitForResult,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
})

test('announces each guess after the reveal, not while typing', async ({
  page,
}) => {
  const region = page.locator('#live-region')
  await expect(region).toHaveText('')
  await page.keyboard.type('gho')
  await expect(region).toHaveText('')
  for (let i = 0; i < 3; i++) await page.keyboard.press('Backspace')
  await expect(region).toHaveText('')
  await guess(page, 'house', 1)
  await expect(region).toHaveText(
    'HOUSE: H absent, O absent, U absent, S absent, E correct. 5 tries left.',
  )
  await expect(
    page.getByRole('gridcell', { name: 'Row 1, column 5, letter E, correct' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'E, correct' })).toBeVisible()
})

test('a win appends the result line', async ({ page }) => {
  await guessAll(page, ['house', 'crane'])
  await expect(page.locator('#live-region')).toHaveText(
    'CRANE: C correct, R correct, A correct, N correct, E correct. You won in 2.',
  )
  await waitForResult(page)
  await expect(resultDialog(page).locator('.result-heading')).not.toContainText(
    'You won in 2.',
  )
})

test('Give Up announces the forfeit line', async ({ page }) => {
  await guessAll(page, ['house', 'ghost', 'plant', 'mouse'])
  await page.getByRole('button', { name: 'Give up' }).click()
  await page
    .getByRole('dialog', { name: 'Give up?' })
    .getByRole('button', { name: 'Give up' })
    .click()
  await waitForResult(page)
  const region = page.locator('#live-region')
  const line = 'You gave up. The word was CRANE.'
  await expect(region).toHaveText(line)
  expect(await region.evaluate((el) => el.matches(':popover-open'))).toBe(true)
  await expect(
    page.getByRole('status').filter({ hasText: line }),
  ).toHaveCount(1)
})
