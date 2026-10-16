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

// Chromium treats everything outside a modal dialog as inert, so elementFromPoint
// cannot see a toast that is correctly painted above the dialog. Check the paint
// instead: sample one pixel inside the toast's padding and compare it with the
// toast's own opaque surface colour. Under the 32% dark backdrop it would differ.
async function topmostIsToast(page: Page, text: string): Promise<boolean> {
  const probe = await page.evaluate((t) => {
    const layer = document.querySelector('.toast-layer')
    const el = layer
      ? Array.from(layer.querySelectorAll<HTMLElement>('.toast')).find(
          (n) => n.textContent === t,
        )
      : undefined
    if (!el) return null
    for (const a of el.getAnimations()) {
      a.pause()
      a.currentTime = 0.5 * Number(a.effect?.getComputedTiming().duration ?? 0)
    }
    const r = el.getBoundingClientRect()
    const m = getComputedStyle(el).backgroundColor.match(/\d+/g) ?? []
    return {
      x: r.left + r.width / 2,
      y: r.top + 2,
      rgb: m.slice(0, 3).map(Number),
    }
  }, text)
  if (!probe) return false
  const png = await page.screenshot({
    clip: {
      x: Math.floor(probe.x),
      y: Math.floor(probe.y),
      width: 1,
      height: 1,
    },
  })
  const px = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const bmp = await createImageBitmap(
      new Blob([bytes], { type: 'image/png' }),
    )
    const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d')!
    ctx.drawImage(bmp, 0, 0)
    return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3))
  }, png.toString('base64'))
  return px.every((v, i) => Math.abs(v - probe.rgb[i]) <= 2)
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
    await expect(
      page.locator('.toast-layer').getByText('Unbelievable!'),
    ).toBeVisible()
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
    // On a win the Day Streak toast is queued one toast life after the praise
    // toast, so it lands while the modal is already open.
    await page.clock.runFor(TOAST_LIFE_MS - resultDelayMs('won', 5, false) + 10)
    await expect(
      page.locator('.toast-layer').getByText('Day streak: 1'),
    ).toBeVisible()
    expect(await topmostIsToast(page, 'Day streak: 1')).toBe(true)
    await page.clock.runFor(TOAST_LIFE_MS)
    await expect(
      page.locator('.toast-layer').getByText('Day streak: 1'),
    ).toBeHidden()
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
