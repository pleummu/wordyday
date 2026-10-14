import { expect, test } from '@playwright/test'
import { expectNoA11yViolations } from './axe.ts'
import { fixAnswers, waitForReady } from './helpers.ts'

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
