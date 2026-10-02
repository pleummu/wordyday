import { expect, test } from '@playwright/test'
import {
  fixAnswers,
  fixAnswersWith,
  guess,
  selectLength,
  slangWords,
  turnOnWordubado,
  waitForReady,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

const wordubadoSwitch = (page: import('@playwright/test').Page) =>
  page.getByRole('switch', { name: 'Wordubado' })

test('starts in Normal with the Wordubado switch off and no help/stats/settings buttons', async ({
  page,
}) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'false')
  await expect(
    page.getByRole('button', { name: /help|stats|settings/i }),
  ).toHaveCount(0)
})

test('turning Wordubado on starts a game that can be won with a slang answer', async ({
  page,
}) => {
  const word = slangWords(5)[0]
  await fixAnswersWith(page, { 5: word })
  await page.goto('/')
  await waitForReady(page)
  await turnOnWordubado(page)

  await guess(page, word, 1)
  await expect(page.getByText('You got it in 1 of 6')).toBeVisible()

  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'true')
})

for (const n of [4, 6] as const) {
  test(`Wordubado works at ${n} letters`, async ({ page }) => {
    const word = slangWords(n)[0]
    await fixAnswersWith(page, { [n]: word })
    await page.goto('/')
    await waitForReady(page)
    await turnOnWordubado(page)
    await selectLength(page, n)
    await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'true')

    await guess(page, word, 1)
    await expect(page.getByText('You got it in 1 of')).toBeVisible()
  })
}

test('Normal accepts a slang word as a guess', async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  const word = slangWords(5).find((w) => w !== 'crane')!
  await guess(page, word, 1)
  await expect(page.getByText('Not in word list')).toHaveCount(0)
})
