import { expect, test } from '@playwright/test'
import { fixAnswers, guess, waitForReady } from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
})

test('invalid word shakes without using an attempt', async ({ page }) => {
  await page.keyboard.type('zzzzz')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toHaveText('Not in word list')
  await expect(page.locator('[data-shake]')).toHaveCount(1)
  await expect(
    page.getByRole('gridcell', { name: 'Row 1, column 1, letter Z' }),
  ).toBeVisible()

  for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace')
  await page.keyboard.type('ab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toHaveText('Not enough letters')

  for (let i = 0; i < 2; i++) await page.keyboard.press('Backspace')
  await guess(page, 'house', 1)
  await expect(page.locator('[data-shake]')).toHaveCount(0)
})
