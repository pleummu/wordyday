import { expect, test } from '@playwright/test'
import {
  cell,
  fixAnswers,
  guess,
  selectLength,
  turnOnWordubado,
  waitForReady,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
})

const endDialog = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: 'End this game?' })
const infoDialog = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: "What's Wordubado?" })
const wordubadoSwitch = (page: import('@playwright/test').Page) =>
  page.getByRole('switch', { name: 'Wordubado' })

test('switching length never ends a game', async ({ page }) => {
  await guess(page, 'house', 1)
  await selectLength(page, 4)
  await expect(endDialog(page)).toHaveCount(0)
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, empty/ }),
  ).toBeVisible()
  await guess(page, 'word', 1)
  await selectLength(page, 5)
  await expect(endDialog(page)).toHaveCount(0)
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, letter H, / }),
  ).toBeVisible()
  await selectLength(page, 4)
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, letter W, / }),
  ).toBeVisible()
  await expect(endDialog(page)).toHaveCount(0)
})

test('switching mode never ends a game and the popup only auto-opens once', async ({
  page,
}) => {
  await guess(page, 'house', 1)
  await turnOnWordubado(page)
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, empty/ }),
  ).toBeVisible()
  await wordubadoSwitch(page).click()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'false')
  await expect(
    page.getByRole('gridcell', { name: /^Row 1, column 1, letter H, / }),
  ).toBeVisible()
  await turnOnWordubado(page, { firstTime: false })
  await expect(infoDialog(page)).toHaveCount(0)
  await page.reload()
  await waitForReady(page)
  await wordubadoSwitch(page).click()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'false')
  await waitForReady(page)
  await wordubadoSwitch(page).click()
  await expect(wordubadoSwitch(page)).toHaveAttribute('aria-checked', 'true')
  await expect(infoDialog(page)).toHaveCount(0)
})

test('length picker marks other lengths with a game in progress', async ({
  page,
}) => {
  await selectLength(page, 4)
  await guess(page, 'word', 1)
  await selectLength(page, 5)
  await expect(
    page.getByRole('radio', { name: '4 letters, game in progress' }),
  ).toBeVisible()
  await expect(
    page.getByRole('radio', { name: '6 letters, game in progress' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('radio', { name: '5 letters, game in progress' }),
  ).toHaveCount(0)
})

test('a finished Board stays finished after switching away and back', async ({
  page,
}) => {
  await guess(page, 'crane', 1)
  await expect(page.getByText('You got it in 1 of 6')).toBeVisible()
  await selectLength(page, 4)
  await expect(cell(page, 1, 1)).toBeVisible()
  await page.getByRole('radio', { name: /^5 letters/ }).click()
  await expect(page.getByText('You got it in 1 of 6')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible()
})
