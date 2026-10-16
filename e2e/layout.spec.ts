import { expect, test, type Page } from '@playwright/test'
import {
  closeResult,
  fixAnswers,
  guessAll,
  seedSave,
  selectLength,
  turnOnWordubado,
  waitForReady,
  waitForResult,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

async function expectNoScroll(page: Page, h: number): Promise<void> {
  const m = await page.evaluate(() => ({
    sh: document.documentElement.scrollHeight,
    ih: window.innerHeight,
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
  }))
  expect(m.sh).toBeLessThanOrEqual(m.ih)
  expect(m.sw).toBeLessThanOrEqual(m.iw)
  expect(m.ih).toBe(h)
}

async function bottom(loc: ReturnType<Page['locator']>): Promise<number> {
  const box = await loc.boundingBox()
  return box!.y + box!.height
}

for (const h of [500, 540, 541, 568, 640]) {
  test(`no vertical scroll at 320x${h} with 6 letters`, async ({ page }) => {
    await fixAnswers(page)
    await page.setViewportSize({ width: 320, height: h })
    await page.goto('/')
    await selectLength(page, 6)
    await expectNoScroll(page, h)
    const lastTile = page.getByRole('gridcell', {
      name: 'Row 7, column 6, empty',
    })
    expect(await bottom(lastTile)).toBeLessThanOrEqual(h)
    expect(
      await bottom(page.getByRole('button', { name: 'Enter' })),
    ).toBeLessThanOrEqual(h)
    const box = (await lastTile.boundingBox())!
    expect(Math.abs(box.width - box.height)).toBeLessThan(0.6)
    expect(box.width).toBeGreaterThanOrEqual(h <= 540 ? 31.5 : 35.5)
  })
}

test('no vertical scroll at 320x500 after a lost 6-letter game', async ({
  page,
}) => {
  await fixAnswers(page)
  await page.setViewportSize({ width: 320, height: 500 })
  await page.goto('/')
  await selectLength(page, 6)
  const words = [
    'garden',
    'silver',
    'winter',
    'button',
    'pocket',
    'rabbit',
    'forest',
  ]
  for (const [i, w] of words.entries()) {
    await page.keyboard.type(w)
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('gridcell', {
        name: new RegExp(
          `^Row ${i + 1}, column 6, letter ${w.at(-1)!.toUpperCase()}, `,
        ),
      }),
    ).toBeVisible()
  }
  await waitForResult(page)
  await closeResult(page)
  const again = page.getByRole('button', { name: 'Play again' })
  await expect(again).toBeVisible()
  await expectNoScroll(page, 500)
  expect(await bottom(again)).toBeLessThanOrEqual(500)
})

test('no vertical scroll on desktop 1280x720 with 6 letters', async ({
  page,
}) => {
  await fixAnswers(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  await selectLength(page, 6)
  await expectNoScroll(page, 720)
})

test('header controls stay on one row at 320 px', async ({ page }) => {
  await fixAnswers(page)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  const sw = (await page
    .getByRole('switch', { name: 'Wordubado' })
    .boundingBox())!
  const group = (await page
    .getByRole('radiogroup', { name: 'Word length' })
    .boundingBox())!
  expect(
    Math.abs(sw.y + sw.height / 2 - (group.y + group.height / 2)),
  ).toBeLessThanOrEqual(2)
  const sw320 = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  )
  expect(sw320).toBe(true)
})

test('no vertical scroll at 320x500 in Wordubado with 6 letters', async ({
  page,
}) => {
  await fixAnswers(page)
  await page.setViewportSize({ width: 320, height: 500 })
  await page.goto('/')
  await page.getByRole('switch', { name: 'Wordubado' }).click()
  await page.getByRole('button', { name: 'Got it' }).click()
  await selectLength(page, 6)
  await expectNoScroll(page, 500)
})

async function expectForfeitFits(
  page: Page,
  h: number,
  lastTileName: string,
): Promise<void> {
  await expect(page.getByRole('button', { name: 'Give up' })).toBeVisible()
  await expectNoScroll(page, h)
  expect(
    await bottom(page.getByRole('button', { name: 'Give up' })),
  ).toBeLessThanOrEqual(h)
  expect(
    await bottom(page.getByRole('button', { name: 'Enter' })),
  ).toBeLessThanOrEqual(h)
  const lastTile = page.getByRole('gridcell', { name: lastTileName })
  expect(await bottom(lastTile)).toBeLessThanOrEqual(h)
  const box = (await lastTile.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(h <= 540 ? 31.5 : 35.5)
}

for (const h of [500, 568, 640]) {
  for (const mode of ['normal', 'wordubado'] as const) {
    test(`forfeit row fits at 320x${h} with 6 letters in ${mode}`, async ({
      page,
    }) => {
      await fixAnswers(page)
      await page.setViewportSize({ width: 320, height: h })
      await page.goto('/')
      await waitForReady(page)
      if (mode === 'wordubado') await turnOnWordubado(page)
      await selectLength(page, 6)
      await guessAll(page, ['garden', 'silver', 'winter', 'button', 'pocket'])
      await expectForfeitFits(page, h, 'Row 7, column 6, empty')
    })
  }
}

test('forfeit row fits at 320x500 with 5 letters in normal', async ({
  page,
}) => {
  await fixAnswers(page)
  await page.setViewportSize({ width: 320, height: 500 })
  await page.goto('/')
  await waitForReady(page)
  await guessAll(page, ['house', 'ghost', 'plant', 'mouse'])
  await expectForfeitFits(page, 500, 'Row 6, column 5, empty')
})

for (const h of [500, 568, 640]) {
  for (const mode of ['normal', 'wordubado'] as const) {
    test(`header fits title and actions at 320x${h} in ${mode}`, async ({
      page,
    }) => {
      await fixAnswers(page)
      await page.setViewportSize({ width: 320, height: h })
      await page.goto('/')
      await waitForReady(page)
      if (mode === 'wordubado') await turnOnWordubado(page)
      await expectNoScroll(page, h)
      const title = (await page.locator('h1.title').boundingBox())!
      const actions = (await page.locator('.header-actions').boundingBox())!
      const overlap =
        title.x < actions.x + actions.width &&
        actions.x < title.x + title.width &&
        title.y < actions.y + actions.height &&
        actions.y < title.y + title.height
      expect(overlap).toBe(false)
      for (const name of ['Statistics', 'Settings']) {
        const b = (await page.getByRole('button', { name }).boundingBox())!
        expect(b.width).toBeCloseTo(36, 0)
        expect(b.height).toBeCloseTo(36, 0)
      }
    })
  }
}

const LOST5 = ['house', 'ghost', 'plant', 'mouse', 'stone', 'brick']

for (const h of [500, 568, 640]) {
  for (const mode of ['normal', 'wordubado'] as const) {
    for (const outcome of ['won', 'lost', 'gave-up'] as const) {
      test(`result modal and banner fit at 320x${h} in ${mode} after ${outcome}`, async ({
        page,
      }) => {
        await fixAnswers(page)
        await page.setViewportSize({ width: 320, height: h })
        await page.goto('/')
        await waitForReady(page)
        if (mode === 'wordubado') await turnOnWordubado(page)
        if (outcome === 'won') {
          await guessAll(page, ['house', 'crane'])
        } else if (outcome === 'lost') {
          await guessAll(page, LOST5)
        } else {
          await guessAll(page, ['house', 'ghost', 'plant', 'mouse'])
          await page.getByRole('button', { name: 'Give up' }).click()
          await page
            .getByRole('dialog', { name: 'Give up?' })
            .getByRole('button', { name: 'Give up' })
            .click()
        }
        await waitForResult(page)
        const dlg = page.locator('dialog[open]:has(.result-heading)')
        const noHScroll = await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        )
        expect(noHScroll).toBe(true)
        expect(await bottom(dlg)).toBeLessThanOrEqual(h)
        expect(
          await bottom(dlg.getByRole('button', { name: 'Play again' })),
        ).toBeLessThanOrEqual(h)
        await closeResult(page)
        await expectNoScroll(page, h)
        const banner = page.locator('.banner')
        await expect(banner).toBeVisible()
        expect(await bottom(banner)).toBeLessThanOrEqual(h)
        const controlsH = await page.evaluate(
          () =>
            document.querySelector('.controls')!.getBoundingClientRect().height,
        )
        expect((await banner.boundingBox())!.height).toBeLessThanOrEqual(
          controlsH + 0.5,
        )
      })
    }
  }
}

test('header action buttons are 40 px at 1280x720', async ({ page }) => {
  await fixAnswers(page)
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  await waitForReady(page)
  for (const name of ['Statistics', 'Settings']) {
    const b = (await page.getByRole('button', { name }).boundingBox())!
    expect(b.width).toBeCloseTo(40, 0)
    expect(b.height).toBeCloseTo(40, 0)
  }
})

async function chipPage(
  page: Page,
  h: number,
  mode: 'normal' | 'wordubado',
  streak: number,
): Promise<Page> {
  const p = await page.context().newPage()
  await p.clock.install({ time: new Date('2026-06-03T09:00:00') })
  await p.addInitScript(() => localStorage.removeItem('unlimited-wordle'))
  await fixAnswers(p)
  await seedSave(p, {
    dayStreak: {
      current: streak,
      longest: streak,
      lastActiveDate: streak ? '2026-06-03' : null,
    },
    wordubadoInfoSeen: true,
  })
  await p.setViewportSize({ width: 320, height: h })
  await p.goto('/')
  await waitForReady(p)
  if (mode === 'wordubado') await turnOnWordubado(p, { firstTime: false })
  return p
}

for (const h of [500, 568, 640]) {
  for (const mode of ['normal', 'wordubado'] as const) {
    test(`header fits the Day Streak chip at 320x${h} in ${mode}`, async ({
      page,
    }) => {
      const p0 = await chipPage(page, h, mode, 0)
      const base = (await p0.locator('.header').boundingBox())!.height
      await p0.close()
      for (const streak of [12, 123]) {
        const p = await chipPage(page, h, mode, streak)
        await expectNoScroll(p, h)
        const title = (await p.locator('h1.title').boundingBox())!
        const actions = (await p.locator('.header-actions').boundingBox())!
        const overlap =
          title.x < actions.x + actions.width &&
          actions.x < title.x + title.width &&
          title.y < actions.y + actions.height &&
          actions.y < title.y + title.height
        expect(overlap).toBe(false)
        const chip = (await p
          .getByRole('button', { name: /^Day streak/ })
          .boundingBox())!
        expect(chip.x).toBeGreaterThanOrEqual(0)
        expect(chip.x + chip.width).toBeLessThanOrEqual(320)
        expect((await p.locator('.header').boundingBox())!.height).toBe(base)
        await p.close()
      }
    })
  }
}
