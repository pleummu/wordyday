import { expect, test, type Page } from '@playwright/test'
import { cell, fixAnswers, guess, seedSave, waitForReady } from './helpers.ts'
import { expectNoA11yViolations, nonTextContrast } from './axe.ts'

test.use({ reducedMotion: 'reduce' })

const BASE_SAVE = {
  dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-01' },
  restores: { month: '2026-06', used: 0 },
  stats: {
    'normal-5': {
      played: 3,
      wins: 3,
      dist: [0, 3, 0, 0, 0, 0],
      winStreak: 3,
      bestWinStreak: 3,
    },
  },
}

async function start(
  page: Page,
  {
    time = '2026-06-03T09:00:00',
    save = {},
  }: { time?: string; save?: Record<string, unknown> } = {},
) {
  await page.clock.install({ time: new Date(time) })
  await fixAnswers(page)
  await seedSave(page, { ...BASE_SAVE, ...save })
  await page.goto('/')
}

const prompt = (page: Page) =>
  page.getByRole('dialog', { name: 'Streak broke' })

async function openStats(page: Page) {
  await page.getByRole('button', { name: 'Statistics', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Statistics' })
  await expect(dialog).toBeVisible()
  return dialog
}

test('STRK-06 prompt after one missed day', async ({ page }) => {
  await start(page)
  const d = prompt(page)
  await expect(d).toBeVisible()
  await expect(d).toContainText(
    'Your 5-day streak broke. Restore it? (3 left this month)',
  )
  await expect(d.getByRole('button', { name: 'No' })).toBeVisible()
  await expect(d.getByRole('button', { name: 'Restore' })).toBeFocused()
  await page.keyboard.type('abc')
  await expect(cell(page, 1, 1)).toHaveAccessibleName(/empty/i)
})

test('D-14 A1 Esc twice and a backdrop click keep it open', async ({
  page,
}) => {
  await start(page)
  await expect(prompt(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.mouse.click(5, 5)
  await expect(prompt(page)).toBeVisible()
})

test('EC-11 a reload shows it again', async ({ page }) => {
  await start(page)
  await expect(prompt(page)).toBeVisible()
  await page.reload()
  await expect(prompt(page)).toContainText('(3 left this month)')
})

test('STRK-07 Restore keeps the streak', async ({ page }) => {
  await start(page)
  await prompt(page).getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByRole('status')).toHaveText(
    'Streak restored. 2 left this month.',
  )
  await expect(prompt(page)).toBeHidden()
  await expect(
    page.getByRole('button', {
      name: 'Day streak 5, play today to keep it, open statistics',
    }),
  ).toBeVisible()
  const dialog = await openStats(page)
  await expect(dialog).toContainText('Day streak 5 · Best 5')
  await expect(dialog).toContainText('Restores left: 2/3')
  await dialog.getByRole('tab', { name: '5 letters' }).click()
  const streak = dialog.locator('.stat', { hasText: 'Current win streak' })
  await expect(streak.locator('.stat-value')).toHaveText('0')
  const best = dialog.locator('.stat', { hasText: 'Best' })
  await expect(best.locator('.stat-value')).toHaveText('3')
})

test('STRK-07 No resets silently', async ({ page }) => {
  await start(page)
  await prompt(page).getByRole('button', { name: 'No' }).click()
  await expect(prompt(page)).toBeHidden()
  await expect(page.getByText(/restored/i)).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Fresh start' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Day streak/ })).toHaveCount(0)
  const dialog = await openStats(page)
  await expect(dialog).toContainText('Day streak 0 · Best 5')
})

test('EC-05 five missed days: no prompt', async ({ page }) => {
  await start(page, { time: '2026-06-07T09:00:00' })
  await waitForReady(page)
  await expect(prompt(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'OK', exact: true }).click()
  const dialog = await openStats(page)
  await expect(dialog).toContainText('Day streak 0 · Best 5')
})

test('EC-07 no Restores left: no prompt', async ({ page }) => {
  await start(page, { save: { restores: { month: '2026-06', used: 3 } } })
  await waitForReady(page)
  await expect(prompt(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'OK', exact: true }).click()
  const dialog = await openStats(page)
  await expect(dialog).toContainText('Day streak 0 · Best 5')
})

test('EC-21 refill on the 1st', async ({ page }) => {
  await start(page, {
    time: '2026-07-01T09:00:00',
    save: {
      dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-28' },
      restores: { month: '2026-06', used: 3 },
    },
  })
  await expect(prompt(page)).toContainText('(3 left this month)')
})

test('settings cannot open while pending', async ({ page }) => {
  await start(page)
  await expect(prompt(page)).toBeVisible()
  try {
    await page.locator('.settings-button').click({ force: true, timeout: 1000 })
  } catch {
    // The page behind a modal dialog is inert, so the click may be refused.
  }
  await expect(page.getByRole('dialog', { name: 'Settings' })).toHaveCount(0)
  await expect(prompt(page)).toBeVisible()
})

test('axe: Restore prompt in both modes', async ({ page }) => {
  await start(page)
  await expect(prompt(page)).toBeVisible()
  await expectNoA11yViolations(page, 'dialog[open]')
})

test('axe: Restore prompt in Wordubado', async ({ page }) => {
  await start(page, {
    save: { last: { mode: 'wordubado', length: 5 }, wordubadoInfoSeen: true },
  })
  await expect(prompt(page)).toBeVisible()
  await expectNoA11yViolations(page, 'dialog[open]')
})

test('UI-SPEC contrast: the dimmed chip icon is at least 3:1', async ({
  page,
}) => {
  await start(page)
  await prompt(page).getByRole('button', { name: 'Restore' }).click()
  const chip = page.locator('.streak-chip[data-dimmed]')
  await expect(chip).toBeVisible()
  // Let the toast and its animation finish so axe sees a settled page.
  await expect(page.getByRole('status')).toBeHidden()
  expect(
    await nonTextContrast(page.locator('.streak-chip[data-dimmed] svg')),
  ).toBeGreaterThanOrEqual(3)
  await expectNoA11yViolations(page, '.header-actions')
})

const fresh = (page: Page) => page.getByRole('dialog', { name: 'Fresh start' })
const FRESH_BODY = 'Your streak ended. Start a new one today!'

test.describe('Breaks and triggers (D-16, STRK-04)', () => {
  test('D-16 more than 4 missed days shows Fresh start once', async ({
    page,
  }) => {
    await start(page, { time: '2026-06-07T09:00:00' })
    await expect(fresh(page)).toBeVisible()
    await expect(fresh(page)).toContainText(FRESH_BODY)
    await fresh(page).getByRole('button', { name: 'OK' }).click()
    await expect(fresh(page)).toBeHidden()
    await page.reload()
    await waitForReady(page)
    await expect(fresh(page)).toHaveCount(0)
  })

  test('D-16 no Restores left shows Fresh start', async ({ page }) => {
    await start(page, {
      save: { restores: { month: '2026-06', used: 3 } },
    })
    await expect(fresh(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(fresh(page)).toBeHidden()
  })

  test('D-16 EC-12 the gap grew while pending', async ({ page }) => {
    await start(page, {
      time: '2026-06-08T09:00:00',
      save: {
        pendingRestore: { streak: 5, missed: 1, creditDeferred: false },
      },
    })
    await waitForReady(page)
    await expect(prompt(page)).toHaveCount(0)
    await expect(fresh(page)).toBeVisible()
  })

  test('D-16 choosing No shows no Fresh start', async ({ page }) => {
    await start(page)
    await prompt(page).getByRole('button', { name: 'No' }).click()
    await expect(prompt(page)).toBeHidden()
    await expect(fresh(page)).toHaveCount(0)
  })

  test('D-17 a Win-Streak-only loss is silent', async ({ page }) => {
    await start(page, {
      time: '2026-06-04T09:00:00',
      save: {
        dayStreak: { current: 0, longest: 0, lastActiveDate: '2026-06-01' },
        stats: { 'normal-5': { winStreak: 2 } },
      },
    })
    await waitForReady(page)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const dialog = await openStats(page)
    await dialog.getByRole('tab', { name: '5 letters' }).click()
    const streak = dialog.locator('.stat', { hasText: 'Current win streak' })
    await expect(streak.locator('.stat-value')).toHaveText('0')
  })

  test('STRK-04 visibilitychange runs the check', async ({ page }) => {
    await start(page, {
      time: '2026-06-03T09:00:00',
      save: {
        dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-03' },
      },
    })
    await waitForReady(page)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.clock.setSystemTime(new Date('2026-06-05T09:00:00'))
    await page.evaluate(() =>
      document.dispatchEvent(new Event('visibilitychange')),
    )
    await expect(prompt(page)).toBeVisible()
    await expect(prompt(page)).toContainText('(3 left this month)')
  })

  test('STRK-04 window focus runs the check', async ({ page }) => {
    await start(page, {
      time: '2026-06-03T09:00:00',
      save: {
        dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-03' },
      },
    })
    await waitForReady(page)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.clock.setSystemTime(new Date('2026-06-05T09:00:00'))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(prompt(page)).toBeVisible()
    await expect(prompt(page)).toContainText('(3 left this month)')
  })

  test('D-10 A2 midnight dims the chip without a reload', async ({ page }) => {
    await start(page, {
      time: '2026-06-03T23:58:00',
      save: {
        dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-03' },
      },
    })
    await waitForReady(page)
    await expect(
      page.getByRole('button', {
        name: 'Day streak 5, open statistics',
        exact: true,
      }),
    ).toBeVisible()
    await page.clock.fastForward('00:03:00')
    await expect(
      page.getByRole('button', {
        name: 'Day streak 5, play today to keep it, open statistics',
        exact: true,
      }),
    ).toBeVisible()
  })

  test('EC-39 a game finished after midnight credits the new day', async ({
    page,
  }) => {
    await start(page, {
      time: '2026-06-03T23:58:00',
      save: {
        dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-03' },
      },
    })
    await waitForReady(page)
    await guess(page, 'house', 1)
    await page.clock.fastForward('00:03:00')
    await guess(page, 'crane', 2)
    await expect(
      page.locator('.toast-layer').getByText('Day streak: 6'),
    ).toBeVisible()
  })

  for (const wordubado of [false, true]) {
    test(`axe: Fresh start dialog in ${wordubado ? 'Wordubado' : 'Normal'}`, async ({
      page,
    }) => {
      await start(page, {
        time: '2026-06-07T09:00:00',
        save: wordubado
          ? { last: { mode: 'wordubado', length: 5 }, wordubadoInfoSeen: true }
          : {},
      })
      await expect(fresh(page)).toBeVisible()
      await expectNoA11yViolations(page, 'dialog[open]')
    })
  }
})
