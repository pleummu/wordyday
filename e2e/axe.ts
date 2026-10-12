import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

export async function expectNoA11yViolations(
  page: Page,
  include?: string,
): Promise<void> {
  // A dialog mid fade-in reads as low contrast; wait for animations to settle (a cancelled animation counts as settled).
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => undefined)),
    ),
  )
  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
  ])
  if (include) builder = builder.include(include)
  const results = await builder.analyze()
  expect(
    results.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([])
}

// WCAG contrast ratio of an element's computed colour against the first
// non-transparent background up its ancestors (white when none).
export async function nonTextContrast(target: Locator): Promise<number> {
  return target.evaluate((el) => {
    const parse = (c: string): number[] | null => {
      const m = c.match(/rgba?\(([^)]+)\)/)
      if (!m) return null
      const p = m[1]
        .split(/[ ,/]+/)
        .filter(Boolean)
        .map(Number)
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]
    }
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const fg = parse(getComputedStyle(el).color) ?? [0, 0, 0, 1]
    let bg: number[] = [255, 255, 255]
    for (let n: Element | null = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor)
      if (c && c[3] > 0) {
        bg = c
        break
      }
    }
    const l1 = lum(fg)
    const l2 = lum(bg)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  })
}
