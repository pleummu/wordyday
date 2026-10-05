import { expect, test, type Page } from '@playwright/test'
import { cell, fixAnswers, seedSave, waitForReady } from './helpers.ts'
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
  const dialog = await openStats(page)
  await expect(dialog).toContainText('Day streak 0 · Best 5')
})

test('EC-07 no Restores left: no prompt', async ({ page }) => {
  await start(page, { save: { restores: { month: '2026-06', used: 3 } } })
  await waitForReady(page)
  await expect(prompt(page)).toHaveCount(0)
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
