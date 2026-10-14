import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  cell,
  fixAnswers,
  resultDialog,
  waitForReady,
  waitForResult,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

// Tab (or Shift+Tab) until the target has focus; keyboard only.
async function tabTo(page: Page, target: Locator, back = false) {
  for (let i = 0; i < 40; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab')
  }
  await expect(target).toBeFocused()
}

// Press Tab / Shift+Tab many times and assert focus never leaves the dialog.
async function expectTrapped(page: Page, dialog: Locator) {
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press(key)
      const inside = await dialog.evaluate((d) =>
        d.contains(document.activeElement),
      )
      expect(inside, `${key} #${i} left the dialog`).toBe(true)
    }
  }
}

test('whole game and every dialog by keyboard only', async ({ page }) => {
  await fixAnswers(page, { help: true })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')

  // 1. How to play
  const help = page.getByRole('dialog', { name: 'How to play' })
  await expect(help).toBeVisible()
  await expect(help.getByRole('button', { name: 'Got it' })).toBeFocused()
  await expectTrapped(page, help)
  await page.keyboard.press('Escape')
  await expect(help).toBeHidden()
  await expect(page.getByRole('button', { name: 'How to play' })).toBeFocused()
  await waitForReady(page)

  // 2. Typing after focus returns to a header button plays, not re-opens
  await page.keyboard.type('house')
  await page.keyboard.press('Enter')
  await expect(cell(page, 1, 5)).toHaveAccessibleName(
    /letter E, (correct|present|absent)$/,
  )
  await expect(help).toBeHidden()

  // 3. Settings
  const settingsBtn = page.getByRole('button', { name: 'Settings' })
  await tabTo(page, settingsBtn)
  await page.keyboard.press('Enter')
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await expect(settings).toBeVisible()
  await expect(settings.getByRole('button', { name: 'Close' })).toBeFocused()
  const system = settings.getByRole('radio', { name: 'System' })
  await tabTo(page, system)
  await page.keyboard.press('ArrowRight')
  await expect(settings.getByRole('radio', { name: 'Light' })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(settings.getByRole('radio', { name: 'Dark' })).toBeFocused()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.keyboard.press('Home')
  await expect(system).toBeFocused()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark')
  const cb = settings.getByRole('switch', {
    name: 'Colour-blind friendly colours',
  })
  await tabTo(page, cb)
  await page.keyboard.press('Space')
  await expect(page.locator('html')).toHaveAttribute(
    'data-palette',
    'colour-blind',
  )
  await page.keyboard.press('Space')
  await expect(cb).toHaveAttribute('aria-checked', 'false')
  await expectTrapped(page, settings)
  await page.keyboard.press('Escape')
  await expect(settings).toBeHidden()
  await expect(settingsBtn).toBeFocused()

  // 4. Statistics
  const statsBtn = page.getByRole('button', { name: 'Statistics', exact: true })
  await tabTo(page, statsBtn, true)
  await page.keyboard.press('Enter')
  const stats = page.getByRole('dialog', { name: 'Statistics' })
  await expect(stats).toBeVisible()
  await expectTrapped(page, stats)
  await page.keyboard.press('Escape')
  await expect(stats).toBeHidden()
  await expect(statsBtn).toBeFocused()

  // 5. Win, Result modal, Play again
  await page.keyboard.type('crane')
  await page.keyboard.press('Enter')
  await waitForResult(page)
  const result = resultDialog(page)
  await expect(result.getByRole('button', { name: 'Play again' })).toBeFocused()
  await expectTrapped(page, result)
  await page.keyboard.press('Escape')
  await expect(result).toBeHidden()
  const again = page.getByRole('button', { name: 'Play again' })
  await tabTo(page, again)
  await page.keyboard.press('Enter')
  await waitForReady(page)
  await expect(cell(page, 1, 1)).toHaveAccessibleName(/empty|^Row 1, column 1/)
  await expect(cell(page, 1, 1)).not.toContainText(/\S/)
})

test('first-visit How to play traps Tab', async ({ page }) => {
  await fixAnswers(page, { help: true })
  await page.goto('/')
  const help = page.getByRole('dialog', { name: 'How to play' })
  await expect(help).toBeVisible()
  await expectTrapped(page, help)
})

test('there is no skip link', async ({ page }) => {
  await fixAnswers(page)
  await page.goto('/')
  await waitForReady(page)
  await expect(page.getByRole('link', { name: /skip/i })).toHaveCount(0)
})

test('this spec never uses the mouse', () => {
  const src = readFileSync(new URL(import.meta.url), 'utf8')
  const code = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n')
  expect(code.split('.cl' + 'ick(').length - 1).toBe(0)
})
