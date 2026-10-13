import { expect, test, type Page } from '@playwright/test'
import {
  REVEAL_BUFFER_MS,
  resultDelayMs,
  revealDurationMs,
} from '../src/logic/timing.ts'
import { TOAST_LIFE_MS } from '../src/state/copy.ts'
import {
  fixAnswers,
  guessAll,
  resultDialog,
  waitForReady,
  waitForResult,
} from './helpers.ts'

// True when the toast text is the topmost thing at its own centre point.
async function topmostIsToast(page: Page, text: string): Promise<boolean> {
  return page.evaluate((t) => {
    const layer = document.querySelector('.toast-layer')
    if (!layer) return false
    const el = Array.from(layer.querySelectorAll('*')).find(
      (n) => n.textContent === t,
    )
    if (!el) return false
    const r = el.getBoundingClientRect()
    const hit = document.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2,
    )
    return hit !== null && (hit === el || layer.contains(hit))
  }, text)
}

test.describe('Copied toast over the modal (D-28)', () => {
  test.use({ reducedMotion: 'reduce' })

  test.beforeEach(async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await fixAnswers(page)
  })

  test('Copied shows above the modal and is announced once (D-28)', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForReady(page)
    await guessAll(page, ['house', 'crane'])
    await waitForResult(page)
    await resultDialog(page).getByRole('button', { name: 'Share' }).click()
    await expect(
      page.locator('.toast-layer').getByText('Copied', { exact: true }),
    ).toBeVisible()
    expect(await topmostIsToast(page, 'Copied')).toBe(true)
    const live = page.locator('[role="status"]').filter({ hasText: /^Copied$/ })
    await expect(live).toHaveCount(1)
    await expect(page.locator('dialog[open] [role="status"]')).toHaveText(
      'Copied',
    )
  })
})

test.describe('Praise toast over the modal, reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test.beforeEach(async ({ page }) => {
    await fixAnswers(page)
    await page.clock.install()
    await page.goto('/')
    await waitForReady(page)
    await page.clock.pauseAt(new Date(Date.now() + 60_000))
  })

  test('praise toast is above the modal under reduced motion', async ({
    page,
  }) => {
    await page.keyboard.type('crane')
    await page.keyboard.press('Enter')
    await page.clock.runFor(revealDurationMs(5, true) + REVEAL_BUFFER_MS)
    await page.clock.runFor(resultDelayMs('won', 5, true))
    await waitForResult(page)
    await expect(page.getByText('Unbelievable!')).toBeVisible()
    expect(await topmostIsToast(page, 'Unbelievable!')).toBe(true)
  })
})

test.describe('Day Streak toast over the modal (D-05)', () => {
  test.use({ reducedMotion: 'no-preference' })

  test.beforeEach(async ({ page }) => {
    await fixAnswers(page)
    await page.clock.install()
    await page.goto('/')
    await waitForReady(page)
    await page.clock.pauseAt(new Date(Date.now() + 60_000))
  })

  test('Day Streak toast is above the modal (D-05)', async ({ page }) => {
    await page.keyboard.type('crane')
    await page.keyboard.press('Enter')
    await page.clock.runFor(revealDurationMs(5, false) + REVEAL_BUFFER_MS)
    await page.clock.runFor(resultDelayMs('won', 5, false))
    await waitForResult(page)
    await expect(page.getByText('Day streak: 1')).toBeVisible()
    expect(await topmostIsToast(page, 'Day streak: 1')).toBe(true)
    await page.clock.runFor(TOAST_LIFE_MS)
    await expect(page.getByText('Day streak: 1')).toBeHidden()
    await expect(resultDialog(page)).toBeVisible()
  })
})

test.describe('No modal', () => {
  test.beforeEach(async ({ page }) => {
    await fixAnswers(page)
  })

  test('no modal: toasts keep their page-level role', async ({ page }) => {
    await page.goto('/')
    await waitForReady(page)
    await page.keyboard.type('abcde')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('alert')).toHaveText('Not in word list')
  })
})
