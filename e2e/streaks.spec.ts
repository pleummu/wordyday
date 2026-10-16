import { expect, test, type Page } from '@playwright/test'
import {
  fixAnswers,
  guess,
  guessAll,
  seedSave,
  selectLength,
  waitForReady,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

const WRONG6 = ['house', 'ghost', 'plant', 'mouse', 'trick', 'brown']

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
  test.beforeEach(async ({ page }) => {
    await fixAnswers(page)
    await page.goto('/')
    await waitForReady(page)
  })

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

const DAY1 = new Date('2026-06-03T09:00:00')

async function openStats(page: Page) {
  await page.getByRole('button', { name: 'Statistics', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Statistics' })
  await expect(dialog).toBeVisible()
  return dialog
}

async function startDay(page: Page, save?: Record<string, unknown>) {
  await page.clock.install({ time: DAY1 })
  await fixAnswers(page)
  if (save) await seedSave(page, save)
  await page.goto('/')
  await waitForReady(page)
}

test.describe('Day Streak (STRK-02, D-11)', () => {
  test('first win of the day: praise then Day streak: 1', async ({ page }) => {
    await startDay(page)
    await guess(page, 'crane', 1)
    await expect(page.getByRole('status')).toHaveText('Unbelievable!')
    await expect(page.getByRole('status')).toHaveText('Day streak: 1')
    const dialog = await openStats(page)
    await expect(dialog).toContainText('Day streak 1 · Best 1')
    await expect(dialog).toContainText('Restores left: 3/3')
  })

  test('a second game the same day adds nothing', async ({ page }) => {
    await startDay(page)
    await winOnce(page)
    await expect(page.getByRole('status')).toHaveText('Day streak: 1')
    await playAgain(page)
    await winOnce(page)
    await expect(page.getByText('Day streak: 2')).toHaveCount(0)
    await page.waitForTimeout(3000)
    await expect(page.getByText('Day streak: 2')).toHaveCount(0)
    const dialog = await openStats(page)
    await expect(dialog).toContainText('Day streak 1 · Best 1')
  })

  test('a loss counts (EC-33)', async ({ page }) => {
    await startDay(page)
    await guessAll(page, WRONG6)
    await expect(page.getByRole('status')).toHaveText('Day streak: 1')
  })

  test("yesterday's streak continues", async ({ page }) => {
    await startDay(page, {
      dayStreak: { current: 4, longest: 4, lastActiveDate: '2026-06-02' },
    })
    await winOnce(page)
    await expect(page.getByText('Day streak: 5')).toBeVisible()
    const dialog = await openStats(page)
    await expect(dialog).toContainText('Day streak 5 · Best 5')
  })

  test('the next day credits again', async ({ page }) => {
    await startDay(page)
    await winOnce(page)
    await expect(page.getByText('Day streak: 1')).toBeVisible()
    await page.clock.setFixedTime(new Date('2026-06-04T09:00:00'))
    await page.reload()
    await playAgain(page)
    await winOnce(page)
    await expect(page.getByText('Day streak: 2')).toBeVisible()
  })

  test.describe('without reduced motion', () => {
    test.use({ reducedMotion: 'no-preference' })
    test('A2: reveal completes under an installed clock', async ({ page }) => {
      await startDay(page)
      await guess(page, 'crane', 1)
      await expect(
        page.getByRole('button', { name: 'Play again' }),
      ).toBeVisible()
    })
  })

  test('Reset all data clears the Day Streak (R-RESTORE-11)', async ({
    page,
  }) => {
    await startDay(page, {
      dayStreak: { current: 4, longest: 4, lastActiveDate: '2026-06-03' },
    })
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('button', { name: 'Reset my data' }).click()
    await page
      .getByRole('dialog', { name: 'Reset all data?' })
      .getByRole('button', { name: 'Reset', exact: true })
      .click()
    await waitForReady(page)
    const dialog = await openStats(page)
    await expect(dialog).toContainText('Day streak 0 · Best 0')
    await expect(dialog).toContainText('Restores left: 3/3')
  })
})

test.describe('Day Streak chip (D-08..D-10)', () => {
  const chip = (page: Page, name: string | RegExp) =>
    page.getByRole('button', { name })

  test('hidden at 0', async ({ page }) => {
    await startDay(page)
    await expect(chip(page, /^Day streak/)).toHaveCount(0)
  })

  test("after today's first finish", async ({ page }) => {
    await startDay(page)
    await winOnce(page)
    await expect(chip(page, 'Day streak 1, open statistics')).toBeVisible()
  })

  test('muted until played today', async ({ page }) => {
    await startDay(page, {
      dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-02' },
    })
    const dim = chip(
      page,
      'Day streak 5, play today to keep it, open statistics',
    )
    await expect(dim).toHaveAttribute('data-dimmed', '')
    await winOnce(page)
    const full = chip(page, 'Day streak 6, open statistics')
    await expect(full).toBeVisible()
    await expect(full).not.toHaveAttribute('data-dimmed', '')
  })

  test('opens Statistics on the current Board', async ({ page }) => {
    await startDay(page, {
      dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-03' },
    })
    await selectLength(page, 4)
    const c = chip(page, 'Day streak 5, open statistics')
    await c.click()
    const dialog = page.getByRole('dialog', { name: 'Statistics' })
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('tab', { name: '4 letters' }),
    ).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(c).toBeFocused()
  })

  test.describe('while revealing (D-21)', () => {
    test.use({ reducedMotion: 'no-preference' })
    test('chip is disabled during the reveal', async ({ page }) => {
      await startDay(page, {
        dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-03' },
      })
      await page.keyboard.type('house')
      await page.keyboard.press('Enter')
      const c = chip(page, 'Day streak 5, open statistics')
      await expect(c).toBeDisabled()
      await expect(c).toBeEnabled()
    })
  })
})
