import { expect, test, type Page } from '@playwright/test'
import { cell, fixAnswers, seedSave, waitForReady } from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

const help = (page: Page) => page.getByRole('dialog', { name: 'How to play' })
const helpButton = (page: Page) =>
  page.getByRole('button', { name: 'How to play' })

test('first visit opens How to play, Escape returns focus to the header', async ({
  page,
}) => {
  await fixAnswers(page, { help: true })
  await page.goto('/')
  await expect(help(page)).toBeVisible()
  await expect(help(page).getByRole('button', { name: 'Got it' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(help(page)).toHaveCount(0)
  await expect(helpButton(page)).toBeFocused()
  await waitForReady(page)
  await page.keyboard.type('crane')
  await expect(cell(page, 1, 5)).toHaveAccessibleName(/letter E/i)
})

test('shows only once', async ({ page }) => {
  await fixAnswers(page, { help: true })
  await page.goto('/')
  await expect(help(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await page.reload()
  await waitForReady(page)
  await expect(help(page)).toHaveCount(0)
})

test('reopens from the header and returns focus', async ({ page }) => {
  await fixAnswers(page, { help: true })
  await page.goto('/')
  await expect(help(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await helpButton(page).click()
  await expect(help(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(helpButton(page)).toBeFocused()
})

test('an existing v2 player sees it once and the save becomes v3', async ({
  page,
}) => {
  await fixAnswers(page, { help: true })
  await seedSave(page, {})
  await page.goto('/')
  await expect(help(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await page.reload()
  await waitForReady(page)
  await expect(help(page)).toHaveCount(0)
  const doc = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('unlimited-wordle')!),
  )
  expect(doc.version).toBe(3)
  expect(doc.state.howToPlaySeen).toBe(true)
})

test('the Restore prompt wins, then How to play follows', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-03T09:00:00') })
  await fixAnswers(page, { help: true })
  await seedSave(page, {
    dayStreak: { current: 5, longest: 5, lastActiveDate: '2026-06-01' },
    restores: { month: '2026-06', used: 0 },
  })
  await page.goto('/')
  const prompt = page.getByRole('dialog', { name: 'Streak broke' })
  await expect(prompt).toBeVisible()
  await expect(help(page)).toHaveCount(0)
  await prompt.getByRole('button', { name: 'No' }).press('Enter')
  await expect(help(page)).toBeVisible()
})

test('Reset is a first visit again', async ({ page }) => {
  await fixAnswers(page, { help: true })
  await page.goto('/')
  await expect(help(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Reset my data' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /reset/i })
    .last()
    .click()
  await expect(help(page)).toBeVisible()
})
