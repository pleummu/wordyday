import { expect, test } from '@playwright/test'
import {
  cell,
  fixAnswers,
  guess,
  guessAll,
  selectLength,
  waitForReady,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
})

test('Give up appears only with exactly 2 tries left', async ({ page }) => {
  const giveUp = page.getByRole('button', { name: 'Give up' })
  const newGame = page.getByRole('button', { name: 'New game' })
  await expect(giveUp).toHaveCount(0)
  await expect(newGame).toHaveCount(0)
  await guessAll(page, ['house', 'ghost', 'plant'])
  await expect(giveUp).toHaveCount(0)
  await expect(newGame).toHaveCount(0)
  await guess(page, 'mouse', 4)
  await expect(giveUp).toBeVisible()
  await expect(newGame).toBeVisible()
})

test('Give up asks first; Keep playing and Esc keep the game', async ({
  page,
}) => {
  await guessAll(page, ['house', 'ghost', 'plant', 'mouse'])
  await page.getByRole('button', { name: 'Give up' }).click()
  const dialog = page.getByRole('dialog', { name: 'Give up?' })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByText('This counts as a loss. Reveal the answer?'),
  ).toBeVisible()
  const keep = dialog.getByRole('button', { name: 'Keep playing' })
  await expect(keep).toBeFocused()
  await keep.click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Give up' })).toBeVisible()
  await page.getByRole('button', { name: 'Give up' }).click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('confirming Give up reveals the answer and survives a refresh', async ({
  page,
}) => {
  await guessAll(page, ['house', 'ghost', 'plant', 'mouse'])
  await page.getByRole('button', { name: 'Give up' }).click()
  const dialog = page.getByRole('dialog', { name: 'Give up?' })
  await dialog.getByRole('button', { name: 'Give up' }).click()
  await expect(page.getByText('The word was CRANE')).toBeVisible()
  await expect(page.getByText('You gave up. Ready for another?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play again' })).toBeFocused()
  await expect(
    page.getByRole('gridcell', { name: /^Row 5, column 1, empty/ }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByText('You gave up. Ready for another?')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Play again' }),
  ).not.toBeFocused()
})

test('New game asks first and starts a fresh game', async ({ page }) => {
  await guessAll(page, ['house', 'ghost', 'plant', 'mouse'])
  await page.getByRole('button', { name: 'New game' }).click()
  const dialog = page.getByRole('dialog', { name: 'New game?' })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByText('This counts as a loss. Start a new game?'),
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'New game' }).click()
  await waitForReady(page)
  await expect(cell(page, 1, 1)).toHaveAccessibleName(/^Row 1, column 1, empty/)
  await expect(page.getByRole('button', { name: 'Give up' })).toHaveCount(0)
})

test('Give up works at 4 and 6 letters', async ({ page }) => {
  await selectLength(page, 4)
  await guessAll(page, ['word', 'bold', 'kind'])
  await expect(page.getByRole('button', { name: 'Give up' })).toBeVisible()
  await selectLength(page, 6)
  await guessAll(page, ['garden', 'silver', 'winter', 'button', 'pocket'])
  await expect(page.getByRole('button', { name: 'Give up' })).toBeVisible()
})
