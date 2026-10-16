import { expect, test, type Locator, type Page } from '@playwright/test'
import { expectNoA11yViolations } from './axe.ts'
import {
  fixAnswers,
  guess,
  resultDialog,
  waitForReady,
  waitForResult,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

const DARK_BG = 'rgb(35, 34, 32)'

test.beforeEach(async ({ page }) => {
  await fixAnswers(page)
})

const theme = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.theme)
const bodyBg = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test('follows a dark system theme on first visit', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await waitForReady(page)
  expect(await theme(page)).toBe('dark')
  expect(await bodyBg(page)).toBe(DARK_BG)
  await expect(page.locator('meta[name=theme-color]')).toHaveAttribute(
    'content',
    '#232220',
  )
  await expectNoA11yViolations(page)
})

test('no flash: the head script sets the theme before the app runs', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.route('**/assets/*.js', (r) => r.abort())
  await page.goto('/')
  expect(await theme(page)).toBe('dark')
  expect(await bodyBg(page)).toBe(DARK_BG)
})

test('follows the OS live while on System', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await waitForReady(page)
  expect(await theme(page)).toBe('light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => theme(page)).toBe('dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect.poll(() => theme(page)).toBe('light')
})

test('corrupt or missing storage falls back safely', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded') === null) {
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem('unlimited-wordle', 'not json{')
    }
  })
  const errors: Error[] = []
  page.on('pageerror', (e) => errors.push(e))
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await waitForReady(page)
  expect(errors).toEqual([])
  expect(await theme(page)).toBe('light')
})

test.describe('Appearance settings', () => {
  const openSettings = async (page: Page) => {
    await page.getByRole('button', { name: 'Settings' }).click()
    return page.getByRole('dialog', { name: 'Settings' })
  }
  // Escape returns focus to the Settings button, where Enter would reopen it.
  const blurFocus = (page: Page) =>
    page.evaluate(() => (document.activeElement as HTMLElement).blur())
  const bg = (loc: Locator) =>
    loc.evaluate((el) => getComputedStyle(el).backgroundColor)

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await waitForReady(page)
  })

  test('pin Dark from Settings by keyboard, survives reload with no flash', async ({
    page,
  }) => {
    const dialog = await openSettings(page)
    const group = dialog.getByRole('radiogroup', { name: 'Theme' })
    const system = group.getByRole('radio', { name: 'System' })
    await expect(system).toBeChecked()
    await system.focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await expect(group.getByRole('radio', { name: 'Dark' })).toBeChecked()
    expect(await theme(page)).toBe('dark')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Settings' })).toBeFocused()
    await page.reload()
    expect(await theme(page)).toBe('dark')
    await waitForReady(page)
    const again = await openSettings(page)
    await expect(again.getByRole('radio', { name: 'Dark' })).toBeChecked()
  })

  test('Light pins light on a dark OS', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect.poll(() => theme(page)).toBe('dark')
    const dialog = await openSettings(page)
    await dialog.getByRole('radio', { name: 'Light' }).click()
    expect(await theme(page)).toBe('light')
  })

  test('colour-blind switch turns correct orange and present blue', async ({
    page,
  }) => {
    const dialog = await openSettings(page)
    const sw = dialog.getByRole('switch', {
      name: 'Colour-blind friendly colours',
    })
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await sw.focus()
    await page.keyboard.press('Space')
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('html')).toHaveAttribute(
      'data-palette',
      'colour-blind',
    )
    await page.keyboard.press('Escape')
    await blurFocus(page)
    await guess(page, 'react', 1)
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await expect.poll(() => theme(page)).toBe(scheme)
      const css = await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--tile-correct')
          .trim(),
      )
      expect(css).not.toBe('')
      const a = page.getByRole('gridcell', {
        name: 'Row 1, column 3, letter A, correct',
      })
      const probe = await page.evaluate((c) => {
        const d = document.createElement('div')
        d.style.background = c
        document.body.append(d)
        const v = getComputedStyle(d).backgroundColor
        d.remove()
        return v
      }, css)
      const correct = await bg(a)
      expect(correct).toBe(probe)
      expect(correct).not.toBe('rgb(169, 196, 176)')
      // Keys fade their colour, so wait for the transition to settle.
      await expect
        .poll(() => bg(page.getByRole('button', { name: 'A, correct' })))
        .toBe(correct)
      const present = await bg(
        page.getByRole('gridcell', { name: /^Row 1, column 1, .*present$/ }),
      )
      const absent = await bg(
        page.getByRole('gridcell', { name: /^Row 1, column 5, .*absent$/ }),
      )
      expect(present).not.toBe(correct)
      expect(present).not.toBe(absent)
    }
  })

  test('saved and reset', async ({ page }) => {
    const dialog = await openSettings(page)
    await dialog.getByRole('radio', { name: 'Dark' }).click()
    await dialog
      .getByRole('switch', { name: 'Colour-blind friendly colours' })
      .click()
    await page.keyboard.press('Escape')
    await page.reload()
    await waitForReady(page)
    expect(await theme(page)).toBe('dark')
    await expect(page.locator('html')).toHaveAttribute(
      'data-palette',
      'colour-blind',
    )
    await openSettings(page)
    await page.getByRole('button', { name: 'Reset my data' }).click()
    await page
      .getByRole('dialog', { name: 'Reset all data?' })
      .getByRole('button', { name: 'Reset', exact: true })
      .click()
    await expect.poll(() => theme(page)).toBe('light')
    await expect(page.locator('html')).not.toHaveAttribute('data-palette')
    const again = await openSettings(page)
    await expect(again.getByRole('radio', { name: 'System' })).toBeChecked()
    await expect(
      again.getByRole('switch', { name: 'Colour-blind friendly colours' }),
    ).toHaveAttribute('aria-checked', 'false')
  })

  test('share uses orange and blue squares when colour-blind is on', async ({
    context,
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const dialog = await openSettings(page)
    await dialog
      .getByRole('switch', { name: 'Colour-blind friendly colours' })
      .click()
    await page.keyboard.press('Escape')
    await blurFocus(page)
    await guess(page, 'crane', 1)
    await waitForResult(page)
    await resultDialog(page).getByRole('button', { name: 'Share' }).click()
    const text = await page.evaluate(() => navigator.clipboard.readText())
    expect(text).toContain('🟧')
    expect(text).not.toContain('🟩')
  })
})
