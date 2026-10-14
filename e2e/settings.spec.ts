import { expect, test } from '@playwright/test'
import {
  cell,
  fixAnswers,
  guess,
  turnOnWordubado,
  waitForReady,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
})

test('Settings shows the browser-only note', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Settings' })
  await button.click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByText(
      'Your progress is saved in this browser only. Clearing site data or using another device starts fresh.',
    ),
  ).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(button).toBeFocused()
})

test('Reset needs a confirm and Cancel goes back to Settings', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Reset my data' }).click()
  const dialog = page.getByRole('dialog', { name: 'Reset all data?' })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByText(
      "This clears every game, your stats, streaks and Restores. It can't be undone.",
    ),
  ).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Reset my data' }),
  ).toBeFocused()
})

test('Reset makes the app a first visit', async ({ page }) => {
  await guess(page, 'house', 1)
  await turnOnWordubado(page)
  await guess(page, 'house', 1)
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Reset my data' }).click()
  await page
    .getByRole('dialog', { name: 'Reset all data?' })
    .getByRole('button', { name: 'Reset', exact: true })
    .click()
  await expect(page.locator('.toast[role=status]')).toContainText(
    'All data reset',
  )
  await expect(page.getByRole('switch', { name: 'Wordubado' })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  await expect(page.getByRole('radio', { name: '5 letters' })).toBeChecked()
  await waitForReady(page)
  await expect(cell(page, 1, 1)).toHaveAccessibleName(/^Row 1, column 1, empty/)
  await page.reload()
  await waitForReady(page)
  await expect(page.getByRole('radio', { name: '5 letters' })).toBeChecked()
  await expect(cell(page, 1, 1)).toHaveAccessibleName(/^Row 1, column 1, empty/)
  expect(
    await page.evaluate(() => localStorage.getItem('unlimited-wordle:corrupt')),
  ).toBeNull()
  await turnOnWordubado(page, { firstTime: true })
})

test('keys typed while Settings is open do not reach the game', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.keyboard.type('abc')
  await page.keyboard.press('Escape')
  await expect(cell(page, 1, 1)).toHaveAccessibleName(/^Row 1, column 1, empty/)
})
