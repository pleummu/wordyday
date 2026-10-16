import { expect, test } from '@playwright/test'
import { fixAnswers, waitForReady } from './helpers.ts'

async function setup(page: import('@playwright/test').Page) {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
}

test.describe('full motion', () => {
  test.beforeEach(async ({ page }) => setup(page))

  test('input is blocked during reveal', async ({ page }) => {
    await page.keyboard.type('house')
    await page.keyboard.press('Enter')
    await page.keyboard.type('slate')
    await expect(
      page.getByRole('gridcell', {
        name: /^Row 1, column 5, letter E, (correct|present|absent)$/,
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('gridcell', { name: 'Row 2, column 1, empty' }),
    ).toBeVisible()
  })

  test('keys update after the flip', async ({ page }) => {
    await page.keyboard.type('house')
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('button', { name: 'H', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^H, (correct|present|absent)$/ }),
    ).toBeVisible()
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test.beforeEach(async ({ page }) => setup(page))

  test('reduced motion disables tile animations', async ({ page }) => {
    await page.keyboard.type('house')
    await page.keyboard.press('Enter')
    const tile = page.getByRole('gridcell', {
      name: /^Row 1, column 5, letter E, (correct|present|absent)$/,
    })
    await expect(tile).toBeVisible({ timeout: 600 })
    const name = await tile.evaluate((el) => getComputedStyle(el).animationName)
    expect(name).not.toBe('flip')
  })
})
