import { expect, test, type Page } from '@playwright/test'
import { fixAnswers, guess, guessAll, waitForReady } from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

const WRONG6 = ['house', 'ghost', 'plant', 'mouse', 'trick', 'brown']

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
})

async function saved(page: Page) {
  const raw = await page.evaluate(() =>
    localStorage.getItem('unlimited-wordle'),
  )
  return JSON.parse(raw ?? 'null') as {
    version: number
    state: { stats: Record<string, Record<string, unknown>> }
  }
}

async function winOnce(page: Page) {
  await guess(page, 'crane', 1)
  await expect(page.getByText('You got it in 1 of 6')).toBeVisible()
}

async function playAgain(page: Page) {
  await page.getByRole('button', { name: 'Play again' }).click()
  await waitForReady(page)
}

test.describe('Win Streak (STRK-01, D-12)', () => {
  test('a win shows Win streak: 1 and a second win shows Win streak: 2', async ({
    page,
  }) => {
    await winOnce(page)
    await expect(page.locator('.banner')).toContainText('Win streak: 1')
    await playAgain(page)
    await winOnce(page)
    await expect(page.locator('.banner')).toContainText('Win streak: 2')
  })

  test('a loss after a win shows Win streak reset', async ({ page }) => {
    await winOnce(page)
    await playAgain(page)
    await guessAll(page, WRONG6)
    await expect(page.locator('.banner')).toContainText('Win streak reset')
  })

  test('a loss with no prior streak shows no streak line', async ({ page }) => {
    await guessAll(page, WRONG6)
    await expect(page.locator('.banner')).toBeVisible()
    await expect(page.getByText(/Win streak/)).toHaveCount(0)
  })

  test('Give Up after a win shows Win streak reset', async ({ page }) => {
    await winOnce(page)
    await playAgain(page)
    await guessAll(page, WRONG6.slice(0, 4))
    await page.getByRole('button', { name: 'Give up' }).click()
    const dialog = page.getByRole('dialog', { name: 'Give up?' })
    await dialog.getByRole('button', { name: 'Give up' }).click()
    await expect(page.locator('.banner')).toContainText('Win streak reset')
  })

  test('the counters are saved as a v2 document and a restored game shows no line', async ({
    page,
  }) => {
    await winOnce(page)
    await playAgain(page)
    await winOnce(page)
    const doc = await saved(page)
    expect(doc.version).toBe(2)
    const s = doc.state.stats['normal-5']
    expect(s.played).toBe(2)
    expect(s.wins).toBe(2)
    expect(s.winStreak).toBe(2)
    expect(s.bestWinStreak).toBe(2)
    expect((s.dist as number[])[0]).toBe(2)
    await page.reload()
    await expect(page.locator('.banner')).toBeVisible()
    await expect(page.getByText(/Win streak/)).toHaveCount(0)
  })

  test('a Forfeit counts as a played game and a gave-up', async ({ page }) => {
    await guessAll(page, WRONG6.slice(0, 4))
    await page.getByRole('button', { name: 'New game' }).click()
    const dialog = page.getByRole('dialog', { name: 'New game?' })
    await dialog.getByRole('button', { name: 'New game' }).click()
    await waitForReady(page)
    const s = (await saved(page)).state.stats['normal-5']
    expect(s.played).toBe(1)
    expect(s.gaveUp).toBe(1)
    expect(s.winStreak).toBe(0)
  })
})
