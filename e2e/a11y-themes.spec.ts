import { expect, test, type Page } from '@playwright/test'
import { expectNoA11yViolations } from './axe.ts'
import {
  closeResult,
  fixAnswers,
  guess,
  seedSave,
  turnOnWordubado,
  waitForReady,
  waitForResult,
} from './helpers.ts'

test.use({ reducedMotion: 'reduce' })

const combos = [
  { name: 'light', scheme: 'light', colourBlind: false },
  { name: 'dark', scheme: 'dark', colourBlind: false },
  { name: 'colour-blind light', scheme: 'light', colourBlind: true },
  { name: 'colour-blind dark', scheme: 'dark', colourBlind: true },
] as const

// WCAG contrast of the focused element's outline against the first opaque background up its ancestors.
async function focusRingContrast(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement
    const rgb = (c: string) =>
      (c.match(/[\d.]+/g) ?? []).map(Number) as number[]
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const ring = rgb(getComputedStyle(el).outlineColor)
    let bg = [255, 255, 255]
    for (let n: Element | null = el.parentElement; n; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor)
      if (c.length >= 3 && (c[3] ?? 1) > 0) {
        bg = c
        break
      }
    }
    const a = lum(ring)
    const b = lum(bg)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  })
}

for (const c of combos) {
  test(`axe and focus ring: ${c.name}`, async ({ page }, info) => {
    await fixAnswers(page, { help: true })
    if (c.colourBlind)
      await seedSave(page, { colourBlind: true }, { version: 3 })
    await page.emulateMedia({ colorScheme: c.scheme })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', c.scheme)
    if (c.colourBlind) {
      await expect(page.locator('html')).toHaveAttribute(
        'data-palette',
        'colour-blind',
      )
    }

    const help = page.getByRole('dialog', { name: 'How to play' })
    await expect(help).toBeVisible()
    await expectNoA11yViolations(page)
    await page.keyboard.press('Escape')
    await expect(help).toBeHidden()
    await waitForReady(page)

    await guess(page, 'react', 1)
    await expectNoA11yViolations(page)
    await page
      .locator('.grid, [role=grid]')
      .first()
      .screenshot({
        path: info.outputPath(`mixed-${c.name.replace(/ /g, '-')}.png`),
      })

    await page.getByRole('button', { name: 'Settings' }).press('Enter')
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await expect(settings).toBeVisible()
    await settings.getByRole('radio', { checked: true }).first().focus()
    expect(await focusRingContrast(page)).toBeGreaterThanOrEqual(3)
    await expectNoA11yViolations(page)
    await page.keyboard.press('Escape')
    await expect(settings).toBeHidden()

    await guess(page, 'crane', 2)
    await waitForResult(page)
    await expect(page.locator('.toast-layer .toast').first()).toBeVisible()
    await expectNoA11yViolations(page)
    await closeResult(page)

    await turnOnWordubado(page)
    await expectNoA11yViolations(page)
  })
}
