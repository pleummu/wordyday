import { expect, test, type Page } from '@playwright/test'
import { fixAnswers, guess, waitForReady } from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

const SEED = '{"state":{"boards":"x"},"version":1}'
const STORAGE_TOAST =
  "Saving isn't working in this browser. Your progress will be lost when you close this tab."

async function playTwoGuesses(page: Page) {
  await guess(page, 'house', 1)
  await guess(page, 'crane', 2)
  await expect(page.getByText('You got it in 2 of 6')).toBeVisible()
}

test('corrupt saved data starts fresh with a notice', async ({ page }) => {
  await page.addInitScript((seed) => {
    if (sessionStorage.getItem('seeded') === null) {
      localStorage.setItem('unlimited-wordle', seed)
      sessionStorage.setItem('seeded', '1')
    }
  }, SEED)
  await fixAnswers(page)
  await page.goto('/')
  await expect(
    page.getByText("We couldn't read your saved games, so we started fresh."),
  ).toBeVisible()
  await waitForReady(page)
  await guess(page, 'crane', 1)
  await expect(page.getByText('You got it in 1 of 6')).toBeVisible()
  expect(
    await page.evaluate(() => localStorage.getItem('unlimited-wordle:corrupt')),
  ).toBe(SEED)
  await page.reload()
  await expect(page.getByText("We couldn't read your saved games")).toHaveCount(
    0,
  )
  await expect(page.getByText('You got it in 1 of 6')).toBeVisible()
})

test('blocked storage still plays in memory', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError')
      },
    })
  })
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await expect(page.getByText(STORAGE_TOAST)).toBeVisible()
  await playTwoGuesses(page)
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(
    page.getByText(
      "Saving isn't working in this browser right now, so this session won't be kept.",
    ),
  ).toBeVisible()
})

test('full storage still plays in memory', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('full', 'QuotaExceededError')
    }
  })
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await expect(page.getByText(STORAGE_TOAST)).toBeVisible()
  await playTwoGuesses(page)
  expect(await page.getByText(STORAGE_TOAST).count()).toBeLessThanOrEqual(1)
})

test('a save from a newer version is kept untouched (CR-01)', async ({
  page,
}) => {
  const NEWER = '{"state":{"future":true},"version":2}'
  const CORRUPT = "We couldn't read your saved games, so we started fresh."
  await page.addInitScript((seed) => {
    if (sessionStorage.getItem('seeded') === null) {
      localStorage.setItem('unlimited-wordle', seed)
      sessionStorage.setItem('seeded', '1')
    }
  }, NEWER)
  await fixAnswers(page)
  await page.goto('/')
  await expect(page.getByText(STORAGE_TOAST)).toBeVisible()
  await expect(page.getByText(CORRUPT)).toHaveCount(0)
  await waitForReady(page)
  await guess(page, 'house', 1)
  await guess(page, 'crane', 2)
  await expect(page.getByText('You got it in 2 of 6')).toBeVisible()
  await page.getByRole('button', { name: 'Play again' }).click()
  await waitForReady(page)
  expect(
    await page.evaluate(() => localStorage.getItem('unlimited-wordle')),
  ).toBe(NEWER)
  expect(
    await page.evaluate(() => localStorage.getItem('unlimited-wordle:corrupt')),
  ).toBeNull()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(
    page.getByText(
      "Saving isn't working in this browser right now, so this session won't be kept.",
    ),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.reload()
  expect(
    await page.evaluate(() => localStorage.getItem('unlimited-wordle')),
  ).toBe(NEWER)
  await expect(page.getByText(CORRUPT)).toHaveCount(0)
})
