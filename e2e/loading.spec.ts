import { expect, test } from '@playwright/test'
import { cell, fixAnswers, guess, waitForReady } from './helpers.ts'

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
  // A failed chunk import is cached by the browser, so Try again reloads the page
  // (online only). Saved games survive the reload.
  await page.getByRole('button', { name: 'Try again' }).click()
  await waitForReady(page)
  await guess(page, 'house', 1)
})

test('offline Try again keeps the error and the saved game', async ({
  page,
  context,
}) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await guess(page, 'house', 1)
  await page.route('**/assets/words-4*.js', (route) => route.abort())
  await page.getByRole('radio', { name: /^4 letters/ }).click()
  const errorText =
    "Couldn't load the word list. Check your connection and try again."
  await expect(page.getByText(errorText)).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText(errorText)).toBeVisible()
  await context.setOffline(false)
  await page.unroute('**/assets/words-4*.js')
  await page.getByRole('radio', { name: /^5 letters/ }).click()
  await expect(cell(page, 1, 1)).toHaveAccessibleName(
    /^Row 1, column 1, letter H, /,
  )
})
