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

async function startedGame(page: import('@playwright/test').Page) {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await guess(page, 'house', 1)
}

const dialog = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: 'End this game?' })

test('mid-game mode switch asks first; Keep playing keeps the game', async ({
  page,
}) => {
  await startedGame(page)
  await page.keyboard.type('cr')
  await wordubadoSwitch(page).click()
  await expect(dialog(page)).toBeVisible()
  await expect(
    dialog(page).getByText(
      'Switching to Wordubado ends your current game and starts a new one.',
    ),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused()
  await page.getByRole('button', { name: 'Keep playing' }).click()
  await expect(dialog(page)).toBeHidden()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'false')
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, letter H/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('gridcell', { name: /^Row 2, column 1, letter C/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('gridcell', { name: /^Row 2, column 2, letter R/ }),
  ).toBeVisible()
})

test('Start new game switches mode', async ({ page }) => {
  await startedGame(page)
  await wordubadoSwitch(page).click()
  await page.getByRole('button', { name: 'Start new game' }).click()
  await expect(dialog(page)).toBeHidden()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'true')
  await waitForReady(page)
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, empty/ }),
  ).toBeVisible()
})

test('mid-game length switch asks with the n letters copy; Esc cancels', async ({
  page,
}) => {
  await startedGame(page)
  await page.getByRole('radio', { name: '4 letters' }).click()
  await expect(
    dialog(page).getByText(
      'Switching to 4 letters ends your current game and starts a new one.',
    ),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await expect(page.getByRole('radio', { name: '5 letters' })).toBeChecked()
})

test('no prompt with only typed letters', async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await page.keyboard.type('ho')
  await wordubadoSwitch(page).click()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'true')
  await expect(dialog(page)).toHaveCount(0)
})

test('no prompt after the game is won', async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await guess(page, 'crane', 1)
  await expect(page.getByText('You got it in 1 of 6')).toBeVisible()
  await wordubadoSwitch(page).click()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'true')
  await expect(dialog(page)).toBeHidden()
})

test('keys pressed while the dialog is open do not reach the game', async ({
  page,
}) => {
  await startedGame(page)
  await wordubadoSwitch(page).click()
  await expect(dialog(page)).toBeVisible()
  await page.keyboard.type('abc')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await expect(
    page.getByRole('gridcell', { name: /^Row 2, column 1, empty/ }),
  ).toBeVisible()
})

test('focus returns to the switch after Esc', async ({ page }) => {
  await startedGame(page)
  await wordubadoSwitch(page).focus()
  await page.keyboard.press('Space')
  await expect(dialog(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await expect(wordubadoSwitch(page)).toBeFocused()
})
