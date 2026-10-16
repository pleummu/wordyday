import { expect, test, type Page } from '@playwright/test'
import { fixAnswers, selectLength } from './helpers.ts'

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
