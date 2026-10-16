import { expect, test } from '@playwright/test'
import { fixAnswers, guess, waitForReady } from './helpers.ts'

test('pool load error shows Try again and recovers', async ({ page }) => {
  await fixAnswers(page)
  await page.route('**/assets/words-5*.js', (route) => route.abort())
  await page.goto('/')
  await expect(
    page.getByText(
      "Couldn't load the word list. Check your connection and try again.",
    ),
  ).toBeVisible()
  await expect(page.getByRole('grid', { name: 'Guesses' })).toBeVisible()

  await page.unroute('**/assets/words-5*.js')
  // A failed chunk import is cached by the browser, so Try again reloads the page.
  await page.getByRole('button', { name: 'Try again' }).click()
  await waitForReady(page)
  await guess(page, 'house', 1)
})
