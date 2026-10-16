import { expect, test } from '@playwright/test'
import {
  closeResult,
  fixAnswers,
  guess,
  resultDialog,
  selectLength,
  waitForReady,
  waitForResult,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
})

test('win a 5-letter game', async ({ page }) => {
  await guess(page, 'house', 1)
  await guess(page, 'crane', 2)

  await waitForResult(page)
  await expect(
    resultDialog(page).getByRole('heading', { name: 'You got it in 2/6!' }),
  ).toBeVisible()
  const playAgain = resultDialog(page).getByRole('button', {
    name: 'Play again',
  })
  await expect(playAgain).toBeFocused()

  await playAgain.click()
  await expect(
    page.getByRole('gridcell', { name: 'Row 1, column 1, empty' }),
  ).toBeVisible()
})

test('lose a 4-letter game reveals the answer', async ({ page }) => {
  await selectLength(page, 4)
  const words = ['bird', 'fish', 'tree', 'lamp', 'song']
  for (const [i, word] of words.entries()) {
    await guess(page, word, i + 1)
  }

  await waitForResult(page)
  await closeResult(page)
  await expect(
    page.locator('.banner').getByText('The word was GOLD'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enter' })).toHaveCount(0)
})
