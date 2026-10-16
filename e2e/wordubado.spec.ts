import { expect, test } from '@playwright/test'
import {
  fixAnswers,
  fixAnswersWith,
  guess,
  selectLength,
  slangWords,
  closeResult,
  dismissInfo,
  resultDialog,
  waitForResult,
  turnOnWordubado,
  waitForReady,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

const wordubadoSwitch = (page: import('@playwright/test').Page) =>
  page.getByRole('switch', { name: 'Wordubado' })

test('starts in Normal with the Wordubado switch off and Settings and Statistics buttons and no help button', async ({
  page,
}) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Statistics', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /help/i })).toHaveCount(0)
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
  await waitForResult(page)
  await expect(
    resultDialog(page).getByRole('heading', { name: 'You got it in 1/6!' }),
  ).toBeVisible()

  await resultDialog(page).getByRole('button', { name: 'Play again' }).click()
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
    await waitForResult(page)
    await expect(
      resultDialog(page).getByRole('heading', { name: /^You got it in 1\// }),
    ).toBeVisible()
    await closeResult(page)
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

const info = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: "What's Wordubado?" })

test('mid-game mode switch is immediate and keeps the Normal game', async ({
  page,
}) => {
  await startedGame(page)
  await wordubadoSwitch(page).click()
  await dismissInfo(page)
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'true')
  await waitForReady(page)
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, empty/ }),
  ).toBeVisible()
  await wordubadoSwitch(page).click()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'false')
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, letter H, / }),
  ).toBeVisible()
})

test('focus returns to the switch after closing the popup with Esc', async ({
  page,
}) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await wordubadoSwitch(page).focus()
  await page.keyboard.press('Space')
  await expect(info(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(info(page)).toBeHidden()
  await expect(wordubadoSwitch(page)).toBeFocused()
})

test('(i) opens the popup in Normal and Esc returns focus to (i)', async ({
  page,
}) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  const button = page.getByRole('button', { name: 'About Wordubado' })
  await button.click()
  await expect(info(page)).toBeVisible()
  await expect(
    info(page).getByText('Heads up: some words are mildly crude.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Got it' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(info(page)).toBeHidden()
  await expect(button).toBeFocused()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'false')
})

test('popup auto-opens only on the first enable', async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await turnOnWordubado(page)
  await wordubadoSwitch(page).click()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'false')
  await expect(info(page)).toHaveCount(0)
  await waitForReady(page)
  await wordubadoSwitch(page).click()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'true')
  await waitForReady(page)
  await expect(info(page)).toBeHidden()
})

test('keys pressed while the popup is open do not reach the game', async ({
  page,
}) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await page.getByRole('button', { name: 'About Wordubado' }).click()
  await expect(info(page)).toBeVisible()
  await page.keyboard.type('abc')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Escape')
  await expect(info(page)).toBeHidden()
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, empty/ }),
  ).toBeVisible()
})

test('Enter on the focused Wordubado switch submits the guess and keeps the mode; Space toggles', async ({
  page,
}) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  const sw = wordubadoSwitch(page)
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  await dismissInfo(page)
  await expect(sw).toBeFocused()

  await guess(page, 'house', 1)
  await expect(sw).toHaveAttribute('aria-checked', 'true')

  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toHaveAttribute('aria-checked', 'false')
})
